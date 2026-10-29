import { CATEGORIES, type CategoryId } from "../config/categories";
import { LANGUAGES, type LanguageCode } from "../config/languages";
import { hasUnexpectedScript } from "./fallbackService";

type Env = { GEMINI_API_KEY?: string; GEMINI_MODEL?: string };
const TIMEOUT_MS = 8_000;
const MAX_OUTPUT_TOKENS = 180;
const PROMPT = `You are helping a real customer draft a short, genuine review for a sewing machine shop. Write only a review draft based on the selected topics. Never invent personal experiences, specific purchases, conversations, discounts, repairs, delivery details, product specifications, or other unsupported facts. Use natural, concise language and avoid repetitive marketing language, exaggerated praise, keyword stuffing, or claims that the customer has not confirmed.

If the selected language is English, write in English. If Gujarati, write natural conversational Gujarati transliterated into the English/Roman alphabet only, never Gujarati script. Expected style: “Bahu saras product che, barabar work kare che. Paisa vasool che.” If Hindi, write natural conversational Hindi transliterated into English/Roman letters only, never Devanagari script.

Return only the review text, without headings, quotation marks, markdown, explanations, numbered lists, or preamble. Aim for 30–70 words, but never pad the text with unsupported claims. Sound like an ordinary customer, not an advertisement. If one category is selected, focus on it. If multiple categories are selected, combine them naturally. The customer must verify the draft before using it.`;

export class GeminiError extends Error {
  constructor(public kind: string, public status?: number) {
    super(kind);
  }
}
export async function generateWithGemini(
  env: Env,
  language: LanguageCode,
  selected: CategoryId[]
): Promise<string> {
  if (!env.GEMINI_API_KEY) throw new GeminiError("not_configured");
  const model = (env.GEMINI_MODEL || "gemini-2.5-flash-lite").trim();
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(model))
    throw new GeminiError("invalid_model_config");
  const selectedCategories = selected.map((id) => {
    const c = CATEGORIES.find((item) => item.id === id)!;
    return { id: c.id, label: c.label, hint: c.hint };
  });
  const prompt = `${PROMPT}

Selected language: ${LANGUAGES[language].label}. ${
    LANGUAGES[language].instruction
  }
Selected topics (only these are confirmed as topics the customer wants to mention): ${JSON.stringify(
    selectedCategories
  )}

Write the draft now.`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            responseMimeType: "text/plain",
          },
        }),
      }
    );
    if (!response.ok) {
      console.log(await response.text());
      const status = response.status;
      if (status === 429) throw new GeminiError("quota_or_rate_limit", status);
      if (status === 401 || status === 403)
        throw new GeminiError("credentials_or_access", status);
      if (status >= 500) throw new GeminiError("provider_server_error", status);
      throw new GeminiError("provider_request_error", status);
    }
    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim()
      .replace(/^['“”"]|['“”"]$/g, "")
      .trim();
    if (!text || text.length > 1200 || /^(here is|review:|draft:)/i.test(text))
      throw new GeminiError("invalid_response");
    if (hasUnexpectedScript(text, language))
      throw new GeminiError("invalid_script");
    if (language === "en" && /[\u0900-\u097F\u0A80-\u0AFF]/u.test(text))
      throw new GeminiError("invalid_script");
    return text;
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    if (error instanceof Error && error.name === "AbortError")
      throw new GeminiError("timeout");
    throw new GeminiError("network_error");
  } finally {
    clearTimeout(timer);
  }
}
