import { makeFallback } from "./fallbackService";
import { generateWithGemini, GeminiError } from "./geminiService";
import type { ValidRequest } from "../validation/requestValidation";
type Env = { GEMINI_API_KEY?: string; GEMINI_MODEL?: string };
export async function createReview(
  env: Env,
  request: ValidRequest
): Promise<{ review: string; source: "ai" | "fallback"; reason?: string }> {
  try {
    const review = await generateWithGemini(
      env,
      request.language,
      request.categories
    );
    return { review, source: "ai" };
  } catch (error) {
    const reason =
      error instanceof GeminiError ? error.kind : "unexpected_error";
    // Do not log prompts, drafts, credentials, or provider response bodies.
    console.warn(
      JSON.stringify({
        event: "review_generation_fallback",
        reason,
        status: error instanceof GeminiError ? error.status : undefined,
      })
    );
    return {
      review: makeFallback(request.language, request.categories),
      source: "fallback",
      reason,
    };
  }
}
