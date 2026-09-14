import { useEffect, useState } from "react";
import { DATA_PATHS } from "../types/paths";
import type { MarketSnapshot, MarketsFile } from "../types/markets";
import type { GeographyId } from "../types/geography";

interface MarketsPanelProps {
  /** Selection is statewide for markets; accepted so pop-out uses the same card API. */
  geoId?: GeographyId;
}

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; snapshots: MarketSnapshot[] };

function isSnapshot(value: unknown): value is MarketSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.timestamp === "string" &&
    typeof row.el_sayed_prob === "number" &&
    row.el_sayed_prob >= 0 &&
    row.el_sayed_prob <= 1 &&
    typeof row.rogers_prob === "number" &&
    row.rogers_prob >= 0 &&
    row.rogers_prob <= 1 &&
    row.venue === "polymarket" &&
    typeof row.url === "string" &&
    row.url.length > 0
  );
}

function parseMarketsFile(data: unknown): MarketSnapshot[] | null {
  if (typeof data !== "object" || data === null) return null;
  const snapshots = (data as MarketsFile).snapshots;
  if (!Array.isArray(snapshots)) return null;
  const valid = snapshots.filter(isSnapshot);
  return [...valid].sort((a, b) => {
    const aTime = Date.parse(a.timestamp);
    const bTime = Date.parse(b.timestamp);
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return b.timestamp.localeCompare(a.timestamp);
    }
    return bTime - aTime;
  });
}

function formatPercent(prob: number): string {
  return `${Math.round(prob * 100)}%`;
}

function formatCents(prob: number): string {
  return `${Math.round(prob * 100)}¢`;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function MarketsPanel(_props: MarketsPanelProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch(DATA_PATHS.markets, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        if (res.status === 404) {
          setState({ status: "missing" });
          return;
        }
        if (!res.ok) {
          setState({
            status: "error",
            message: `Could not load markets (${res.status}).`,
          });
          return;
        }
        const data: unknown = await res.json();
        const snapshots = parseMarketsFile(data);
        if (!snapshots) {
          setState({
            status: "error",
            message: "markets.json is not a valid MarketsFile.",
          });
          return;
        }
        if (snapshots.length === 0) {
          setState({ status: "empty" });
          return;
        }
        setState({ status: "ready", snapshots });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Network error";
        setState({ status: "error", message });
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="markets-panel">
      <p className="not-a-poll" role="note">
        Not a poll
      </p>
      <p className="muted markets-panel__disclaimer">
        Trader consensus on Polymarket — not a survey. Never mix into poll
        averages.
      </p>
      <MarketsBody state={state} />
    </div>
  );
}

function MarketsBody({ state }: { state: LoadState }) {
  if (state.status === "loading") {
    return <p className="muted">Loading market snapshot…</p>;
  }

  if (state.status === "missing") {
    return (
      <p className="empty-card">
        No snapshot file yet. Copy{" "}
        <code>fixtures/markets.sample.json</code> to{" "}
        <code>local/markets/markets.json</code> (or add a row there). Served at{" "}
        <code>/data/markets/markets.json</code>.
      </p>
    );
  }

  if (state.status === "empty") {
    return (
      <p className="empty-card">
        <code>local/markets/markets.json</code> has no snapshots. Add a
        Polymarket row (probabilities 0–1) and reload.
      </p>
    );
  }

  if (state.status === "error") {
    return <p className="empty-card">{state.message}</p>;
  }

  const [latest, ...older] = state.snapshots;
  if (!latest) {
    return (
      <p className="empty-card">
        <code>local/markets/markets.json</code> has no snapshots.
      </p>
    );
  }

  return (
    <>
      <SnapshotView snapshot={latest} />
      {older.length > 0 ? (
        <details className="markets-panel__history">
          <summary>Earlier snapshots ({older.length})</summary>
          <ol>
            {older.map((row) => (
              <li key={row.timestamp}>
                {formatTimestamp(row.timestamp)} · El-Sayed{" "}
                {formatPercent(row.el_sayed_prob)} ({formatCents(row.el_sayed_prob)})
                · Rogers {formatPercent(row.rogers_prob)} (
                {formatCents(row.rogers_prob)})
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </>
  );
}

function SnapshotView({ snapshot }: { snapshot: MarketSnapshot }) {
  return (
    <div className="markets-panel__snapshot">
      <div className="markets-panel__probs">
        <div className="markets-panel__candidate markets-panel__candidate--d">
          <p className="markets-panel__name">Abdul El-Sayed (D)</p>
          <p className="markets-panel__prob">
            {formatPercent(snapshot.el_sayed_prob)}
          </p>
          <p className="muted markets-panel__cents">
            {formatCents(snapshot.el_sayed_prob)} implied
          </p>
        </div>
        <div className="markets-panel__candidate markets-panel__candidate--r">
          <p className="markets-panel__name">Mike Rogers (R)</p>
          <p className="markets-panel__prob">
            {formatPercent(snapshot.rogers_prob)}
          </p>
          <p className="muted markets-panel__cents">
            {formatCents(snapshot.rogers_prob)} implied
          </p>
        </div>
      </div>
      <dl className="markets-panel__meta">
        <div>
          <dt>As of</dt>
          <dd>{formatTimestamp(snapshot.timestamp)}</dd>
        </div>
        <div>
          <dt>Venue</dt>
          <dd>{snapshot.venue === "polymarket" ? "Polymarket" : snapshot.venue}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>
            <a href={snapshot.url} target="_blank" rel="noreferrer">
              {snapshot.url.replace(/^https?:\/\//, "")}
            </a>
          </dd>
        </div>
      </dl>
    </div>
  );
}
