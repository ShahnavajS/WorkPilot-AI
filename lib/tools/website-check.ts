import { z } from "zod";
import { createArtifact } from "@/lib/db/service";
import type { ToolDefinition, ToolContext } from "./types";

export const WebsiteCheckInputSchema = z.object({
  url: z.string().min(1, "URL is required."),
});

export type WebsiteCheckInput = z.infer<typeof WebsiteCheckInputSchema>;

export const WebsiteCheckOutputSchema = z.object({
  url: z.string(),
  success: z.boolean(),
  statusCode: z.number().nullable(),
  responseTimeMs: z.number().nullable(),
  finalUrl: z.string().nullable(),
  title: z.string().nullable(),
  metaDescription: z.string().nullable(),
  htmlSizeContentBytes: z.number().nullable(),
  checksPerformed: z.array(z.string()),
  issues: z.array(z.string()),
});

export type WebsiteCheckOutput = z.infer<typeof WebsiteCheckOutputSchema>;

/**
 * Validates URL for SSRF safety and protocol compliance.
 */
function validateTargetUrl(rawUrl: string): { valid: boolean; normalizedUrl?: string; error?: string } {
  let urlObj: URL;
  try {
    const formatted = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
      ? rawUrl
      : `https://${rawUrl}`;
    urlObj = new URL(formatted);
  } catch {
    return { valid: false, error: `Invalid URL format '${rawUrl}'.` };
  }

  if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
    return { valid: false, error: `Protocol '${urlObj.protocol}' is not supported. Only http: and https: are allowed.` };
  }

  const hostname = urlObj.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.16.")
  ) {
    return { valid: false, error: `Target hostname '${hostname}' resolves to a local/private network address (SSRF protection).` };
  }

  return { valid: true, normalizedUrl: urlObj.href };
}

export const websiteCheckTool: ToolDefinition<WebsiteCheckInput, WebsiteCheckOutput> = {
  name: "website_check",
  description: "Performs bounded, automated HTTP inspection of a target website (status code, timing, title, meta description).",
  sideEffect: "NETWORK_READ_ONLY",
  requiresHumanApproval: false,
  inputSchema: WebsiteCheckInputSchema,
  outputSchema: WebsiteCheckOutputSchema,
  execute: async (input: WebsiteCheckInput, context: ToolContext): Promise<WebsiteCheckOutput> => {
    const { workRequestId, executionStepId } = context;
    const checksPerformed = [
      "URL validation & SSRF safety check",
      "HTTP availability & status code probe",
      "Response timing measurement",
      "Page title extraction",
      "Basic metadata inspection",
    ];
    const issues: string[] = [];

    // Step 1: URL & Security Validation
    const urlValidation = validateTargetUrl(input.url);
    if (!urlValidation.valid || !urlValidation.normalizedUrl) {
      const result: WebsiteCheckOutput = {
        url: input.url,
        success: false,
        statusCode: null,
        responseTimeMs: null,
        finalUrl: null,
        title: null,
        metaDescription: null,
        htmlSizeContentBytes: null,
        checksPerformed,
        issues: [urlValidation.error ?? "Invalid URL"],
      };

      await createArtifact({
        workRequestId,
        executionStepId,
        type: "WEBSITE_REPORT",
        title: `Website Inspection Failed: ${input.url}`,
        content: `# Website Inspection Report (FAILED)\n\nTarget URL: ${input.url}\n\n## Issues\n- ${urlValidation.error}`,
      });

      return result;
    }

    const targetUrl = urlValidation.normalizedUrl;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout limit

    const startTime = performance.now();

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "WorkPilot-AI-WebsiteChecker/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });

      clearTimeout(timeoutId);
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      const statusCode = response.status;
      const finalUrl = response.url;

      if (!response.ok) {
        issues.push(`HTTP status error: Received HTTP ${response.status} ${response.statusText}`);
      }

      const htmlText = await response.text();
      const htmlSizeContentBytes = Buffer.byteLength(htmlText, "utf8");

      // Extract <title>
      const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : null;

      // Extract <meta name="description" content="...">
      const metaMatch = htmlText.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        htmlText.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
      const metaDescription = metaMatch ? metaMatch[1].trim() : null;

      const isSuccess = response.ok;

      const result: WebsiteCheckOutput = {
        url: targetUrl,
        success: isSuccess,
        statusCode,
        responseTimeMs,
        finalUrl,
        title,
        metaDescription,
        htmlSizeContentBytes,
        checksPerformed,
        issues,
      };

      // Persist website report artifact
      await createArtifact({
        workRequestId,
        executionStepId,
        type: "WEBSITE_REPORT",
        title: `Website Report: ${targetUrl}`,
        content: `# Website Technical Inspection Report\n\nTarget URL: ${targetUrl}\nFinal URL: ${finalUrl}\nHTTP Status: ${statusCode}\nResponse Time: ${responseTimeMs} ms\nPage Title: ${title ?? "N/A"}\nMeta Description: ${metaDescription ?? "N/A"}\nHTML Size: ${htmlSizeContentBytes} bytes\n\n## Checks Performed\n${checksPerformed.map((c) => `- ${c}`).join("\n")}\n\n## Issues Identified\n${issues.length > 0 ? issues.map((i) => `- ${i}`).join("\n") : "- None."}`,
        metadata: {
          url: targetUrl,
          statusCode,
          responseTimeMs,
          success: isSuccess,
        },
      });

      return result;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      let errorMessage = "Network request failed.";
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          errorMessage = "Connection timed out after 10 seconds.";
        } else {
          errorMessage = err.message;
        }
      }

      issues.push(errorMessage);

      const failedResult: WebsiteCheckOutput = {
        url: targetUrl,
        success: false,
        statusCode: null,
        responseTimeMs,
        finalUrl: null,
        title: null,
        metaDescription: null,
        htmlSizeContentBytes: null,
        checksPerformed,
        issues,
      };

      await createArtifact({
        workRequestId,
        executionStepId,
        type: "WEBSITE_REPORT",
        title: `Website Report (FAILED): ${targetUrl}`,
        content: `# Website Technical Inspection Report (FAILED)\n\nTarget URL: ${targetUrl}\nStatus: FAILED\nReason: ${errorMessage}\n\n## Checks Performed\n${checksPerformed.map((c) => `- ${c}`).join("\n")}`,
      });

      return failedResult;
    }
  },
};
