import en from "../fallback/en.json";
import gu from "../fallback/gu.json";
import hi from "../fallback/hi.json";
import type { CategoryId } from "../config/categories";
import type { LanguageCode } from "../config/languages";

const FALLBACKS = { en, gu, hi } as const;
const SAFE_GENERIC: Record<LanguageCode, string> = {
  en: "I had a pleasant experience with the sewing machine shop.",
  gu: "Sewing machine ni shop par maro anubhav saro rahyo.",
  hi: "Sewing machine ki shop par mera anubhav achha raha.",
};
const SCRIPT_FORBIDDEN: Record<LanguageCode, RegExp> = {
  en: /[\u0900-\u097F\u0A80-\u0AFF]/u,
  gu: /[\u0900-\u097F\u0A80-\u0AFF]/u,
  hi: /[\u0900-\u097F\u0A80-\u0AFF]/u,
};
let lastKey = "";
export function hasUnexpectedScript(
  text: string,
  language: LanguageCode
): boolean {
  return SCRIPT_FORBIDDEN[language].test(text);
}
export function makeFallback(
  language: LanguageCode,
  categories: CategoryId[]
): string {
  const data = FALLBACKS[language] as Record<string, string[]>;
  const sentences = categories.map((id) => {
    const choices = data[id];
    if (!choices?.length) return SAFE_GENERIC[language];
    let idx = Math.floor(Math.random() * choices.length);
    const key = `${language}:${id}:${idx}`;
    if (key === lastKey && choices.length > 1) idx = (idx + 1) % choices.length;
    lastKey = `${language}:${id}:${idx}`;
    return choices[idx];
  });
  const unique = [...new Set(sentences)];
  return unique
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}
