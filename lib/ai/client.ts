import OpenAI from "openai";

export function getAIClient(customClient?: OpenAI): OpenAI {
  if (customClient) return customClient;

  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "dummy-key-for-test";
  const baseURL =
    process.env.OPENAI_BASE_URL ||
    (process.env.GROQ_API_KEY ? "https://api.groq.com/openai/v1" : undefined);

  return new OpenAI({
    apiKey,
    ...(baseURL && { baseURL }),
  });
}

export function getAIModel(): string {
  return (
    process.env.OPENAI_MODEL ||
    (process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : "gpt-4o-mini")
  );
}
