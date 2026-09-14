/**
 * Selection id: Michigan state FIPS `"26"`, or a 5-digit MI county FIPS
 * (`"26163"` Wayne). Persist in `?geo=` on every route.
 */
export type GeographyId = string;

export const MICHIGAN_STATE_GEO_ID = "26";

export interface CountyFeature {
  /** 5-digit county FIPS, e.g. `"26163"`. */
  fips: string;
  /** County name without "County", e.g. `"Wayne"`. */
  name: string;
}

export function isStateGeoId(id: string): boolean {
  return id === MICHIGAN_STATE_GEO_ID;
}

/** Michigan county FIPS: state `26` + 3-digit county code. */
export function isCountyFips(id: string): boolean {
  return /^26\d{3}$/.test(id);
}

export function isValidGeographyId(id: string): id is GeographyId {
  return isStateGeoId(id) || isCountyFips(id);
}
