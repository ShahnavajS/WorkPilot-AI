import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL environment variable is required."),
  OPENAI_API_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("3000"),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let validatedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (validatedEnv) return validatedEnv;

  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = JSON.stringify(result.error.format(), null, 2);
    console.error(`❌ Environment Validation Error:\n${formatted}`);
    throw new Error("Missing or invalid server environment variables.");
  }

  validatedEnv = result.data;
  return validatedEnv;
}
