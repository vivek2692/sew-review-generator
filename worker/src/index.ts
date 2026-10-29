import { validateRequest } from "./validation/requestValidation";
import { createReview } from "./services/reviewService";
import { makeFallback } from "./services/fallbackService";
import type { LanguageCode } from "./config/languages";
import type { CategoryId } from "./config/categories";

type Env = {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  ALLOWED_ORIGIN?: string;
};
type RateEntry = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateEntry>();
const MAX_BODY_BYTES = 2048;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 200;
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
function limited(key: string): boolean {
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    rateBuckets.set(key, bucket);
  }
  bucket.count++;
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets)
      if (v.resetAt <= now) rateBuckets.delete(k);
    while (rateBuckets.size > 5000)
      rateBuckets.delete(rateBuckets.keys().next().value as string);
  }
  return bucket.count > MAX_PER_WINDOW;
}
function validOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const allowed = env.ALLOWED_ORIGIN
    ? [env.ALLOWED_ORIGIN]
    : [new URL(request.url).origin];
  return allowed.includes(origin);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/api/reviews/generate")
      return json({ error: "Not found." }, 404);
    if (!validOrigin(request, env))
      return json({ error: "Origin not allowed." }, 403);
    if (request.method !== "POST")
      return new Response(JSON.stringify({ error: "Method not allowed." }), {
        status: 405,
        headers: {
          "content-type": "application/json",
          allow: "POST",
          "cache-control": "no-store",
        },
      });
    if (
      !(request.headers.get("content-type") || "")
        .toLowerCase()
        .includes("application/json")
    )
      return json({ error: "Content-Type must be application/json." }, 415);
    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_BODY_BYTES)
      return json({ error: "Request body is too large." }, 413);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    // Best effort only: in-memory buckets are isolate-local and reset on eviction/restarts.
    if (limited(ip))
      return json(
        { error: "Too many requests. Please wait a minute and try again." },
        429
      );
    let body: unknown;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES)
        return json({ error: "Request body is too large." }, 413);
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Please send valid JSON." }, 400);
    }
    const validated = validateRequest(body);
    if (!validated)
      return json(
        { error: "Choose a supported language and one or more valid topics." },
        400
      );
    const started = Date.now();
    const result = await createReview(env, validated);
    console.log(
      JSON.stringify({
        event: "review_generation",
        source: result.source,
        durationMs: Date.now() - started,
        language: validated.language,
        categoryCount: validated.categories.length,
      })
    );
    return json({ review: result.review, source: result.source });
  },
};

export { makeFallback };
export type { LanguageCode, CategoryId };
