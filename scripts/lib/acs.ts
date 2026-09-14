import fs from "node:fs";
import path from "node:path";
import { censusApiKey, DOWNLOAD_DIR } from "./paths.ts";
import { downloadMichiganDat, fetchBuffer } from "./http.ts";
import { intField, parsePipeDat } from "./csv.ts";
import {
  AGE_BUCKETS,
  EDUCATION_KEYS,
  INCOME_BRACKET_KEYS,
  RACE_KEYS,
  type AgeBucket,
  type EducationKey,
  type IncomeBracketKey,
  type RaceKey,
} from "../../src/types/demographics.ts";

export const ACS_YEAR = 2024;
export const ACS_VINTAGE_LABEL = "ACS 2020–2024 5-year";
export const ACS_AS_OF = "2024-12-31";
export const ACS_SOURCE_URL =
  "https://www.census.gov/data/developers/data-sets/acs-5year.html";

const SF_BASE =
  "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData";

export interface AcsGeo {
  geoId: string;
  name?: string;
  ageShares: Record<AgeBucket, number>;
  raceShares: Record<RaceKey, number>;
  educationShares: Record<EducationKey, number>;
  incomeShares: Record<IncomeBracketKey, number>;
}

export async function loadMichiganAcs(): Promise<Map<string, AcsGeo>> {
  const key = censusApiKey();
  if (key) {
    console.log("ACS: Census API (profile DP02/DP03/DP05, 2024 5-year)");
    return loadAcsFromApi(key);
  }
  console.log("ACS: no CENSUS_API_KEY; streaming ACS 2024 5-year table-based SF (B01001/B03002/B15003/B19001)");
  return loadAcsFromSummaryFile();
}

const PROFILE_VARS = [
  "NAME",
  "DP05_0001E",
  "DP05_0019E",
  "DP05_0021E",
  "DP05_0010E",
  "DP05_0011E",
  "DP05_0012E",
  "DP05_0013E",
  "DP05_0014E",
  "DP05_0024E",
  "DP05_0090E",
  "DP05_0096E",
  "DP05_0097E",
  "DP05_0098E",
  "DP05_0099E",
  "DP05_0100E",
  "DP05_0101E",
  "DP05_0102E",
  "DP02_0059E",
  "DP02_0060E",
  "DP02_0061E",
  "DP02_0062E",
  "DP02_0063E",
  "DP02_0064E",
  "DP02_0065E",
  "DP02_0066E",
  "DP03_0051E",
  "DP03_0052E",
  "DP03_0053E",
  "DP03_0054E",
  "DP03_0055E",
  "DP03_0056E",
  "DP03_0057E",
  "DP03_0058E",
  "DP03_0059E",
  "DP03_0060E",
  "DP03_0061E",
] as const;

async function loadAcsFromApi(key: string): Promise<Map<string, AcsGeo>> {
  const get = PROFILE_VARS.join(",");
  const countyUrl = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5/profile?get=${get}&for=county:*&in=state:26&key=${encodeURIComponent(key)}`;
  const stateUrl = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5/profile?get=${get}&for=state:26&key=${encodeURIComponent(key)}`;
  const [counties, state] = await Promise.all([
    censusJson(countyUrl),
    censusJson(stateUrl),
  ]);
  const out = new Map<string, AcsGeo>();
  for (const row of [...state, ...counties]) {
    const geoId =
      row.state && row.county
        ? `${row.state.padStart(2, "0")}${row.county.padStart(3, "0")}`
        : (row.state ?? "").padStart(2, "0");
    out.set(geoId, profileToAcs(geoId, row));
  }
  return out;
}

async function censusJson(url: string): Promise<Record<string, string>[]> {
  const { body } = await fetchBuffer(url);
  const parsed: unknown = JSON.parse(body.toString("utf8"));
  if (!Array.isArray(parsed) || parsed.length < 2) {
    throw new Error(`Unexpected Census API payload for ${url}`);
  }
  const header = parsed[0] as string[];
  return parsed.slice(1).map((line) => {
    const rec: Record<string, string> = {};
    const cells = line as string[];
    for (let i = 0; i < header.length; i += 1) {
      rec[header[i] ?? `c${i}`] = cells[i] ?? "";
    }
    return rec;
  });
}

function profileToAcs(geoId: string, row: Record<string, string>): AcsGeo {
  const total = n(row, "DP05_0001E");
  const under18 = n(row, "DP05_0019E");
  const age18plus = n(row, "DP05_0021E");
  const age25to34 = n(row, "DP05_0010E");
  const age35to44 = n(row, "DP05_0011E");
  const age45to54 = n(row, "DP05_0012E");
  const age55to64 = n(row, "DP05_0013E") + n(row, "DP05_0014E");
  const age65plus = n(row, "DP05_0024E");
  const age18to24 = age18plus - age25to34 - age35to44 - age45to54 - age55to64 - age65plus;
  const ageShares = shares(
    {
      under18,
      age18to24,
      age25to34,
      age35to44,
      age45to54,
      age55to64,
      age65plus,
    },
    total,
    AGE_BUCKETS,
  );

  const raceShares = shares(
    {
      hispanic: n(row, "DP05_0090E"),
      nhWhite: n(row, "DP05_0096E"),
      nhBlack: n(row, "DP05_0097E"),
      nhAian: n(row, "DP05_0098E"),
      nhAsian: n(row, "DP05_0099E"),
      nhNhpi: n(row, "DP05_0100E"),
      nhOther: n(row, "DP05_0101E"),
      nhTwoPlus: n(row, "DP05_0102E"),
    },
    total,
    RACE_KEYS,
  );

  const eduTotal = n(row, "DP02_0059E");
  const educationShares = shares(
    {
      lessThanHs: n(row, "DP02_0060E") + n(row, "DP02_0061E"),
      hsGrad: n(row, "DP02_0062E"),
      someCollege: n(row, "DP02_0063E") + n(row, "DP02_0064E"),
      bachelors: n(row, "DP02_0065E"),
      graduate: n(row, "DP02_0066E"),
    },
    eduTotal,
    EDUCATION_KEYS,
  );

  const hh = n(row, "DP03_0051E");
  const incomeShares = shares(
    {
      lt10k: n(row, "DP03_0052E"),
      from10to15k: n(row, "DP03_0053E"),
      from15to25k: n(row, "DP03_0054E"),
      from25to35k: n(row, "DP03_0055E"),
      from35to50k: n(row, "DP03_0056E"),
      from50to75k: n(row, "DP03_0057E"),
      from75to100k: n(row, "DP03_0058E"),
      from100to150k: n(row, "DP03_0059E"),
      from150to200k: n(row, "DP03_0060E"),
      gte200k: n(row, "DP03_0061E"),
    },
    hh,
    INCOME_BRACKET_KEYS,
  );

  return {
    geoId,
    name: row.NAME,
    ageShares,
    raceShares,
    educationShares,
    incomeShares,
  };
}

async function loadAcsFromSummaryFile(): Promise<Map<string, AcsGeo>> {
  const tables = {
    b01001: path.join(DOWNLOAD_DIR, "acsdt5y2024-b01001-mi.dat"),
    b03002: path.join(DOWNLOAD_DIR, "acsdt5y2024-b03002-mi.dat"),
    b15003: path.join(DOWNLOAD_DIR, "acsdt5y2024-b15003-mi.dat"),
    b19001: path.join(DOWNLOAD_DIR, "acsdt5y2024-b19001-mi.dat"),
  };
  await downloadMichiganDat(`${SF_BASE}/acsdt5y2024-b01001.dat`, tables.b01001);
  await downloadMichiganDat(`${SF_BASE}/acsdt5y2024-b03002.dat`, tables.b03002);
  await downloadMichiganDat(`${SF_BASE}/acsdt5y2024-b15003.dat`, tables.b15003);
  await downloadMichiganDat(`${SF_BASE}/acsdt5y2024-b19001.dat`, tables.b19001);

  const age = indexByGeo(parsePipeDat(fs.readFileSync(tables.b01001, "utf8")));
  const race = indexByGeo(parsePipeDat(fs.readFileSync(tables.b03002, "utf8")));
  const edu = indexByGeo(parsePipeDat(fs.readFileSync(tables.b15003, "utf8")));
  const income = indexByGeo(parsePipeDat(fs.readFileSync(tables.b19001, "utf8")));

  const geos = new Set([...age.keys(), ...race.keys(), ...edu.keys(), ...income.keys()]);
  const out = new Map<string, AcsGeo>();
  for (const geoId of geos) {
    const a = age.get(geoId);
    const r = race.get(geoId);
    const e = edu.get(geoId);
    const i = income.get(geoId);
    if (!a || !r || !e || !i) {
      throw new Error(`ACS SF missing a table for ${geoId}`);
    }
    out.set(geoId, {
      geoId,
      ageShares: ageFromB01001(a),
      raceShares: raceFromB03002(r),
      educationShares: eduFromB15003(e),
      incomeShares: incomeFromB19001(i),
    });
  }
  return out;
}

function indexByGeo(rows: Record<string, string>[]): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  for (const row of rows) {
    const geoId = geoIdFromAcs(row.GEO_ID ?? "");
    if (geoId) map.set(geoId, row);
  }
  return map;
}

function geoIdFromAcs(geo: string): string | null {
  if (geo === "0400000US26") return "26";
  const m = /^0500000US(26\d{3})$/.exec(geo);
  return m?.[1] ?? null;
}

function e(row: Record<string, string>, table: string, cell: number): number {
  const padded = String(cell).padStart(3, "0");
  const key = `${table}_E${padded}`;
  const alt = `${table}_${padded}E`;
  if (row[key] !== undefined) return intField(row, key);
  if (row[alt] !== undefined) return intField(row, alt);
  throw new Error(`No estimate column ${key} / ${alt}`);
}

function ageFromB01001(row: Record<string, string>): Record<AgeBucket, number> {
  const male = (cells: number[]): number =>
    cells.reduce((sum, cell) => sum + e(row, "B01001", cell), 0);
  const both = (maleCells: number[]): number =>
    male(maleCells) + male(maleCells.map((c) => c + 24));
  const total = e(row, "B01001", 1);
  return shares(
    {
      under18: both([3, 4, 5, 6]),
      age18to24: both([7, 8, 9, 10]),
      age25to34: both([11, 12]),
      age35to44: both([13, 14]),
      age45to54: both([15, 16]),
      age55to64: both([17, 18, 19]),
      age65plus: both([20, 21, 22, 23, 24, 25]),
    },
    total,
    AGE_BUCKETS,
  );
}

function raceFromB03002(row: Record<string, string>): Record<RaceKey, number> {
  const total = e(row, "B03002", 1);
  return shares(
    {
      hispanic: e(row, "B03002", 12),
      nhWhite: e(row, "B03002", 3),
      nhBlack: e(row, "B03002", 4),
      nhAian: e(row, "B03002", 5),
      nhAsian: e(row, "B03002", 6),
      nhNhpi: e(row, "B03002", 7),
      nhOther: e(row, "B03002", 8),
      nhTwoPlus: e(row, "B03002", 9),
    },
    total,
    RACE_KEYS,
  );
}

function eduFromB15003(row: Record<string, string>): Record<EducationKey, number> {
  const total = e(row, "B15003", 1);
  const has25 = hasCell(row, "B15003", 25);
  const counts = has25
    ? {
        lessThanHs: sumCells(row, "B15003", range(2, 16)),
        hsGrad: sumCells(row, "B15003", [17, 18]),
        someCollege: sumCells(row, "B15003", [19, 20, 21]),
        bachelors: e(row, "B15003", 22),
        graduate: sumCells(row, "B15003", [23, 24, 25]),
      }
    : {
        lessThanHs: sumCells(row, "B15003", range(2, 9)),
        hsGrad: sumCells(row, "B15003", [10, 11]),
        someCollege: sumCells(row, "B15003", [12, 13, 14]),
        bachelors: e(row, "B15003", 15),
        graduate: sumCells(row, "B15003", [16, 17, 18]),
      };
  return shares(counts, total, EDUCATION_KEYS);
}

function incomeFromB19001(row: Record<string, string>): Record<IncomeBracketKey, number> {
  const total = e(row, "B19001", 1);
  return shares(
    {
      lt10k: e(row, "B19001", 2),
      from10to15k: e(row, "B19001", 3),
      from15to25k: e(row, "B19001", 4) + e(row, "B19001", 5),
      from25to35k: e(row, "B19001", 6) + e(row, "B19001", 7),
      from35to50k: e(row, "B19001", 8) + e(row, "B19001", 9) + e(row, "B19001", 10),
      from50to75k: e(row, "B19001", 11) + e(row, "B19001", 12),
      from75to100k: e(row, "B19001", 13),
      from100to150k: e(row, "B19001", 14) + e(row, "B19001", 15),
      from150to200k: e(row, "B19001", 16),
      gte200k: e(row, "B19001", 17),
    },
    total,
    INCOME_BRACKET_KEYS,
  );
}

function hasCell(row: Record<string, string>, table: string, cell: number): boolean {
  const padded = String(cell).padStart(3, "0");
  return row[`${table}_E${padded}`] !== undefined || row[`${table}_${padded}E`] !== undefined;
}

function sumCells(row: Record<string, string>, table: string, cells: number[]): number {
  return cells.reduce((sum, cell) => sum + e(row, table, cell), 0);
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
}

function n(row: Record<string, string>, key: string): number {
  return intField(row, key);
}

function shares<K extends string>(
  counts: Record<K, number>,
  total: number,
  keys: readonly K[],
): Record<K, number> {
  if (total <= 0) throw new Error("ACS denominator is 0");
  const out = {} as Record<K, number>;
  for (const key of keys) {
    out[key] = counts[key] / total;
  }
  return out;
}
