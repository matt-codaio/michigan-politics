import {
  isFederalElectionYear,
  type ElectionCandidate,
  type ElectionYear,
  type ElectionsFile,
  type FederalOffice,
} from "../types";
import type { CountyFeatureCollection } from "./geojson";

export const NO_DATA_FILL = "#d9d3c7";

export type MarginOffice = Exclude<FederalOffice, "house">;

export interface ChoroplethMetric {
  id: string;
  label: string;
  year: ElectionYear;
  office: MarginOffice;
}

/** Default map mode: 2024 presidential two-party margin (PRD). */
export const DEFAULT_CHOROPLETH_METRIC_ID = "president-2024-margin";

/** Default map modes from the PRD / plan. Extra years appear if elections.json has them. */
export const PREFERRED_METRICS: ChoroplethMetric[] = [
  {
    id: DEFAULT_CHOROPLETH_METRIC_ID,
    label: "2024 Presidential margin",
    year: 2024,
    office: "president",
  },
  {
    id: "senate-2024-margin",
    label: "2024 Senate margin",
    year: 2024,
    office: "senate",
  },
  {
    id: "senate-2022-margin",
    label: "2022 Senate margin",
    year: 2022,
    office: "senate",
  },
];

/** Two-party margin: (D − R) / (D + R). Positive is Democratic. */
export function twoPartyMargin(
  candidates: ElectionCandidate[] | undefined,
): number | null {
  if (!candidates?.length) return null;
  let dem = 0;
  let gop = 0;
  for (const candidate of candidates) {
    if (candidate.party === "D") dem += candidate.votes;
    else if (candidate.party === "R") gop += candidate.votes;
  }
  const total = dem + gop;
  if (total <= 0) return null;
  return (dem - gop) / total;
}

function yearOffices(
  file: ElectionsFile,
  geoId: string,
  year: ElectionYear,
): { president?: ElectionCandidate[]; senate?: ElectionCandidate[] } | undefined {
  return file.geos[geoId]?.years[`${year}`];
}

export function countyMargin(
  file: ElectionsFile,
  geoId: string,
  year: ElectionYear,
  office: MarginOffice,
): number | null {
  const offices = yearOffices(file, geoId, year);
  if (!offices) return null;
  return twoPartyMargin(office === "president" ? offices.president : offices.senate);
}

export function hasAnyMargin(
  file: ElectionsFile,
  year: ElectionYear,
  office: MarginOffice,
): boolean {
  for (const geoId of Object.keys(file.geos)) {
    if (countyMargin(file, geoId, year, office) != null) return true;
  }
  return false;
}

function metricId(office: MarginOffice, year: ElectionYear): string {
  return `${office}-${year}-margin`;
}

function metricLabel(office: MarginOffice, year: ElectionYear): string {
  const race = office === "president" ? "Presidential" : "Senate";
  return `${year} ${race} margin`;
}

export function metricsFromElections(file: ElectionsFile): ChoroplethMetric[] {
  const preferred = PREFERRED_METRICS.filter((metric) =>
    hasAnyMargin(file, metric.year, metric.office),
  );
  const seen = new Set(preferred.map((metric) => metric.id));
  const extras: ChoroplethMetric[] = [];

  const years = new Set<number>();
  for (const geo of Object.values(file.geos)) {
    for (const key of Object.keys(geo.years ?? {})) {
      years.add(Number(key));
    }
  }

  for (const year of [...years].sort((a, b) => b - a)) {
    if (!isFederalElectionYear(year)) continue;
    for (const office of ["president", "senate"] as const) {
      const id = metricId(office, year);
      if (seen.has(id) || !hasAnyMargin(file, year, office)) continue;
      extras.push({ id, label: metricLabel(office, year), year, office });
    }
  }

  return [...preferred, ...extras];
}

export function countyMargins(
  file: ElectionsFile,
  metric: ChoroplethMetric,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const geoId of Object.keys(file.geos)) {
    const value = countyMargin(file, geoId, metric.year, metric.office);
    if (value != null) out[geoId] = value;
  }
  return out;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

const RED = "#b2182b";
const MID = "#f7f7f7";
const BLUE = "#2166ac";
const SEQUENTIAL = ["#edf4fc", "#c6dbef", "#6baed6", "#2171b5", "#08306b"] as const;

export type ColorKind = "margin" | "sequential";
export type ValueFormat = "margin" | "share" | "count";

export interface LegendSwatch {
  color: string;
  label: string;
}

export interface ColorLegend {
  kind: ColorKind;
  format: ValueFormat;
  caption: string;
  swatches: LegendSwatch[];
}

/** ColorBrewer-style RdBu: GOP red ↔ even ↔ Democratic blue, capped at ±40 pts. */
export function marginToColor(margin: number): string {
  const clamped = Math.max(-0.4, Math.min(0.4, margin));
  const t = (clamped + 0.4) / 0.8;
  if (t < 0.5) {
    const u = t / 0.5;
    const [r1, g1, b1] = hexToRgb(RED);
    const [r2, g2, b2] = hexToRgb(MID);
    return rgbToHex(lerp(r1, r2, u), lerp(g1, g2, u), lerp(b1, b2, u));
  }
  const u = (t - 0.5) / 0.5;
  const [r1, g1, b1] = hexToRgb(MID);
  const [r2, g2, b2] = hexToRgb(BLUE);
  return rgbToHex(lerp(r1, r2, u), lerp(g1, g2, u), lerp(b1, b2, u));
}

function quantileEdges(sorted: number[], classes: number): number[] {
  if (sorted.length === 0 || classes < 2) return [];
  const edges: number[] = [];
  for (let i = 1; i < classes; i++) {
    const idx = ((sorted.length - 1) * i) / classes;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const a = sorted[lo] ?? 0;
    const b = sorted[hi] ?? a;
    edges.push(a + (b - a) * (idx - lo));
  }
  return edges;
}

function classIndex(value: number, edges: number[]): number {
  let i = 0;
  while (i < edges.length && value > (edges[i] ?? 0)) i += 1;
  return i;
}

export function formatColorValue(value: number, format: ValueFormat): string {
  if (format === "share") return `${(value * 100).toFixed(1)}%`;
  if (format === "margin") {
    const pts = value * 100;
    const abs = Math.abs(pts).toFixed(0);
    if (pts > 0.05) return `D+${abs}`;
    if (pts < -0.05) return `R+${abs}`;
    return "Even";
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  return Math.round(value).toLocaleString();
}

function sequentialFills(
  values: Record<string, number>,
  format: ValueFormat,
): { fills: Record<string, string>; legend: ColorLegend } {
  const sorted = Object.values(values).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const fills: Record<string, string> = {};
  if (sorted.length === 0) {
    return {
      fills,
      legend: { kind: "sequential", format, caption: "No data", swatches: [] },
    };
  }

  const unique = new Set(sorted.map((n) => n.toPrecision(8)));
  if (unique.size === 1) {
    const color = SEQUENTIAL[2] ?? NO_DATA_FILL;
    for (const [id] of Object.entries(values)) fills[id] = color;
    const only = sorted[0] ?? 0;
    return {
      fills,
      legend: {
        kind: "sequential",
        format,
        caption: formatColorValue(only, format),
        swatches: [{ color, label: formatColorValue(only, format) }],
      },
    };
  }

  const classCount = Math.min(SEQUENTIAL.length, unique.size);
  const edges = quantileEdges(sorted, classCount);
  const mins = Array.from({ length: classCount }, () => Infinity);
  const maxs = Array.from({ length: classCount }, () => -Infinity);

  for (const [id, value] of Object.entries(values)) {
    const idx = Math.min(classIndex(value, edges), classCount - 1);
    fills[id] = SEQUENTIAL[idx] ?? NO_DATA_FILL;
    mins[idx] = Math.min(mins[idx] ?? value, value);
    maxs[idx] = Math.max(maxs[idx] ?? value, value);
  }

  const swatches: LegendSwatch[] = [];
  for (let i = 0; i < classCount; i++) {
    const lo = mins[i];
    const hi = maxs[i];
    if (lo === undefined || hi === undefined || !Number.isFinite(lo) || !Number.isFinite(hi)) {
      continue;
    }
    const label =
      lo === hi
        ? formatColorValue(lo, format)
        : `${formatColorValue(lo, format)}–${formatColorValue(hi, format)}`;
    swatches.push({ color: SEQUENTIAL[i] ?? NO_DATA_FILL, label });
  }

  return {
    fills,
    legend: {
      kind: "sequential",
      format,
      caption: "low → high",
      swatches,
    },
  };
}

export function colorCounties(
  values: Record<string, number> | null,
  kind: ColorKind,
  format: ValueFormat,
): { fills: Record<string, string>; legend: ColorLegend } {
  if (!values || Object.keys(values).length === 0) {
    return {
      fills: {},
      legend: {
        kind,
        format,
        caption: kind === "margin" ? "two-party margin" : "No data",
        swatches:
          kind === "margin"
            ? [
                { color: RED, label: "R" },
                { color: BLUE, label: "D" },
              ]
            : [],
      },
    };
  }

  if (kind === "margin") {
    const fills: Record<string, string> = {};
    for (const [id, value] of Object.entries(values)) fills[id] = marginToColor(value);
    return {
      fills,
      legend: {
        kind: "margin",
        format: "margin",
        caption: "two-party margin",
        swatches: [
          { color: RED, label: "R" },
          { color: BLUE, label: "D" },
        ],
      },
    };
  }

  return sequentialFills(values, format);
}

export function applyFills(
  geojson: CountyFeatureCollection,
  fills: Record<string, string>,
): CountyFeatureCollection {
  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const fill = fills[feature.properties.fips] ?? NO_DATA_FILL;
      return {
        ...feature,
        properties: { ...feature.properties, fill },
      };
    }),
  };
}

export function applyChoropleth(
  geojson: CountyFeatureCollection,
  margins: Record<string, number> | null,
): CountyFeatureCollection {
  const { fills } = colorCounties(margins, "margin", "margin");
  return applyFills(geojson, fills);
}
