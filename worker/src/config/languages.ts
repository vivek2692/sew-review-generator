export const LANGUAGES = {
  en: { label: "English", instruction: "Write in natural English." },
  gu: {
    label: "Gujarati (Roman letters)",
    instruction:
      "Write natural conversational Gujarati transliterated into English/Roman letters only. Never use Gujarati script.",
  },
  hi: {
    label: "Hindi (Roman letters)",
    instruction:
      "Write natural conversational Hindi transliterated into English/Roman letters only. Never use Devanagari script.",
  },
} as const;
export type LanguageCode = keyof typeof LANGUAGES;
export const LANGUAGE_CODES = new Set<string>(Object.keys(LANGUAGES));
