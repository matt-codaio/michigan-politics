import type { GeographyId } from "./geography";

/** PEP / ACS / CVAP vintage for one series. */
export interface DataVintage {
  asOf: string;
  sourceUrl: string;
  /** e.g. `"ACS 2020–2024 5-year"`, `"PEP 2024"`, `"CVAP 2020–2024"`. */
  vintageLabel?: string;
}

export interface PopulationPoint {
  /** Calendar year. Series starts at 2000. */
  year: number;
  count: number;
}

export const AGE_BUCKETS = [
  "under18",
  "age18to24",
  "age25to34",
  "age35to44",
  "age45to54",
  "age55to64",
  "age65plus",
] as const;

export type AgeBucket = (typeof AGE_BUCKETS)[number];

/** Hispanic (any race) plus non-Hispanic race alone / two+. */
export const RACE_KEYS = [
  "hispanic",
  "nhWhite",
  "nhBlack",
  "nhAsian",
  "nhAian",
  "nhNhpi",
  "nhTwoPlus",
  "nhOther",
] as const;

export type RaceKey = (typeof RACE_KEYS)[number];

/** Educational attainment, population 25+. */
export const EDUCATION_KEYS = [
  "lessThanHs",
  "hsGrad",
  "someCollege",
  "bachelors",
  "graduate",
] as const;

export type EducationKey = (typeof EDUCATION_KEYS)[number];

/** ACS DP03 household income brackets. */
export const INCOME_BRACKET_KEYS = [
  "lt10k",
  "from10to15k",
  "from15to25k",
  "from25to35k",
  "from35to50k",
  "from50to75k",
  "from75to100k",
  "from100to150k",
  "from150to200k",
  "gte200k",
] as const;

export type IncomeBracketKey = (typeof INCOME_BRACKET_KEYS)[number];

/**
 * One geography's Census-derived demographics.
 * Shares are 0–1. Age tick (Michigan share) comes from the statewide bundle
 * (`geoId: "26"`), not a field on county rows.
 */
export interface DemographicsBundle {
  geoId: GeographyId;
  name: string;
  /** Annual PEP counts from 2000 through the latest vintage. */
  population: PopulationPoint[];
  ageShares: Record<AgeBucket, number>;
  raceShares: Record<RaceKey, number>;
  educationShares: Record<EducationKey, number>;
  incomeShares: Record<IncomeBracketKey, number>;
  /** Citizen voting-age population (not registered voters). */
  cvapTotal: number;
  /** CVAP counts by race/ethnicity (same keys as `raceShares`). */
  cvapByRace: Record<RaceKey, number>;
  asOf: string;
  sourceUrl: string;
  vintages?: {
    population?: DataVintage;
    acs?: DataVintage;
    cvap?: DataVintage;
  };
}

export interface DemographicsFile {
  generatedAt: string;
  geos: Record<string, DemographicsBundle>;
}
