import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  InterpretationResultSchema,
  type InterpretationResult,
} from "./schemas";
import { INTERPRETER_SYSTEM_PROMPT, buildInterpreterUserPrompt } from "./prompts";

export interface InterpretOptions {
  openaiClient?: OpenAI;
  currentTimestamp?: Date;
}

/**
 * Low-level AI Interpreter function.
 * Converts unstructured work text into a validated InterpretationResult using OpenAI and Zod.
 * Does NOT perform database operations.
 */
export async function interpretWorkRequest(
  rawInput: string,
  options: InterpretOptions = {}
): Promise<InterpretationResult> {
  const trimmed = rawInput?.trim();
  if (!trimmed) {
    throw new Error("Input request text cannot be empty.");
  }

  const currentTimestamp = options.currentTimestamp ?? new Date();

  // Instantiate client if not provided
  const openai =
    options.openaiClient ??
    new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-test",
    });

  const userPrompt = buildInterpreterUserPrompt(trimmed, currentTimestamp);

  let attempts = 0;
  const maxAttempts = 2; // Initial attempt + max 1 retry for transient API errors
  let lastError: Error | null = null;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      // Use OpenAI structured outputs with Zod response format
      const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: INTERPRETER_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: zodResponseFormat(
          InterpretationResultSchema,
          "interpretation_result"
        ),
        temperature: 0.1, // Low temperature for high consistency
      });

      const parsedResult = completion.choices[0]?.message?.parsed;

      let validatedData: InterpretationResult;
      if (parsedResult) {
        validatedData = InterpretationResultSchema.parse(parsedResult);
      } else {
        const rawContent = completion.choices[0]?.message?.content;
        if (!rawContent) {
          throw new Error("OpenAI returned an empty response.");
        }
        const json = JSON.parse(rawContent);
        validatedData = InterpretationResultSchema.parse(json);
      }

      // Normalize detectedDeadline format if present
      const normalizedDeadline = validatedData.detectedDeadline
        ? new Date(validatedData.detectedDeadline).toISOString()
        : null;

      return {
        ...validatedData,
        detectedDeadline: normalizedDeadline,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      // Do NOT retry Zod validation errors or client-side bad requests
      if (
        error.name === "ZodError" ||
        error.message.includes("cannot be empty") ||
        error.message.includes("validation")
      ) {
        throw error;
      }

      // Retry only transient API errors (5xx, rate limits, timeouts)
      if (attempts < maxAttempts) {
        console.warn(`[Interpreter] Retrying transient OpenAI error (attempt ${attempts}): ${error.message}`);
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
    }
  }

  throw lastError ?? new Error("OpenAI interpretation failed after retries.");
}
