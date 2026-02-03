/**
 * env.ts — validated environment configuration
 *
 * Crashes at import time (server startup) if any required variable is missing
 * or malformed.  Client-safe public variables are exported separately so
 * tree-shaking keeps secret keys out of the browser bundle.
 *
 * Usage:
 *   Server-side (API routes, server components, middleware):
 *     import { env } from "@/config/env";
 *     env.SUPABASE_SERVICE_ROLE_KEY   // ✅
 *     env.STRIPE_SECRET_KEY           // ✅
 *
 *   Client-side (components, hooks):
 *     import { publicEnv } from "@/config/env";
 *     publicEnv.NEXT_PUBLIC_SUPABASE_URL   // ✅
 *     // env.STRIPE_SECRET_KEY             // ❌ not exported on client
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema — server (full secrets)
// ---------------------------------------------------------------------------
const serverSchema = z.object({
  // ── Supabase ─────────────────────────────────────────────────────────────
  /** Supabase project URL.  Must be a Canadian-region instance (Law 25). */
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),

  /** Supabase anonymous (public) key — safe for the browser. */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short"),

  /** Supabase service-role key — NEVER expose to the client. */
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, "SUPABASE_SERVICE_ROLE_KEY looks too short"),

  // ── Stripe ───────────────────────────────────────────────────────────────
  /** Stripe secret key (sk_live_… or sk_test_…). */
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith("sk_", "STRIPE_SECRET_KEY must start with sk_"),

  /** Stripe webhook signing secret (whsec_…). */
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith("whsec_", "STRIPE_WEBHOOK_SECRET must start with whsec_"),

  // ── OCR — Mindee ─────────────────────────────────────────────────────────
  /** Mindee API key for health-card OCR. */
  MINDEE_API_KEY: z.string().min(1, "MINDEE_API_KEY is required"),

  // ── Email — Resend ───────────────────────────────────────────────────────
  /** Resend API key (re_…).  Use a "Sending Only" key in production. */
  RESEND_API_KEY: z
    .string()
    .startsWith("re_", "RESEND_API_KEY must start with re_"),

  // ── App ──────────────────────────────────────────────────────────────────
  /** Public-facing origin (https://yourdomain.com).  Used for redirect URIs. */
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL"),

  // ── Runtime flags ────────────────────────────────────────────────────────
  /**
   * When "true" the server verifies on boot that the Supabase URL points to a
   * Canadian region.  Mandatory for Quebec Law 25 compliance.
   */
  ENFORCE_DATA_RESIDENCY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  /**
   * NODE_OPTIONS — we don't validate the full string, but we assert that
   * --expose-gc is present so that the health-card image wipe (global.gc())
   * actually works.  If it's missing we WARN rather than crash because the
   * app can still run; the wipe just becomes a no-op.
   */
  NODE_OPTIONS: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Schema — public (browser-safe subset)
// ---------------------------------------------------------------------------
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

// ---------------------------------------------------------------------------
// Parse & validate
// ---------------------------------------------------------------------------
function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  label: string
): z.infer<T> {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      `\n❌  [${label}] Environment validation failed:\n`,
      ...parsed.error.issues.map(
        (i) => `   • ${i.path.join(".")}: ${i.message}`
      ),
      "\n"
    );
    throw new Error(`[${label}] Missing or invalid environment variables. See above for details.`);
  }

  return parsed.data;
}

// ---------------------------------------------------------------------------
// Export — server env (only import on the server!)
// ---------------------------------------------------------------------------
/** Full validated env (secrets included).  Import only in server code. */
export const env = parseEnv(serverSchema, "SERVER ENV");

// ---------------------------------------------------------------------------
// Export — public env (safe for client bundles)
// ---------------------------------------------------------------------------
/** Browser-safe subset.  Safe to import anywhere. */
export const publicEnv = parseEnv(publicSchema, "PUBLIC ENV");

// ---------------------------------------------------------------------------
// Post-parse runtime warnings (non-fatal)
// ---------------------------------------------------------------------------
(function runtimeWarnings() {
  // 1. --expose-gc check
  const nodeOpts = env.NODE_OPTIONS || "";
  if (!nodeOpts.includes("--expose-gc")) {
    console.warn(
      "\n⚠️  NODE_OPTIONS does not include --expose-gc.\n" +
        "   global.gc() calls (Law 25 health-card image wipe) will be no-ops.\n" +
        "   Set NODE_OPTIONS=--expose-gc in your environment.\n"
    );
  }

  // 2. Data-residency enforcement
  if (env.ENFORCE_DATA_RESIDENCY) {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    // Supabase Canadian regions currently resolve to *.supabase.co with a
    // project ID that includes "ca-central" or similar.  This is a best-effort
    // heuristic; adjust the check if your region identifier differs.
    const hostname = url.hostname;
    const isCanadian =
      hostname.includes("ca-central") ||
      hostname.includes(".ca.") ||
      // allow localhost / local dev unconditionally
      hostname === "localhost" ||
      hostname === "127.0.0.1";

    if (!isCanadian) {
      console.warn(
        "\n⚠️  ENFORCE_DATA_RESIDENCY is enabled but the Supabase URL\n" +
          `   (${hostname}) does not appear to be a Canadian region.\n` +
          "   Verify your Supabase project region or update the residency check.\n"
      );
    }
  }
})();
