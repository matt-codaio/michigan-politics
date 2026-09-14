import path from "node:path";
import fs from "node:fs";
import { downloadFile } from "./http.ts";
import { DOWNLOAD_DIR } from "./paths.ts";
import {
  countyDisplayName,
  intField,
  parseCsv,
  padFips,
} from "./csv.ts";
import type { PopulationPoint } from "../../src/types/demographics.ts";

const PEP_00_10 =
  "https://www2.census.gov/programs-surveys/popest/datasets/2000-2010/intercensal/county/co-est00int-tot.csv";
const PEP_10_20 =
  "https://www2.census.gov/programs-surveys/popest/datasets/2010-2020/intercensal/county/asrh/cc-est2020int-alldata-26.csv";
const PEP_20_25 =
  "https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/counties/totals/co-est2025-alldata.csv";

export const PEP_SOURCE_URL =
  "https://www.census.gov/programs-surveys/popest.html";
export const PEP_VINTAGE_LABEL = "PEP 2000–2010 intercensal + 2010–2020 intercensal + Vintage 2025";
export const PEP_AS_OF = "2025-07-01";

export interface PepGeo {
  geoId: string;
  name: string;
  population: PopulationPoint[];
}

/** July 1 resident estimates, 2000–2025. Later vintages win on overlap years. */
export async function loadMichiganPep(): Promise<Map<string, PepGeo>> {
  const file00 = path.join(DOWNLOAD_DIR, "co-est00int-tot.csv");
  const file10 = path.join(DOWNLOAD_DIR, "cc-est2020int-alldata-26.csv");
  const file25 = path.join(DOWNLOAD_DIR, "co-est2025-alldata.csv");
  await downloadFile(PEP_00_10, file00);
  await downloadFile(PEP_10_20, file10);
  await downloadFile(PEP_20_25, file25);

  const byGeo = new Map<string, PepGeo>();

  const add = (geoId: string, name: string, year: number, count: number): void => {
    let geo = byGeo.get(geoId);
    if (!geo) {
      geo = { geoId, name, population: [] };
      byGeo.set(geoId, geo);
    }
    geo.name = name;
    const existing = geo.population.find((p) => p.year === year);
    if (existing) existing.count = count;
    else geo.population.push({ year, count });
  };

  for (const row of parseCsv(fs.readFileSync(file00, "utf8"))) {
    if (!isMichigan(row.STATE)) continue;
    const geoId = padFips(row.STATE ?? "", row.COUNTY ?? "");
    const name =
      geoId === "26" ? "Michigan" : countyDisplayName(row.CTYNAME ?? row.STNAME ?? geoId);
    for (let year = 2000; year <= 2009; year += 1) {
      add(geoId, name, year, intField(row, `POPESTIMATE${year}`));
    }
  }

  const county2010s = new Map<string, { name: string; years: Map<number, number> }>();
  for (const row of parseCsv(fs.readFileSync(file10, "utf8"))) {
    if ((row.AGEGRP ?? "").trim() !== "0") continue;
    const yearCode = Number(row.YEAR);
    const calendarYear = INT_YEAR[yearCode];
    if (calendarYear === undefined) continue;
    const geoId = padFips(row.STATE ?? "26", row.COUNTY ?? "");
    const name = countyDisplayName(row.CTYNAME ?? geoId);
    let rec = county2010s.get(geoId);
    if (!rec) {
      rec = { name, years: new Map() };
      county2010s.set(geoId, rec);
    }
    rec.years.set(calendarYear, intField(row, "TOT_POP"));
  }
  if (county2010s.size !== 83) {
    throw new Error(`2010–2020 intercensal: expected 83 MI counties, got ${county2010s.size}`);
  }
  const stateYears = new Map<number, number>();
  for (const rec of county2010s.values()) {
    for (const [year, count] of rec.years) {
      stateYears.set(year, (stateYears.get(year) ?? 0) + count);
    }
  }
  for (const [geoId, rec] of county2010s) {
    for (const [year, count] of rec.years) add(geoId, rec.name, year, count);
  }
  for (const [year, count] of stateYears) add("26", "Michigan", year, count);

  for (const row of parseCsv(fs.readFileSync(file25, "utf8"))) {
    if (!isMichigan(row.STATE)) continue;
    const geoId = padFips(row.STATE ?? "", row.COUNTY ?? "");
    const name =
      geoId === "26" ? "Michigan" : countyDisplayName(row.CTYNAME ?? row.STNAME ?? geoId);
    for (let year = 2020; year <= 2025; year += 1) {
      add(geoId, name, year, intField(row, `POPESTIMATE${year}`));
    }
  }

  for (const geo of byGeo.values()) {
    geo.population.sort((a, b) => a.year - b.year);
    const years = geo.population.map((p) => p.year);
    if (years[0] !== 2000 || years[years.length - 1] !== 2025) {
      throw new Error(`${geo.geoId} PEP series is not 2000–2025 (${years[0]}–${years.at(-1)})`);
    }
  }
  if (!byGeo.has("26") || byGeo.size !== 84) {
    throw new Error(`PEP geos: expected 84 (state+83 counties), got ${byGeo.size}`);
  }
  return byGeo;
}

/** YEAR codes 2–11 are July 1 2010–2019 (CC-EST2020INT-ALLDATA). Skip April 1 census endpoints. */
const INT_YEAR: Record<number, number> = {
  2: 2010,
  3: 2011,
  4: 2012,
  5: 2013,
  6: 2014,
  7: 2015,
  8: 2016,
  9: 2017,
  10: 2018,
  11: 2019,
};

function isMichigan(state: string | undefined): boolean {
  const n = Number(state);
  return n === 26;
}
