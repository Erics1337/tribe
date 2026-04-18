import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().default("tribe-dev-secret"),
  APP_URL: z.string().default("http://localhost:8081"),
  MOBILE_DEEP_LINK_SCHEME: z.string().default("tribe"),
  ATPROTO_SERVICE_URL: z.string().default("https://public.api.bsky.app"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
