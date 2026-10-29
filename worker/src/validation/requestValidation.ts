import { CATEGORY_IDS, type CategoryId } from "../config/categories";
import { LANGUAGE_CODES, type LanguageCode } from "../config/languages";
export type ValidRequest = { language: LanguageCode; categories: CategoryId[] };
export function validateRequest(value: unknown): ValidRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).some((key) => key !== "language" && key !== "categories")
  )
    return null;
  if (typeof body.language !== "string" || !LANGUAGE_CODES.has(body.language))
    return null;
  if (
    !Array.isArray(body.categories) ||
    body.categories.length < 1 ||
    body.categories.length > 8
  )
    return null;
  if (
    body.categories.some(
      (id) => typeof id !== "string" || !CATEGORY_IDS.has(id)
    )
  )
    return null;
  if (new Set(body.categories).size !== body.categories.length) return null;
  return {
    language: body.language as LanguageCode,
    categories: body.categories as CategoryId[],
  };
}
