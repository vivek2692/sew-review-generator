import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
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
let total = 0;
for (const language of ["en", "gu", "hi"]) {
  const data = JSON.parse(
    readFileSync(
      new URL(`../worker/src/fallback/${language}.json`, import.meta.url),
      "utf8"
    )
  );
  assert.deepEqual(Object.keys(data), ids, `${language}: category IDs differ`);
  for (const [id, variants] of Object.entries(data)) {
    assert.equal(
      variants.length,
      10,
      `${language}/${id}: expected ten variants`
    );
    assert.equal(
      new Set(variants).size,
      10,
      `${language}/${id}: duplicate variants`
    );
    for (const sentence of variants) {
      assert.equal(typeof sentence, "string");
      assert.ok(sentence.trim().length > 0);
      assert.doesNotMatch(
        sentence,
        /[\u0900-\u097F\u0A80-\u0AFF]/u,
        `${language}/${id}: non-Roman Indic script`
      );
    }
    total += variants.length;
  }
}
const frontend = readFileSync(
  new URL("../src/main.tsx", import.meta.url),
  "utf8"
);
assert.doesNotMatch(frontend, /GEMINI_API_KEY|VITE_GEMINI_API_KEY/);
const api = readFileSync(
  new URL("../worker/src/index.ts", import.meta.url),
  "utf8"
);
assert.match(api, /MAX_BODY_BYTES/);
assert.match(api, /request\.method !== "POST"/);
assert.match(api, /validateRequest\(body\)/);
console.log(
  `PASS: ${total} unique static variations across 24 language/category combinations; script and API source checks passed.`
);
