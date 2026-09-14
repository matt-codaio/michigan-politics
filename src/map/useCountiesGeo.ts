import { useEffect, useMemo, useState } from "react";
import { DATA_PATHS, type CountyFeature } from "../types";
import { parseCountyGeojson, type CountyFeatureCollection } from "./geojson";

export type GeoLoadStatus = "loading" | "ready" | "missing" | "error";

export function useCountiesGeo(): {
  status: GeoLoadStatus;
  geojson: CountyFeatureCollection | null;
  counties: CountyFeature[];
  message: string | null;
} {
  const [status, setStatus] = useState<GeoLoadStatus>("loading");
  const [geojson, setGeojson] = useState<CountyFeatureCollection | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch(DATA_PATHS.countiesGeojson, { signal: ac.signal });
        if (res.status === 404) {
          setStatus("missing");
          setMessage("County shapes are not in local/. Run npm run ingest:geo.");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          setMessage(`Could not load counties (${res.status}).`);
          return;
        }
        const parsed = parseCountyGeojson(await res.json());
        if (!parsed) {
          setStatus("error");
          setMessage("counties.geojson is not a county FeatureCollection.");
          return;
        }
        setGeojson(parsed);
        setStatus("ready");
      } catch (err) {
        if (ac.signal.aborted) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to load counties.");
      }
    })();
    return () => ac.abort();
  }, []);

  const counties = useMemo<CountyFeature[]>(() => {
    if (!geojson) return [];
    return geojson.features
      .map((feature) => ({
        fips: feature.properties.fips,
        name: feature.properties.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [geojson]);

  return { status, geojson, counties, message };
}
