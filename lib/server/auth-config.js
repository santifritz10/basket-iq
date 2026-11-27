import "server-only";
import { buildSiteConfig } from "@/lib/auth/site-url";

/**
 * Configuración pública que necesitan las pantallas de autenticación.
 * La anon key de Supabase es pública por diseño (la protege RLS); nunca se
 * incluye la service role key.
 */
export function getPublicAuthConfig() {
  const site = buildSiteConfig({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    allowedOrigins: process.env.AUTH_ALLOWED_ORIGINS,
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV
  });
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
    siteUrl: site.siteUrl,
    allowedOrigins: site.allowedOrigins,
    isProduction: site.isProduction,
    googleEnabled: process.env.AUTH_GOOGLE_ENABLED === "true"
  };
}
