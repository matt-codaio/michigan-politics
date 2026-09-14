import {
  AGE_BUCKETS,
  EDUCATION_KEYS,
  INCOME_BRACKET_KEYS,
  type AgeBucket,
  type EducationKey,
  type IncomeBracketKey,
} from "../types/demographics";

export interface HistogramBin<K extends string> {
  key: K;
  lo: number;
  hi: number;
}

/** Closed age ranges in years. 65+ is open-ended; 90 is a conventional cap. */
export const AGE_BINS: readonly HistogramBin<AgeBucket>[] = [
  { key: "under18", lo: 0, hi: 18 },
  { key: "age18to24", lo: 18, hi: 25 },
  { key: "age25to34", lo: 25, hi: 35 },
  { key: "age35to44", lo: 35, hi: 45 },
  { key: "age45to54", lo: 45, hi: 55 },
  { key: "age55to64", lo: 55, hi: 65 },
  { key: "age65plus", lo: 65, hi: 90 },
];

/** Household income brackets in dollars. $200k+ is open-ended. */
export const INCOME_BINS: readonly HistogramBin<IncomeBracketKey>[] = [
  { key: "lt10k", lo: 0, hi: 10_000 },
  { key: "from10to15k", lo: 10_000, hi: 15_000 },
  { key: "from15to25k", lo: 15_000, hi: 25_000 },
  { key: "from25to35k", lo: 25_000, hi: 35_000 },
  { key: "from35to50k", lo: 35_000, hi: 50_000 },
  { key: "from50to75k", lo: 50_000, hi: 75_000 },
  { key: "from75to100k", lo: 75_000, hi: 100_000 },
  { key: "from100to150k", lo: 100_000, hi: 150_000 },
  { key: "from150to200k", lo: 150_000, hi: 200_000 },
  { key: "gte200k", lo: 200_000, hi: 350_000 },
];

/** Years of school. Used as an ordinal scale for a county median. */
export const EDUCATION_BINS: readonly HistogramBin<EducationKey>[] = [
  { key: "lessThanHs", lo: 8, hi: 12 },
  { key: "hsGrad", lo: 12, hi: 13 },
  { key: "someCollege", lo: 13, hi: 16 },
  { key: "bachelors", lo: 16, hi: 18 },
  { key: "graduate", lo: 18, hi: 21 },
];

function assertBinKeys<K extends string>(
  bins: readonly HistogramBin<K>[],
  keys: readonly K[],
): void {
  if (bins.length !== keys.length || bins.some((bin, i) => bin.key !== keys[i])) {
    throw new Error("Histogram bins are out of sync with demographic keys");
  }
}

assertBinKeys(AGE_BINS, AGE_BUCKETS);
assertBinKeys(INCOME_BINS, INCOME_BRACKET_KEYS);
assertBinKeys(EDUCATION_BINS, EDUCATION_KEYS);

/**
 * Approximate the p-th percentile by walking share bins and interpolating
 * linearly inside the bin that contains the target (ACS-style median).
 */
export function histogramPercentile<K extends string>(
  bins: readonly HistogramBin<K>[],
  shares: Record<K, number>,
  p = 0.5,
): number | null {
  const total = bins.reduce((sum, bin) => sum + Math.max(0, shares[bin.key] ?? 0), 0);
  if (total <= 0 || !Number.isFinite(total)) return null;
  const target = Math.min(Math.max(p, 0), 1) * total;
  let cumulative = 0;
  for (let i = 0; i < bins.length; i++) {
    const bin = bins[i];
    if (!bin) continue;
    const share = Math.max(0, shares[bin.key] ?? 0);
    const next = cumulative + share;
    const isLast = i === bins.length - 1;
    if (next >= target || isLast) {
      if (share <= 0) return (bin.lo + bin.hi) / 2;
      const within = (target - cumulative) / share;
      return bin.lo + Math.min(1, Math.max(0, within)) * (bin.hi - bin.lo);
    }
    cumulative = next;
  }
  return null;
}
