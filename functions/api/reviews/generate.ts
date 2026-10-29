import worker from "../../../worker/src/index";

// Cloudflare Pages Function adapter: same-origin /api/reviews/generate.
export const onRequest: PagesFunction<{
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  ALLOWED_ORIGIN?: string;
}> = async ({ request, env }) => worker.fetch(request, env);
