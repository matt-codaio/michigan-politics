import type { AgeBucket, EducationKey, IncomeBracketKey, RaceKey } from "../types/demographics";

export const AGE_LABELS: Record<AgeBucket, string> = {
  under18: "Under 18",
  age18to24: "18–24",
  age25to34: "25–34",
  age35to44: "35–44",
  age45to54: "45–54",
  age55to64: "55–64",
  age65plus: "65+",
};

export const RACE_LABELS: Record<RaceKey, string> = {
  hispanic: "Hispanic (any race)",
  nhWhite: "White, not Hispanic",
  nhBlack: "Black, not Hispanic",
  nhAsian: "Asian, not Hispanic",
  nhAian: "AIAN, not Hispanic",
  nhNhpi: "NHPI, not Hispanic",
  nhTwoPlus: "Two or more, not Hispanic",
  nhOther: "Some other race, not Hispanic",
};

export const EDUCATION_LABELS: Record<EducationKey, string> = {
  lessThanHs: "Less than high school",
  hsGrad: "High school graduate",
  someCollege: "Some college / associate",
  bachelors: "Bachelor's",
  graduate: "Graduate degree",
};

export const INCOME_LABELS: Record<IncomeBracketKey, string> = {
  lt10k: "<$10k",
  from10to15k: "$10–15k",
  from15to25k: "$15–25k",
  from25to35k: "$25–35k",
  from35to50k: "$35–50k",
  from50to75k: "$50–75k",
  from75to100k: "$75–100k",
  from100to150k: "$100–150k",
  from150to200k: "$150–200k",
  gte200k: "$200k+",
};

export const AGE_COLORS: Record<AgeBucket, string> = {
  under18: "#8fb8e8",
  age18to24: "#5b8fc9",
  age25to34: "#3a6eae",
  age35to44: "#1e4b8c",
  age45to54: "#173a6b",
  age55to64: "#c47b3b",
  age65plus: "#8a4b1f",
};

export const RACE_COLORS: Record<RaceKey, string> = {
  hispanic: "#c47b3b",
  nhWhite: "#5b8fc9",
  nhBlack: "#1e4b8c",
  nhAsian: "#2f7d62",
  nhAian: "#8a4b1f",
  nhNhpi: "#7a5ea8",
  nhTwoPlus: "#6b7280",
  nhOther: "#9aa3ad",
};

export const EDUCATION_COLORS: Record<EducationKey, string> = {
  lessThanHs: "#c4a574",
  hsGrad: "#a67c4a",
  someCollege: "#3a6eae",
  bachelors: "#1e4b8c",
  graduate: "#173a6b",
};

export const INCOME_COLORS: Record<IncomeBracketKey, string> = {
  lt10k: "#d8c4a0",
  from10to15k: "#c4a574",
  from15to25k: "#b08c5c",
  from25to35k: "#8a6a3b",
  from35to50k: "#5b8fc9",
  from50to75k: "#3a6eae",
  from75to100k: "#1e4b8c",
  from100to150k: "#173a6b",
  from150to200k: "#2f7d62",
  gte200k: "#1f5a46",
};

export function formatShare(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString();
}
