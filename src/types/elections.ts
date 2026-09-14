import type { GeographyId } from "./geography";

/** Even-year federal general elections, 2000–2024. */
export const FEDERAL_ELECTION_YEARS = [
  2000, 2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024,
] as const;

export type ElectionYear = (typeof FEDERAL_ELECTION_YEARS)[number];

export type FederalOffice = "president" | "senate" | "house";

export type Party = "D" | "R" | "I" | "other";

export interface ElectionCandidate {
  name: string;
  party: Party;
  votes: number;
  sourceUrl: string;
}

/** House: list every CD with votes in this geography (counties can split). */
export interface HouseDistrictResult {
  district: number;
  candidates: ElectionCandidate[];
}

export interface YearOffices {
  president?: ElectionCandidate[];
  /** Omit when Michigan had no Senate race that year. */
  senate?: ElectionCandidate[];
  house?: HouseDistrictResult[];
}

export interface GeographyElections {
  geoId: GeographyId;
  name: string;
  /** JSON keys are year strings (`"2024"`). Omit years with no data. */
  years: Partial<Record<`${ElectionYear}`, YearOffices>>;
}

export interface ElectionsFile {
  generatedAt: string;
  geos: Record<string, GeographyElections>;
}

export function isFederalElectionYear(year: number): year is ElectionYear {
  return (FEDERAL_ELECTION_YEARS as readonly number[]).includes(year);
}
