/**
 * Download Census cartographic-boundary county polygons for Michigan and write
 * local/counties/counties.geojson (gitignored).
 *
 * These are shoreline-clipped (Great Lakes stay water), unlike TIGER/Line.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { open as openShapefile } from "shapefile";

const MI_STATE = "26";
const EXPECTED_COUNTIES = 83;
const UA = "michigan-politics-volunteer-dashboard/0.1 (public civic data ingest)";

const CARTOGRAPHIC_COUNTIES =
  "https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_county_5m.zip";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL = path.join(ROOT, "local");
const DOWNLOADS = path.join(LOCAL, "downloads");
const COUNTIES_DIR = path.join(LOCAL, "counties");
const ZIP_PATH = path.join(DOWNLOADS, "cb_2023_us_county_5m.zip");
const SHP_DIR = path.join(DOWNLOADS, "cb_2023_us_county_5m");
const SHP_PATH = path.join(SHP_DIR, "cb_2023_us_county_5m.shp");
const OUT_PATH = path.join(COUNTIES_DIR, "counties.geojson");

interface GeoJsonFeature {
  type: "Feature";
  properties?: Record<string, unknown> | null;
  geometry: unknown;
}

interface GeoJsonFC {
  type: "FeatureCollection";
  features?: GeoJsonFeature[];
}

function isCountyFips(id: string): boolean {
  return /^26\d{3}$/.test(id);
}

function walkPositions(geom: unknown, visit: (x: number, y: number) => void): void {
  if (!geom || typeof geom !== "object") return;
  const g = geom as { type?: string; coordinates?: unknown };
  const coords = g.coordinates;
  if (!coords) return;
  const walk = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && typeof node[0] === "number" && typeof node[1] === "number") {
      visit(node[0], node[1]);
      return;
    }
    for (const child of node) walk(child);
  };
  walk(coords);
}

function computeBbox(features: GeoJsonFeature[]): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const feature of features) {
    walkPositions(feature.geometry, (x, y) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
  }
  if (!Number.isFinite(minX)) {
    throw new Error("No coordinates in downloaded GeoJSON");
  }
  return [minX, minY, maxX, maxY];
}

function countyName(props: Record<string, unknown>): string {
  const base = props.BASENAME ?? props.basename;
  if (typeof base === "string" && base.trim()) return base.trim();
  const name = props.NAME ?? props.name;
  if (typeof name === "string" && name.trim()) {
    return name.replace(/\s+County$/i, "").trim();
  }
  return "";
}

function countyFips(props: Record<string, unknown>): string {
  const geoid = props.GEOID ?? props.geoid ?? props.fips;
  if (typeof geoid === "string" && geoid.trim()) return geoid.trim();
  if (typeof geoid === "number") return String(geoid).padStart(5, "0");
  const state = String(props.STATE ?? props.STATEFP ?? "");
  const county = String(props.COUNTY ?? props.COUNTYFP ?? "");
  if (state && county) return state.padStart(2, "0") + county.padStart(3, "0");
  return "";
}

function normalize(raw: GeoJsonFC): {
  type: "FeatureCollection";
  generatedAt: string;
  sourceUrl: string;
  source: string;
  bbox: [number, number, number, number];
  features: Array<{
    type: "Feature";
    properties: { fips: string; name: string };
    geometry: unknown;
  }>;
} {
  const incoming = raw.features ?? [];
  const features: Array<{
    type: "Feature";
    properties: { fips: string; name: string };
    geometry: unknown;
  }> = [];
  const seen = new Set<string>();

  for (const feature of incoming) {
    if (!feature || feature.type !== "Feature" || !feature.geometry) continue;
    const props = feature.properties ?? {};
    const fips = countyFips(props);
    const name = countyName(props);
    if (!isCountyFips(fips) || !name) continue;
    if (seen.has(fips)) continue;
    seen.add(fips);
    features.push({
      type: "Feature",
      properties: { fips, name },
      geometry: feature.geometry,
    });
  }

  features.sort((a, b) => a.properties.name.localeCompare(b.properties.name));

  if (features.length !== EXPECTED_COUNTIES) {
    throw new Error(
      `Expected ${EXPECTED_COUNTIES} Michigan counties, got ${features.length}`,
    );
  }

  return {
    type: "FeatureCollection",
    generatedAt: new Date().toISOString(),
    sourceUrl: CARTOGRAPHIC_COUNTIES,
    source: "U.S. Census Bureau cartographic boundary counties 5m, 2023 (Michigan, STATEFP=26)",
    bbox: computeBbox(features),
    features,
  };
}

async function downloadZip(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    throw new Error(`Download failed ${res.status} ${res.statusText} for ${url}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  fs.writeFileSync(dest, bytes);
}

async function readMichiganCounties(shpPath: string): Promise<GeoJsonFC> {
  const source = await openShapefile(shpPath);
  const features: GeoJsonFeature[] = [];
  for (;;) {
    const { done, value } = await source.read();
    if (done) break;
    if (!value || value.type !== "Feature") continue;
    const props = (value.properties ?? {}) as Record<string, unknown>;
    const state = String(props.STATEFP ?? props.STATE ?? "");
    if (state.padStart(2, "0") !== MI_STATE) continue;
    features.push(value as GeoJsonFeature);
  }
  return { type: "FeatureCollection", features };
}

async function main(): Promise<void> {
  fs.mkdirSync(DOWNLOADS, { recursive: true });
  fs.mkdirSync(COUNTIES_DIR, { recursive: true });

  console.log("Downloading Census cartographic county shapefile (shoreline-clipped)…");
  await downloadZip(CARTOGRAPHIC_COUNTIES, ZIP_PATH);
  fs.rmSync(SHP_DIR, { recursive: true, force: true });
  fs.mkdirSync(SHP_DIR, { recursive: true });
  execFileSync("unzip", ["-o", "-q", ZIP_PATH, "-d", SHP_DIR]);
  if (!fs.existsSync(SHP_PATH)) {
    throw new Error(`Unzip succeeded but missing ${SHP_PATH}`);
  }

  const raw = await readMichiganCounties(SHP_PATH);
  console.log(`Read ${raw.features?.length ?? 0} Michigan counties from shapefile`);

  const processed = normalize(raw);
  fs.writeFileSync(OUT_PATH, JSON.stringify(processed));
  console.log(
    `Wrote ${path.relative(ROOT, OUT_PATH)} (${processed.features.length} counties, bbox ${processed.bbox.map((n) => n.toFixed(2)).join(", ")})`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
