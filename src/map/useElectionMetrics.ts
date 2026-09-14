import { useEffect, useMemo, useState } from "react";
import { DATA_PATHS, type ElectionsFile } from "../types";
import {
  countyMargins,
  metricsFromElections,
  type ChoroplethMetric,
} from "./choropleth";

function isElectionsFile(data: unknown): data is ElectionsFile {
  if (!data || typeof data !== "object") return false;
  const geos = (data as { geos?: unknown }).geos;
  return geos !== null && typeof geos === "object";
}

export function useElectionMetrics(): {
  status: "loading" | "ready" | "missing";
  metrics: ChoroplethMetric[];
  selected: ChoroplethMetric | null;
  setMetricId: (id: string) => void;
  margins: Record<string, number> | null;
} {
  const [file, setFile] = useState<ElectionsFile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [metricId, setMetricId] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch(DATA_PATHS.elections, { signal: ac.signal });
        if (!res.ok) {
          setStatus("missing");
          return;
        }
        const data: unknown = await res.json();
        if (!isElectionsFile(data) || Object.keys(data.geos).length === 0) {
          setStatus("missing");
          return;
        }
        setFile(data);
        setStatus("ready");
      } catch {
        if (ac.signal.aborted) return;
        setStatus("missing");
      }
    })();
    return () => ac.abort();
  }, []);

  const metrics = useMemo(() => (file ? metricsFromElections(file) : []), [file]);

  const selected = useMemo(() => {
    if (metrics.length === 0) return null;
    return metrics.find((metric) => metric.id === metricId) ?? metrics[0] ?? null;
  }, [metrics, metricId]);

  const margins = useMemo(() => {
    if (!file || !selected) return null;
    return countyMargins(file, selected);
  }, [file, selected]);

  return {
    status,
    metrics,
    selected,
    setMetricId,
    margins,
  };
}
