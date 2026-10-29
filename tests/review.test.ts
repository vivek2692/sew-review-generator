import { describe, expect, it } from "vitest";
import en from "../worker/src/fallback/en.json";
import gu from "../worker/src/fallback/gu.json";
import hi from "../worker/src/fallback/hi.json";
import { validateRequest } from "../worker/src/validation/requestValidation";
import {
  hasUnexpectedScript,
  makeFallback,
} from "../worker/src/services/fallbackService";

const ids = [
  "product_quality",
  "value_for_money",
  "sewing_performance",
  "ease_of_use",
  "features_design",
  "product_variety",
  "shop_service",
  "purchase_experience",
];
describe("fallback dataset", () => {
  it("contains ten distinct sentences for each of 24 language/category combinations", () => {
    for (const data of [en, gu, hi])
      for (const id of ids) {
        expect(data[id as keyof typeof data]).toHaveLength(10);
        expect(new Set(data[id as keyof typeof data]).size).toBe(10);
      }
  });
  it("keeps Gujarati and Hindi fallback output in Roman letters", () => {
    for (const lang of ["en", "gu", "hi"] as const)
      for (const id of ids) {
        const text = makeFallback(lang, [id as never]);
        expect(hasUnexpectedScript(text, lang)).toBe(false);
      }
  });
  it("composes multiple selected categories as readable text", () => {
    const result = makeFallback("gu", ["product_quality", "value_for_money"]);
    expect(result.length).toBeGreaterThan(20);
    expect(result).not.toContain("\n");
  });
});
describe("request validation", () => {
  it("accepts supported languages and known unique categories", () => {
    expect(
      validateRequest({
        language: "gu",
        categories: ["product_quality", "value_for_money"],
      })
    ).not.toBeNull();
  });
  it("rejects unknown languages, unknown categories, duplicates, empty arrays and extra keys", () => {
    expect(
      validateRequest({ language: "fr", categories: ["product_quality"] })
    ).toBeNull();
    expect(
      validateRequest({ language: "en", categories: ["made_up"] })
    ).toBeNull();
    expect(
      validateRequest({
        language: "en",
        categories: ["product_quality", "product_quality"],
      })
    ).toBeNull();
    expect(validateRequest({ language: "en", categories: [] })).toBeNull();
    expect(
      validateRequest({
        language: "en",
        categories: ["product_quality"],
        prompt: "override",
      })
    ).toBeNull();
  });
});
