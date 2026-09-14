import { useEffect, useState } from "react";
import type { GeographyId } from "../types/geography";
import { getSelection, setSelection, subscribeSelection } from "./bus";

export function useSelection(): [GeographyId, (geoId: GeographyId) => void] {
  const [geoId, setGeoId] = useState<GeographyId>(getSelection);
  useEffect(() => subscribeSelection(setGeoId), []);
  return [geoId, setSelection];
}
