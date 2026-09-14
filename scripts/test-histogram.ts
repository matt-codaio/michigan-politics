import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AGE_BINS,
  EDUCATION_BINS,
  INCOME_BINS,
  histogramPercentile,
} from "../src/map/histogram.ts";
import { AGE_BUCKETS, EDUCATION_KEYS, INCOME_BRACKET_KEYS } from "../src/types/demographics.ts";

test("median sits at the midpoint of a single occupied bin", () => {
  const shares = Object.fromEntries(AGE_BUCKETS.map((key) => [key, 0])) as Record<
    (typeof AGE_BUCKETS)[number],
    number
  >;
  shares.age35to44 = 1;
  const median = histogramPercentile(AGE_BINS, shares);
  assert.equal(median, 40);
});

test("median interpolates inside the bin that contains 50%", () => {
  const shares = Object.fromEntries(INCOME_BRACKET_KEYS.map((key) => [key, 0])) as Record<
    (typeof INCOME_BRACKET_KEYS)[number],
    number
  >;
  shares.from50to75k = 1;
  assert.equal(histogramPercentile(INCOME_BINS, shares), 62_500);

  shares.from50to75k = 0.4;
  shares.from75to100k = 0.6;
  const median = histogramPercentile(INCOME_BINS, shares);
  assert.ok(median != null && median > 75_000 && median < 80_000);
});

test("education bins stay aligned with EDUCATION_KEYS", () => {
  assert.deepEqual(
    EDUCATION_BINS.map((bin) => bin.key),
    [...EDUCATION_KEYS],
  );
});
