import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { DOWNLOAD_DIR, DEMOGRAPHICS_PATH, ensureDirs, loadDotEnv } from "./lib/paths.ts";
import { downloadFile } from "./lib/http.ts";
import { parseCsv } from "./lib/csv.ts";
import type { DemographicsFile, RaceKey } from "../src/types/demographics.ts";

export const CVAP_ZIP_URL =
  "https://www2.census.gov/programs-surveys/decennial/rdo/datasets/2024/2024-cvap/CVAP_2020-2024_ACS_csv_files.zip";
export const CVAP_SOURCE_URL =
  "https://www.census.gov/programs-surveys/decennial-census/about/voting-rights/cvap/2020-2024-CVAP.html";
export const CVAP_VINTAGE_LABEL = "CVAP 2020–2024 (ACS 5-year special tabulation)";
export const CVAP_AS_OF = "2024-12-31";

export interface CvapGeo {
  geoId: string;
  name: string;
  cvapTotal: number;
  cvapByRace: Record<RaceKey, number>;
}

export async function loadMichiganCvap(): Promise<Map<string, CvapGeo>> {
  ensureDirs();
  const zipPath = path.join(DOWNLOAD_DIR, "CVAP_2020-2024_ACS_csv_files.zip");
  const extractDir = path.join(DOWNLOAD_DIR, "cvap-2020-2024");
  await downloadFile(CVAP_ZIP_URL, zipPath);
  fs.mkdirSync(extractDir, { recursive: true });

  const members = execFileSync("unzip", ["-Z", "-1", zipPath], {
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const countyMember = members.find((m) => /(?:^|\/)County\.csv$/i.test(m));
  const stateMember = members.find((m) => /(?:^|\/)State\.csv$/i.test(m));
  if (!countyMember || !stateMember) {
    throw new Error(`CVAP zip missing County.csv / State.csv: ${members.slice(0, 20).join(", ")}`);
  }
  const countyPath = path.join(extractDir, "County.csv");
  const statePath = path.join(extractDir, "State.csv");
  if (!fs.existsSync(countyPath) || !fs.existsSync(statePath)) {
    execFileSync("unzip", ["-o", zipPath, countyMember, stateMember, "-d", extractDir], {
      stdio: "pipe",
    });
    // Flatten if nested.
    flattenExtract(extractDir, "County.csv");
    flattenExtract(extractDir, "State.csv");
  }

  const out = new Map<string, Draft>();
  ingestCvapCsv(fs.readFileSync(statePath, "utf8"), out, "state");
  ingestCvapCsv(fs.readFileSync(countyPath, "utf8"), out, "county");

  const ready = new Map<string, CvapGeo>();
  for (const [geoId, draft] of out) {
    if (!draft.total) throw new Error(`CVAP missing Total for ${geoId}`);
    ready.set(geoId, {
      geoId,
      name: draft.name,
      cvapTotal: draft.total,
      cvapByRace: { ...emptyRace(), ...draft.byRace },
    });
  }
  if (!ready.has("26") || ready.size !== 84) {
    throw new Error(`CVAP geos: expected 84, got ${ready.size}`);
  }
  return ready;
}

interface Draft {
  name: string;
  total?: number;
  byRace: Partial<Record<RaceKey, number>>;
}

function ingestCvapCsv(
  text: string,
  out: Map<string, Draft>,
  kind: "state" | "county",
): void {
  for (const row of parseCsv(text)) {
    const geoId = cvapGeoId(row, kind);
    if (!geoId) continue;
    const title = norm(cvapField(row, ["lntitle", "LNTITLE", "lnTitle"]));
    const est = cvapEstimate(row);
    const name = countyName(row);
    let draft = out.get(geoId);
    if (!draft) {
      draft = { name, byRace: {} };
      out.set(geoId, draft);
    }
    draft.name = name || draft.name;
    const key = mapTitle(title);
    if (key === "total") draft.total = est;
    else if (key) draft.byRace[key] = (draft.byRace[key] ?? 0) + est;
  }
}

function cvapField(row: Record<string, string>, names: string[]): string {
  for (const name of names) {
    if (row[name] !== undefined) return row[name] ?? "";
    const found = Object.keys(row).find((k) => k.toLowerCase() === name.toLowerCase());
    if (found) return row[found] ?? "";
  }
  return "";
}

function cvapEstimate(row: Record<string, string>): number {
  const raw = cvapField(row, ["cvap_est", "CVAP_EST", "CVAPEST"]);
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) throw new Error(`Bad CVAP_EST: ${raw}`);
  return n;
}

function cvapGeoId(row: Record<string, string>, kind: "state" | "county"): string | null {
  const geoid = cvapField(row, ["geoid", "GEOID", "GEO_ID"]);
  if (kind === "state") {
    const m = geoid.match(/04000+US26$/i) || geoid.match(/^26$/);
    return m ? "26" : null;
  }
  const m = geoid.match(/05000+US(26\d{3})$/i);
  if (m?.[1]) return m[1];
  if (/^26\d{3}$/.test(geoid)) return geoid;
  return null;
}

function countyName(row: Record<string, string>): string {
  const raw = cvapField(row, ["geoname", "GEONAME", "NAME"]);
  const county = raw.split(",")[0] ?? raw;
  if (/^Michigan$/i.test(county.trim())) return "Michigan";
  return county.replace(/\s+County$/i, "").trim();
}

function norm(title: string): string {
  return title.toLowerCase().replace(/:/g, "").replace(/\s+/g, " ").trim();
}

function mapTitle(title: string): RaceKey | "total" | null {
  if (title === "total") return "total";
  if (title === "not hispanic or latino") return null;
  if (title === "hispanic or latino") return "hispanic";
  if (title === "white alone") return "nhWhite";
  if (title === "black or african american alone") return "nhBlack";
  if (
    title === "american indian or alaska native alone" ||
    title === "american indian and alaska native alone"
  ) {
    return "nhAian";
  }
  if (title === "asian alone") return "nhAsian";
  if (title === "native hawaiian or other pacific islander alone") return "nhNhpi";
  if (title === "some other race alone") return "nhOther";
  if (
    title.includes("two or more") ||
    title.includes(" and white") ||
    title.includes(" and black")
  ) {
    return "nhTwoPlus";
  }
  return null;
}

function emptyRace(): Record<RaceKey, number> {
  return {
    hispanic: 0,
    nhWhite: 0,
    nhBlack: 0,
    nhAian: 0,
    nhAsian: 0,
    nhNhpi: 0,
    nhTwoPlus: 0,
    nhOther: 0,
  };
}

function flattenExtract(dir: string, basename: string): void {
  const dest = path.join(dir, basename);
  if (fs.existsSync(dest)) return;
  const found = findFile(dir, basename);
  if (found && found !== dest) fs.copyFileSync(found, dest);
}

function findFile(dir: string, basename: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === basename) return full;
    if (entry.isDirectory()) {
      const nested = findFile(full, basename);
      if (nested) return nested;
    }
  }
  return null;
}

async function main(): Promise<void> {
  loadDotEnv();
  ensureDirs();
  const cvap = await loadMichiganCvap();
  const staging = path.join(DOWNLOAD_DIR, "cvap-mi.json");
  const payload = {
    generatedAt: new Date().toISOString(),
    vintageLabel: CVAP_VINTAGE_LABEL,
    sourceUrl: CVAP_SOURCE_URL,
    geos: Object.fromEntries(cvap),
  };
  fs.writeFileSync(staging, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${cvap.size} CVAP geos → ${staging}`);

  if (fs.existsSync(DEMOGRAPHICS_PATH)) {
    const file = JSON.parse(fs.readFileSync(DEMOGRAPHICS_PATH, "utf8")) as DemographicsFile;
    let updated = 0;
    for (const [geoId, row] of cvap) {
      const geo = file.geos[geoId];
      if (!geo) continue;
      geo.cvapTotal = row.cvapTotal;
      geo.cvapByRace = row.cvapByRace;
      geo.vintages = {
        ...geo.vintages,
        cvap: {
          asOf: CVAP_AS_OF,
          sourceUrl: CVAP_SOURCE_URL,
          vintageLabel: CVAP_VINTAGE_LABEL,
        },
      };
      updated += 1;
    }
    file.generatedAt = new Date().toISOString();
    fs.writeFileSync(DEMOGRAPHICS_PATH, `${JSON.stringify(file)}\n`);
    console.log(`Merged CVAP into ${DEMOGRAPHICS_PATH} (${updated} geos).`);
  } else {
    console.log("No demographics.json yet — run `npm run ingest:census` to assemble the full bundle.");
  }
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
