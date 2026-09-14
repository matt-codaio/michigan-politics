import { useEffect, useState } from "react";
import { DATA_PATHS } from "../types/paths";
import { MICHIGAN_STATE_GEO_ID, type GeographyId } from "../types/geography";
import type { DemographicsBundle, DemographicsFile } from "../types/demographics";

type Status =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; file: DemographicsFile };

let cached: Promise<Status> | null = null;

function loadFile(): Promise<Status> {
  if (!cached) {
    cached = fetch(DATA_PATHS.demographics, { cache: "no-store" })
      .then(async (res): Promise<Status> => {
        if (res.status === 404) return { status: "missing" };
        if (!res.ok) {
          return { status: "error", message: `Could not load demographics (${res.status}).` };
        }
        const data: unknown = await res.json();
        if (
          typeof data !== "object" ||
          data === null ||
          !("geos" in data) ||
          typeof (data as DemographicsFile).geos !== "object"
        ) {
          return { status: "error", message: "demographics.json is not a valid DemographicsFile." };
        }
        return { status: "ready", file: data as DemographicsFile };
      })
      .catch((err: unknown): Status => {
        const message = err instanceof Error ? err.message : "Network error";
        return { status: "error", message };
      });
  }
  return cached;
}

export function useDemographics(geoId: GeographyId): {
  status: Status["status"] | "empty";
  message?: string;
  bundle?: DemographicsBundle;
  state?: DemographicsBundle;
} {
  const [status, setStatus] = useState<Status>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    void loadFile().then((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status.status !== "ready") {
    return { status: status.status, message: "message" in status ? status.message : undefined };
  }
  const bundle = status.file.geos[geoId];
  const state = status.file.geos[MICHIGAN_STATE_GEO_ID];
  if (!bundle) return { status: "empty", state };
  return { status: "ready", bundle, state };
}

export function missingCensusMessage(): string {
  return "No Census file yet. Run npm run ingest:census (writes local/counties/demographics.json).";
}
