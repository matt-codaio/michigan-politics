import { useEffect, useState } from "react";
import { DATA_PATHS } from "../types/paths";
import {
  FEDERAL_ELECTION_YEARS,
  type ElectionCandidate,
  type ElectionsFile,
  type GeographyElections,
  type HouseDistrictResult,
  type Party,
  type YearOffices,
} from "../types/elections";
import { MICHIGAN_STATE_GEO_ID, type GeographyId } from "../types/geography";
import { StackBar } from "./ShareBar";

interface ElectionsCardProps {
  geoId: GeographyId;
}

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; file: ElectionsFile };

const PARTY_CLASS: Record<Party, string> = {
  D: "party-d",
  R: "party-r",
  I: "party-i",
  other: "party-other",
};

const PARTY_LABEL: Record<Party, string> = {
  D: "D",
  R: "R",
  I: "I",
  other: "Other",
};

function isElectionsFile(value: unknown): value is ElectionsFile {
  if (typeof value !== "object" || value === null) return false;
  const file = value as ElectionsFile;
  return typeof file.generatedAt === "string" && typeof file.geos === "object" && file.geos !== null;
}

function formatVotes(n: number): string {
  return n.toLocaleString("en-US");
}

function formatShare(votes: number, total: number): string {
  if (total <= 0) return "—";
  return `${((votes / total) * 100).toFixed(1)}%`;
}

function totalVotes(candidates: ElectionCandidate[]): number {
  return candidates.reduce((sum, row) => sum + row.votes, 0);
}

const HEADLINE_SHARE_KEYS = ["D", "other", "R"] as const;
const HEADLINE_SHARE_COLORS = {
  D: "#2166ac",
  R: "#b2182b",
  other: "#6b7280",
} as const;
const HEADLINE_SHARE_LABELS = {
  D: "Democrat",
  R: "Republican",
  other: "Other",
} as const;

const SKIP_HEADLINE_NAME =
  /^(over ?votes?|under ?votes?|registered voters|ballots cast|total( votes| write-?ins?)?|blank|void|not assigned|rejected write-?ins?)$/i;

function headlineRace(offices: YearOffices): ElectionCandidate[] | null {
  const race = offices.president ?? offices.senate;
  return race?.length ? race : null;
}

function partyShares(candidates: ElectionCandidate[]): Record<(typeof HEADLINE_SHARE_KEYS)[number], number> | null {
  const usable = candidates.filter((row) => row.votes > 0 && !SKIP_HEADLINE_NAME.test(row.name.trim()));
  const total = totalVotes(usable);
  if (total <= 0) return null;
  const tallies = { D: 0, R: 0, other: 0 };
  for (const row of usable) {
    if (row.party === "D") tallies.D += row.votes;
    else if (row.party === "R") tallies.R += row.votes;
    else tallies.other += row.votes;
  }
  return {
    D: tallies.D / total,
    R: tallies.R / total,
    other: tallies.other / total,
  };
}

/** OpenElections often stores "Nominee / running mate" as one string. */
function ticketNominee(name: string): string {
  const left = name.split(/\s*(?:w\/|&|\/)\s*/i)[0]?.trim() ?? name;
  const unglued = left.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/,/g, " ");
  const cleaned = unglued
    .replace(/\b(?:jr|sr|ii|iii|iv)\.?$/i, "")
    .replace(/\b(?:jr|sr|ii|iii|iv)\.?\s+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  // "Joseph R. Biden Kamala D. Harris" → "Joseph R. Biden"
  const twoPerson = cleaned.match(
    /^((?:[A-Za-z]+(?:-[A-Za-z]+)?\s+)+[A-Z]\.?\s+[A-Za-z]+(?:-[A-Za-z]+)?)\s+[A-Z]/,
  );
  return twoPerson?.[1]?.trim() ?? cleaned;
}

function headlineLastName(name: string): string {
  const nominee = ticketNominee(name);
  const parts = nominee.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? nominee;
}

function headline(offices: YearOffices): string {
  const race = headlineRace(offices);
  if (race && race.length) {
    const total = totalVotes(race);
    const top = [...race]
      .filter((row) => row.party === "D" || row.party === "R")
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 2);
    if (top.length) {
      return top
        .map((row) => `${headlineLastName(row.name)} ${PARTY_LABEL[row.party]} ${formatShare(row.votes, total)}`)
        .join(" · ");
    }
  }
  if (offices.house?.length) {
    return `${offices.house.length} U.S. House district${offices.house.length === 1 ? "" : "s"}`;
  }
  return "Federal returns";
}

function sourceHref(candidates: ElectionCandidate[]): string | null {
  return candidates.find((row) => row.sourceUrl)?.sourceUrl ?? null;
}

function CandidateTable({ candidates }: { candidates: ElectionCandidate[] }) {
  const total = totalVotes(candidates);
  const href = sourceHref(candidates);
  return (
    <div className="election-cands">
      <table>
        <thead>
          <tr>
            <th scope="col">Candidate</th>
            <th scope="col">Votes</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((row) => (
            <tr key={`${row.party}-${row.name}`}>
              <td>
                <span className={`election-swatch ${PARTY_CLASS[row.party]}`} aria-hidden />
                {row.name}{" "}
                <span className="muted">({PARTY_LABEL[row.party]})</span>
              </td>
              <td>{formatVotes(row.votes)}</td>
              <td>{formatShare(row.votes, total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {href ? (
        <p className="election-source">
          <a href={href} target="_blank" rel="noreferrer">
            Source
          </a>
        </p>
      ) : null}
    </div>
  );
}

function HouseBlock({ districts }: { districts: HouseDistrictResult[] }) {
  return (
    <div className="election-office">
      <h4>U.S. House</h4>
      {districts.map((district) => (
        <div key={district.district} className="election-cd">
          <h5>CD {district.district}</h5>
          <CandidateTable candidates={district.candidates} />
        </div>
      ))}
    </div>
  );
}

function YearBody({ offices }: { offices: YearOffices }) {
  return (
    <div className="election-year__body">
      {offices.president?.length ? (
        <div className="election-office">
          <h4>President</h4>
          <CandidateTable candidates={offices.president} />
        </div>
      ) : null}
      {offices.senate?.length ? (
        <div className="election-office">
          <h4>U.S. Senate</h4>
          <CandidateTable candidates={offices.senate} />
        </div>
      ) : null}
      {offices.house?.length ? <HouseBlock districts={offices.house} /> : null}
    </div>
  );
}

function YearsList({ geo }: { geo: GeographyElections }) {
  const years = [...FEDERAL_ELECTION_YEARS]
    .filter((year) => geo.years[`${year}`])
    .reverse();
  const missingYears = FEDERAL_ELECTION_YEARS.filter((year) => !geo.years[`${year}`]);

  if (years.length === 0) {
    return (
      <p className="empty-card">
        No federal returns for {geo.name} in the loaded file.
      </p>
    );
  }

  return (
    <div className="election-years">
      {years.map((year) => {
        const offices = geo.years[`${year}`];
        if (!offices) return null;
        const shares = partyShares(headlineRace(offices) ?? []);
        return (
          <details key={year} className="election-year">
            <summary>
              <span className="election-year__meta">
                <span className="election-year__year">{year}</span>
                <span className="election-year__head muted">{headline(offices)}</span>
              </span>
              {shares ? (
                <StackBar
                  keys={HEADLINE_SHARE_KEYS}
                  shares={shares}
                  colors={HEADLINE_SHARE_COLORS}
                  labels={HEADLINE_SHARE_LABELS}
                />
              ) : null}
            </summary>
            <YearBody offices={offices} />
          </details>
        );
      })}
      {missingYears.length > 0 ? (
        <p className="muted election-gaps">
          No returns in this file for {missingYears.join(", ")} — not invented.
          OpenElections (and MIT presidential fallback) had no usable county
          rows for those years.
        </p>
      ) : null}
    </div>
  );
}

export function ElectionsCard({ geoId }: ElectionsCardProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch(DATA_PATHS.elections, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) {
          setState({ status: "missing" });
          return;
        }
        if (!res.ok) {
          setState({
            status: "error",
            message: `Could not load elections (${res.status}).`,
          });
          return;
        }
        const data: unknown = await res.json();
        if (!isElectionsFile(data)) {
          setState({
            status: "error",
            message: "elections.json is not a valid ElectionsFile.",
          });
          return;
        }
        setState({ status: "ready", file: data });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Network error";
        setState({ status: "error", message });
      });
    return () => controller.abort();
  }, []);

  if (state.status === "loading") {
    return <p className="muted">Loading prior elections…</p>;
  }
  if (state.status === "missing") {
    return (
      <p className="empty-card">
        No elections file yet. Run <code>npm run ingest:elections</code> to write{" "}
        <code>local/counties/elections.json</code>.
      </p>
    );
  }
  if (state.status === "error") {
    return <p className="empty-card">{state.message}</p>;
  }

  const geo = state.file.geos[geoId];
  if (!geo) {
    const where = geoId === MICHIGAN_STATE_GEO_ID ? "Michigan" : `county ${geoId}`;
    return (
      <p className="empty-card">
        No rows for {where} (<code>{geoId}</code>). Re-run{" "}
        <code>npm run ingest:elections</code>.
      </p>
    );
  }

  return (
    <div className="elections-card">
      <p className="muted elections-card__where">
        {geo.name}
        {geoId === MICHIGAN_STATE_GEO_ID ? "" : " County"}
      </p>
      <YearsList geo={geo} />
    </div>
  );
}
