import { useEffect, useState } from "react";
import { DATA_PATHS } from "../types/paths";
import type { MarketsFile } from "../types/markets";

interface FileStatus {
  label: string;
  disk: string;
  url: string;
  loaded: boolean;
  detail: string;
}

const FILES: { label: string; disk: string; url: string }[] = [
  {
    label: "County GeoJSON",
    disk: "local/counties/counties.geojson",
    url: DATA_PATHS.countiesGeojson,
  },
  {
    label: "Demographics (PEP / ACS / CVAP)",
    disk: "local/counties/demographics.json",
    url: DATA_PATHS.demographics,
  },
  {
    label: "Elections",
    disk: "local/counties/elections.json",
    url: DATA_PATHS.elections,
  },
  {
    label: "Polls",
    disk: "local/polls/polls.json",
    url: DATA_PATHS.polls,
  },
  {
    label: "Markets",
    disk: "local/markets/markets.json",
    url: DATA_PATHS.markets,
  },
];

function latestMarketAsOf(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const snapshots = (data as MarketsFile).snapshots;
  if (!Array.isArray(snapshots) || snapshots.length === 0) return null;
  const stamps = snapshots
    .map((row) => row.timestamp)
    .filter((value): value is string => typeof value === "string")
    .sort();
  return stamps.at(-1) ?? null;
}

function generatedAt(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const value = (data as { generatedAt?: unknown }).generatedAt;
  return typeof value === "string" ? value : null;
}

async function probe(file: (typeof FILES)[number]): Promise<FileStatus> {
  try {
    const res = await fetch(file.url, { cache: "no-store" });
    if (!res.ok) {
      return {
        ...file,
        loaded: false,
        detail: "Not loaded yet",
      };
    }
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("json")) {
      return { ...file, loaded: true, detail: "File present" };
    }
    const data: unknown = await res.json();
    if (file.url === DATA_PATHS.markets) {
      const asOf = latestMarketAsOf(data);
      return {
        ...file,
        loaded: true,
        detail: asOf ? `Latest snapshot ${asOf}` : "File present (no snapshots)",
      };
    }
    const at = generatedAt(data);
    return {
      ...file,
      loaded: true,
      detail: at ? `Generated ${at}` : "File present",
    };
  } catch {
    return { ...file, loaded: false, detail: "Not loaded yet" };
  }
}

export function SourcesPage() {
  const [files, setFiles] = useState<FileStatus[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(FILES.map(probe)).then((rows) => {
      if (!cancelled) setFiles(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page">
      <h1>Sources</h1>
      <p>
        Public data only. Refresh by re-running ingest into gitignored{" "}
        <code>local/</code> (see README). Vite serves those files at{" "}
        <code>/data/*</code>.
      </p>
      <h2>Last refresh</h2>
      {files === null ? (
        <p className="muted">Checking local files…</p>
      ) : (
        <ul className="source-status">
          {files.map((row) => (
            <li key={row.disk}>
              <strong>{row.label}</strong>
              <span className={row.loaded ? undefined : "muted"}>
                {" "}
                — {row.detail}
              </span>
              <br />
              <code>{row.disk}</code>
            </li>
          ))}
        </ul>
      )}
      <h2>Public links</h2>
      <ul>
        <li>
          <a href="https://mvic.sos.state.mi.us/votehistory/">MVIC Vote History</a>
        </li>
        <li>
          <a href="https://mvic.sos.state.mi.us/VoterCount/Index">
            MVIC Voter Count
          </a>
        </li>
        <li>
          <a href="https://www.michigan.gov/sos/elections/election-results-and-data/voter-participation-dashboard">
            MI voter participation dashboard
          </a>
        </li>
        <li>
          <a href="https://www.census.gov/">Census PEP / ACS / CVAP</a>
        </li>
        <li>
          <a href="https://github.com/openelections/openelections-data-mi">
            OpenElections Michigan
          </a>
        </li>
        <li>
          <a href="https://polymarket.com/event/michigan-senate-election-winner">
            Polymarket Michigan Senate
          </a>{" "}
          <span className="not-a-poll">Not a poll</span>
        </li>
      </ul>
    </main>
  );
}
