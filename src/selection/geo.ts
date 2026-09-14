import {
  MICHIGAN_STATE_GEO_ID,
  isValidGeographyId,
  type GeographyId,
} from "../types/geography";
import { GEO_QUERY_PARAM } from "./constants";

export function parseGeographyId(raw: string | null | undefined): GeographyId | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return isValidGeographyId(trimmed) ? trimmed : null;
}

export function readGeoFromUrl(search = window.location.search): GeographyId | null {
  return parseGeographyId(new URLSearchParams(search).get(GEO_QUERY_PARAM));
}

export function writeGeoToUrl(geoId: GeographyId): void {
  const url = new URL(window.location.href);
  if (url.searchParams.get(GEO_QUERY_PARAM) === geoId) return;
  url.searchParams.set(GEO_QUERY_PARAM, geoId);
  window.history.replaceState(window.history.state, "", url);
}

export function defaultGeographyId(): GeographyId {
  return MICHIGAN_STATE_GEO_ID;
}
