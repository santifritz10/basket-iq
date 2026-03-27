import "server-only";
import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NEWS_API_BASE_URL: z.string().url().optional(),
  NEWS_API_KEY: z.string().min(1).optional()
});

const parsed = envSchema.safeParse({
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEWS_API_BASE_URL: process.env.NEWS_API_BASE_URL,
  NEWS_API_KEY: process.env.NEWS_API_KEY
});

if (!parsed.success) {
  throw new Error(
    "Invalid environment variables: " + JSON.stringify(parsed.error.flatten().fieldErrors)
  );
}

if (typeof process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY !== "undefined") {
  throw new Error("Do not expose service role key via NEXT_PUBLIC_* env variables.");
}

export const env = parsed.data;
