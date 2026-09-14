/**
 * Download public Michigan federal general returns (2000–2024 even years)
 * and write local/counties/elections.json.
 *
 * Prefer OpenElections county CSVs; fall back to statewide/per-county precinct
 * files, then MIT Election Lab county presidential returns. MVIC is the
 * per-contest source URL (QA). Vote totals are never invented.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FEDERAL_ELECTION_YEARS,
  type ElectionCandidate,
  type ElectionYear,
  type ElectionsFile,
  type FederalOffice,
  type GeographyElections,
  type HouseDistrictResult,
  type Party,
  type YearOffices,
} from "../src/types/elections.ts";
import { MICHIGAN_STATE_GEO_ID } from "../src/types/geography.ts";

const UA = "michigan-politics-volunteer-dashboard/0.1 (public civic data ingest)";
const OE_RAW =
  "https://raw.githubusercontent.com/openelections/openelections-data-mi/master/";
const OE_TREE =
  "https://api.github.com/repos/openelections/openelections-data-mi/git/trees/master?recursive=1";
const MIT_DOI = "https://doi.org/10.7910/DVN/VOQCHQ";
const MIT_FILE_ID = 13573089;
const MVIC = "https://mvic.sos.state.mi.us/votehistory/";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL = path.join(ROOT, "local");
const DOWNLOADS = path.join(LOCAL, "downloads");
const OE_DIR = path.join(DOWNLOADS, "openelections");
const MIT_DIR = path.join(DOWNLOADS, "mit");
const OUT_PATH = path.join(LOCAL, "counties", "elections.json");

const SENATE_YEARS = new Set<number>([
  2000, 2002, 2006, 2008, 2012, 2014, 2018, 2020, 2024,
]);
const PRESIDENT_YEARS = new Set<number>([2000, 2004, 2008, 2012, 2016, 2020, 2024]);

const GENERAL_DATE: Record<number, string> = {
  2000: "20001107",
  2002: "20021105",
  2004: "20041102",
  2006: "20061107",
  2008: "20081104",
  2010: "20101102",
  2012: "20121106",
  2014: "20141104",
  2016: "20161108",
  2018: "20181106",
  2020: "20201103",
  2022: "20221108",
  2024: "20241105",
};

const MI_COUNTIES: ReadonlyArray<{ fips: string; name: string }> = [
  ["26001", "Alcona"],
  ["26003", "Alger"],
  ["26005", "Allegan"],
  ["26007", "Alpena"],
  ["26009", "Antrim"],
  ["26011", "Arenac"],
  ["26013", "Baraga"],
  ["26015", "Barry"],
  ["26017", "Bay"],
  ["26019", "Benzie"],
  ["26021", "Berrien"],
  ["26023", "Branch"],
  ["26025", "Calhoun"],
  ["26027", "Cass"],
  ["26029", "Charlevoix"],
  ["26031", "Cheboygan"],
  ["26033", "Chippewa"],
  ["26035", "Clare"],
  ["26037", "Clinton"],
  ["26039", "Crawford"],
  ["26041", "Delta"],
  ["26043", "Dickinson"],
  ["26045", "Eaton"],
  ["26047", "Emmet"],
  ["26049", "Genesee"],
  ["26051", "Gladwin"],
  ["26053", "Gogebic"],
  ["26055", "Grand Traverse"],
  ["26057", "Gratiot"],
  ["26059", "Hillsdale"],
  ["26061", "Houghton"],
  ["26063", "Huron"],
  ["26065", "Ingham"],
  ["26067", "Ionia"],
  ["26069", "Iosco"],
  ["26071", "Iron"],
  ["26073", "Isabella"],
  ["26075", "Jackson"],
  ["26077", "Kalamazoo"],
  ["26079", "Kalkaska"],
  ["26081", "Kent"],
  ["26083", "Keweenaw"],
  ["26085", "Lake"],
  ["26087", "Lapeer"],
  ["26089", "Leelanau"],
  ["26091", "Lenawee"],
  ["26093", "Livingston"],
  ["26095", "Luce"],
  ["26097", "Mackinac"],
  ["26099", "Macomb"],
  ["26101", "Manistee"],
  ["26103", "Marquette"],
  ["26105", "Mason"],
  ["26107", "Mecosta"],
  ["26109", "Menominee"],
  ["26111", "Midland"],
  ["26113", "Missaukee"],
  ["26115", "Monroe"],
  ["26117", "Montcalm"],
  ["26119", "Montmorency"],
  ["26121", "Muskegon"],
  ["26123", "Newaygo"],
  ["26125", "Oakland"],
  ["26127", "Oceana"],
  ["26129", "Ogemaw"],
  ["26131", "Ontonagon"],
  ["26133", "Osceola"],
  ["26135", "Oscoda"],
  ["26137", "Otsego"],
  ["26139", "Ottawa"],
  ["26141", "Presque Isle"],
  ["26143", "Roscommon"],
  ["26145", "Saginaw"],
  ["26147", "St. Clair"],
  ["26149", "St. Joseph"],
  ["26151", "Sanilac"],
  ["26153", "Schoolcraft"],
  ["26155", "Shiawassee"],
  ["26157", "Tuscola"],
  ["26159", "Van Buren"],
  ["26161", "Washtenaw"],
  ["26163", "Wayne"],
  ["26165", "Wexford"],
].map(([fips, name]) => ({ fips, name }));

const SKIP_PRECINCT = /^(total|county total|grand total|canvass)$/i;
const SKIP_NAME =
  /^(over votes?|under votes?|registered voters|ballots cast|total|blank|void)$/i;

const PRES_LAST: Record<string, Party> = {
  gore: "D",
  kerry: "D",
  obama: "D",
  clinton: "D",
  biden: "D",
  harris: "D",
  bush: "R",
  mccain: "R",
  romney: "R",
  trump: "R",
};

const SENATE_LAST: Record<string, Party> = {
  stabenow: "D",
  levin: "D",
  peters: "D",
  slotkin: "D",
  abraham: "R",
  raczkowski: "R",
  bouchard: "R",
  hoogendyk: "R",
  hoekstra: "R",
  land: "R",
  james: "R",
  rogers: "R",
};

/** Full-name D/R labels for OpenElections rows with a blank party column (2000–2006). */
const KNOWN_DR: Record<string, Party> = {
  "bart stupak": "D",
  "james a barcia": "D",
  "jennie crittendon": "D",
  "dianne byrum": "D",
  "dale e kildee": "D",
  "david e bonior": "D",
  "sander levin": "D",
  "lynn nancy rivers": "D",
  "john conyers jr": "D",
  "carolyn cheeks kilpatrick": "D",
  "john d dingell": "D",
  "bob shrauger": "D",
  "timothy w steele": "D",
  "lawrence d hollenbeck": "D",
  "matthew frumin": "D",
  "jeffrey a wrisley": "D",
  "kathryn d lynnes": "D",
  "gary c giguere jr": "D",
  "mike simpson": "D",
  "frank mcalpine": "D",
  "david fink": "D",
  "carl j marlinga": "D",
  "kevin kelley": "D",
  "kimon kotos": "D",
  "peter h hickey": "D",
  "mike huckleberry": "D",
  "scott elliott": "D",
  "sharon marie renier": "D",
  "robert d alexander": "D",
  "steven w reifman": "D",
  "rob casey": "D",
  "phillip s truran": "D",
  "james r rinck": "D",
  "kim clark": "D",
  "jim marcinkowski": "D",
  "nancy skinner": "D",
  "robert denison": "D",
  "tony trupiano": "D",
  "chuck yob": "R",
  "peter hoekstra": "R",
  "vernon ehlers": "R",
  "vernon j ehlers": "R",
  "dave camp": "R",
  "ronald g actis": "R",
  "fred upton": "R",
  "nick smith": "R",
  "mike rogers": "R",
  "grant garrett": "R",
  "tom turner": "R",
  "joe knollenberg": "R",
  "bart baron": "R",
  "carl f berry": "R",
  "william a ashe": "R",
  "chrysanthea d boyd fields": "R",
  "william morse": "R",
  "don hooper": "R",
  "harvey r dean": "R",
  "dave stone": "R",
  "martin kaltenbach": "R",
  "myrah kirkwood": "R",
  "joe schwarz": "R",
  "candice s miller": "R",
  "thaddeus g mccotter": "R",
  "randell j shafer": "R",
  "cynthia cassell": "R",
  "veronica pedraza": "R",
  "dawn anne reamer": "R",
  "eric j klammer": "R",
  "tim walberg": "R",
  "chad miles": "R",
  "debbie stabenow": "D",
  "carl levin": "D",
  "spence abraham": "R",
  "spencer abraham": "R",
  "andrew raczkowski": "R",
  "michael bouchard": "R",
};

interface ParsedRow {
  county: string;
  precinct: string;
  office: FederalOffice;
  district: number | null;
  candidate: string;
  partyRaw: string;
  votes: number;
}

interface CandAgg {
  name: string;
  party: Party;
  votes: number;
  sourceUrl: string;
}

type OfficeBucket = "president" | "senate" | `house:${number}`;

/** geoId -> year -> office bucket -> nameKey -> aggregate */
type Store = Map<string, Map<number, Map<OfficeBucket, Map<string, CandAgg>>>>;

function countyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/county/g, "")
    .replace(/\bsaint\b/g, "st")
    .replace(/\bgd\.?\s*/g, "grand ")
    .replace(/joseph'?s\b/g, "joseph")
    .replace(/[^a-z]/g, "");
}

const COUNTY_BY_KEY = new Map(
  MI_COUNTIES.map((c) => [countyKey(c.name), c] as const),
);

function lookupCounty(raw: string): { fips: string; name: string } | null {
  const key = countyKey(raw);
  return COUNTY_BY_KEY.get(key) ?? null;
}

function mvicUrl(year: number): string {
  const ymd = GENERAL_DATE[year];
  if (!ymd) return MVIC;
  const month = Number(ymd.slice(4, 6));
  const day = Number(ymd.slice(6, 8));
  return `${MVIC}Index?type=C&electionDate=${month}-${day}-${year}`;
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, "");
  while (i < s.length) {
    const c = s[i] ?? "";
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = (rows[0] ?? []).map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    for (let idx = 0; idx < headers.length; idx += 1) {
      const header = headers[idx];
      if (header) obj[header] = cells[idx] ?? "";
    }
    return obj;
  });
}

function parseVotes(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function classifyOffice(office: string): { office: FederalOffice; district: number | null } | null {
  const o = office.trim().toLowerCase();
  if (!o) return null;
  if (
    o.includes("state house") ||
    o.includes("state legislature") ||
    o.includes("state senate") ||
    o.includes("representative in state") ||
    o.includes("straight party") ||
    /\bvillage\b/.test(o) ||
    /\btownship\b/.test(o)
  ) {
    return null;
  }
  if (
    o === "president" ||
    o.includes("president of the united states") ||
    o.includes("president / vice") ||
    o.includes("president/vice") ||
    o.includes("electors of president") ||
    (o.includes("president") && o.includes("vice"))
  ) {
    return { office: "president", district: null };
  }
  if (
    /\bu\.?\s*s\.?\s+senat/.test(o) ||
    o.includes("united states senate") ||
    o.includes("united states senator") ||
    o.includes("us senate") ||
    o.includes("us senator")
  ) {
    return { office: "senate", district: null };
  }
  const congressHead = o.match(
    /(\d+)(?:st|nd|rd|th)\s+district representative in congress/,
  );
  if (congressHead) {
    return { office: "house", district: Number(congressHead[1]) };
  }
  const congressTail = o.match(
    /representative in congress\s+(\d+)(?:st|nd|rd|th)/,
  );
  if (congressTail) {
    return { office: "house", district: Number(congressTail[1]) };
  }
  if (
    /\bu\.?\s*s\.?\s+house/.test(o) ||
    o.includes("united states representative") ||
    o.includes("representative in congress")
  ) {
    return { office: "house", district: null };
  }
  return null;
}

function districtFromRow(row: Record<string, string>, classified: { office: FederalOffice; district: number | null }): number | null {
  if (classified.office !== "house") return null;
  const col = (row.district ?? "").trim();
  if (col) {
    const n = Number(col);
    if (Number.isInteger(n) && n > 0 && n < 100) return n;
  }
  return classified.district;
}

function candidateName(row: Record<string, string>): string {
  const direct = (row.candidate ?? "").trim();
  if (direct) return direct.replace(/\s+/g, " ");
  const first = (row.first ?? "").trim();
  const middle = (row.middle ?? "").trim();
  const last = (row.last ?? "").trim();
  const suffix = (row.suffix ?? "").trim();
  const parts = [first, middle, last, suffix].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ");
}

function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/,/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lastToken(name: string): string {
  const parts = normName(name).split(" ");
  return parts[parts.length - 1] ?? "";
}

function partyFromCode(raw: string): Party | null {
  const p = raw.trim().toLowerCase();
  if (!p) return null;
  if (
    p === "d" ||
    p === "dem" ||
    p === "democrat" ||
    p === "democratic" ||
    p === "democratic party"
  ) {
    return "D";
  }
  if (
    p === "r" ||
    p === "rep" ||
    p === "gop" ||
    p === "republican" ||
    p === "republican party"
  ) {
    return "R";
  }
  if (
    p === "i" ||
    p === "ind" ||
    p === "independent" ||
    p === "npa" ||
    p === "na" ||
    p === "no party affiliation"
  ) {
    return "I";
  }
  return "other";
}

function inferParty(
  year: number,
  office: FederalOffice,
  name: string,
  rawParty: string,
): Party {
  const fromCol = partyFromCode(rawParty);
  if (fromCol) return fromCol;
  const n = normName(name);
  const known = KNOWN_DR[n];
  if (known) return known;
  const last = lastToken(name);
  if (office === "president" && PRES_LAST[last]) return PRES_LAST[last];
  if (office === "senate" && SENATE_LAST[last]) return SENATE_LAST[last];
  return "other";
}

function emptyStore(): Store {
  return new Map();
}

function addVote(
  store: Store,
  geoId: string,
  year: number,
  office: FederalOffice,
  district: number | null,
  name: string,
  party: Party,
  votes: number,
  sourceUrl: string,
): void {
  if (votes <= 0 || !name) return;
  if (office === "house" && (district == null || district < 1)) return;
  const bucket: OfficeBucket =
    office === "house" ? `house:${district}` : office;
  let byYear = store.get(geoId);
  if (!byYear) {
    byYear = new Map();
    store.set(geoId, byYear);
  }
  let byOffice = byYear.get(year);
  if (!byOffice) {
    byOffice = new Map();
    byYear.set(year, byOffice);
  }
  let byName = byOffice.get(bucket);
  if (!byName) {
    byName = new Map();
    byOffice.set(bucket, byName);
  }
  const key = `${normName(name)}|${party}`;
  const existing = byName.get(key);
  if (existing) {
    existing.votes += votes;
    return;
  }
  byName.set(key, { name, party, votes, sourceUrl });
}

function hasOffice(store: Store, geoId: string, year: number, office: FederalOffice): boolean {
  const byOffice = store.get(geoId)?.get(year);
  if (!byOffice) return false;
  if (office === "house") {
    for (const key of byOffice.keys()) {
      if (key.startsWith("house:")) return true;
    }
    return false;
  }
  return byOffice.has(office);
}

function parseOeRows(text: string, year: number): ParsedRow[] {
  const out: ParsedRow[] = [];
  for (const row of parseCsv(text)) {
    const classified = classifyOffice(row.office ?? "");
    if (!classified) continue;
    if (classified.office === "president" && !PRESIDENT_YEARS.has(year)) continue;
    if (classified.office === "senate" && !SENATE_YEARS.has(year)) continue;
    const precinct = (row.precinct ?? "").trim();
    if (precinct && SKIP_PRECINCT.test(precinct)) continue;
    const name = candidateName(row);
    if (!name || SKIP_NAME.test(name)) continue;
    const votes = parseVotes(row.votes ?? "");
    if (votes == null) continue;
    out.push({
      county: (row.county ?? "").trim(),
      precinct,
      office: classified.office,
      district: districtFromRow(row, classified),
      candidate: name,
      partyRaw: (row.party ?? "").trim(),
      votes,
    });
  }
  return out;
}

function filledOffices(store: Store, year: number): Set<string> {
  const filled = new Set<string>();
  for (const county of MI_COUNTIES) {
    for (const office of expectedOffices(year)) {
      if (hasOffice(store, county.fips, year, office)) {
        filled.add(`${county.fips}|${office}`);
      }
    }
  }
  return filled;
}

function ingestRows(
  store: Store,
  rows: ParsedRow[],
  year: number,
  sourceUrl: string,
  skip: Set<string> | null,
): void {
  for (const row of rows) {
    const county = lookupCounty(row.county);
    if (!county) continue;
    if (skip?.has(`${county.fips}|${row.office}`)) continue;
    const party = inferParty(year, row.office, row.candidate, row.partyRaw);
    addVote(
      store,
      county.fips,
      year,
      row.office,
      row.district,
      row.candidate,
      party,
      row.votes,
      sourceUrl,
    );
  }
}

async function fetchText(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      return await res.text();
    } catch (err) {
      if (attempt === 3) {
        console.warn(`  download failed ${url}: ${err instanceof Error ? err.message : err}`);
        return null;
      }
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  return null;
}

async function cachedDownload(
  url: string,
  dest: string,
  force: boolean,
): Promise<string | null> {
  if (!force && fs.existsSync(dest)) {
    return fs.readFileSync(dest, "utf8");
  }
  const text = await fetchText(url);
  if (text == null) return null;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text);
  return text;
}

async function listOeFiles(): Promise<Set<string>> {
  const dest = path.join(OE_DIR, "tree.json");
  const raw = await cachedDownload(OE_TREE, dest, false);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as { tree?: Array<{ path?: string; type?: string }> };
    const paths = new Set<string>();
    for (const node of parsed.tree ?? []) {
      if (node.type === "blob" && node.path) paths.add(node.path);
    }
    return paths;
  } catch {
    return new Set();
  }
}

function oeDest(rel: string): string {
  return path.join(OE_DIR, rel);
}

async function loadOeFile(rel: string, force: boolean): Promise<string | null> {
  return cachedDownload(OE_RAW + rel, oeDest(rel), force);
}

function expectedOffices(year: number): FederalOffice[] {
  const offices: FederalOffice[] = ["house"];
  if (PRESIDENT_YEARS.has(year)) offices.unshift("president");
  if (SENATE_YEARS.has(year)) offices.splice(offices.length - 1, 0, "senate");
  return offices;
}

function missingCounties(
  store: Store,
  year: number,
  office: FederalOffice,
): { fips: string; name: string }[] {
  return MI_COUNTIES.filter((c) => !hasOffice(store, c.fips, year, office));
}

function countySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "_");
}

function perCountyCandidates(year: number, date: string, name: string): string[] {
  const slug = countySlug(name);
  const slug2 = slug.replace(/st_/g, "st");
  const slug3 = name.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
  const uniq = [...new Set([slug, slug2, slug3, slug.replace("st_", "st.")])];
  const paths: string[] = [];
  for (const s of uniq) {
    paths.push(`${year}/counties/${date}__mi__general__${s}__precinct.csv`);
    paths.push(`${year}/counties/${date}__mi__general__${s}_precinct.csv`);
  }
  return paths;
}

async function ingestYear(
  store: Store,
  year: number,
  oeFiles: Set<string>,
  force: boolean,
): Promise<void> {
  const date = GENERAL_DATE[year];
  if (!date) return;
  const sourceUrl = mvicUrl(year);
  const countyRel = `${year}/${date}__mi__general__county.csv`;
  const precinctRel = `${year}/${date}__mi__general__precinct.csv`;

  if (oeFiles.size === 0 || oeFiles.has(countyRel)) {
    const text = await loadOeFile(countyRel, force);
    if (text) {
      console.log(`  ${year} OpenElections county CSV`);
      ingestRows(store, parseOeRows(text, year), year, sourceUrl, null);
    }
  }

  const needPrecinct = expectedOffices(year).some(
    (office) => missingCounties(store, year, office).length > 0,
  );
  if (needPrecinct && (oeFiles.size === 0 || oeFiles.has(precinctRel))) {
    const skip = filledOffices(store, year);
    const text = await loadOeFile(precinctRel, force);
    if (text) {
      console.log(`  ${year} OpenElections statewide precinct CSV`);
      ingestRows(store, parseOeRows(text, year), year, sourceUrl, skip);
    }
  }

  for (const office of expectedOffices(year)) {
    const missing = missingCounties(store, year, office);
    for (const county of missing) {
      let filled = false;
      for (const rel of perCountyCandidates(year, date, county.name)) {
        if (oeFiles.size > 0 && !oeFiles.has(rel)) continue;
        const text = await loadOeFile(rel, force);
        if (!text) continue;
        const skip = filledOffices(store, year);
        ingestRows(store, parseOeRows(text, year), year, sourceUrl, skip);
        filled = hasOffice(store, county.fips, year, office);
        if (filled) break;
      }
      if (filled) {
        console.log(`  ${year} filled ${county.name} ${office} from per-county file`);
      }
    }
  }
}

function mitParty(raw: string): Party {
  const p = raw.trim().toLowerCase();
  if (p.includes("democrat")) return "D";
  if (p.includes("republican")) return "R";
  if (p.includes("independent")) return "I";
  return "other";
}

function ingestMitPresident(store: Store, text: string): void {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const rows = first.includes("\t") ? parseTsv(text) : parseCsv(text);
  const skip = new Set<string>();
  for (const year of PRESIDENT_YEARS) {
    for (const county of missingCounties(store, year, "president")) {
      skip.add(`${county.fips}|${year}`);
    }
  }
  if (skip.size === 0) return;

  const grouped = new Map<string, { name: string; party: Party; modes: Map<string, number> }>();
  for (const row of rows) {
    const year = Number(row.year ?? "");
    if (!PRESIDENT_YEARS.has(year)) continue;
    const fips = String(row.county_fips ?? row.countyFIPS ?? "")
      .replace(/\.0$/, "")
      .padStart(5, "0");
    if (!skip.has(`${fips}|${year}`)) continue;
    const candidate = (row.candidate ?? "").trim();
    if (!candidate || SKIP_NAME.test(candidate)) continue;
    const votes = parseVotes(row.candidatevotes ?? row.candidate_votes ?? "");
    if (votes == null) continue;
    const party = mitParty(row.party_simplified ?? row.party ?? "");
    const key = `${fips}|${year}|${normName(candidate)}|${party}`;
    let entry = grouped.get(key);
    if (!entry) {
      entry = { name: candidate, party, modes: new Map() };
      grouped.set(key, entry);
    }
    const mode = (row.mode ?? "TOTAL").trim().toUpperCase() || "TOTAL";
    entry.modes.set(mode, (entry.modes.get(mode) ?? 0) + votes);
  }

  for (const [key, entry] of grouped) {
    const [fips, yearStr] = key.split("|");
    const year = Number(yearStr);
    if (!fips || !year) continue;
    const votes = entry.modes.has("TOTAL")
      ? (entry.modes.get("TOTAL") ?? 0)
      : [...entry.modes.values()].reduce((sum, n) => sum + n, 0);
    addVote(store, fips, year, "president", null, entry.name, entry.party, votes, MIT_DOI);
  }
}

function parseTsv(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const headers = (lines[0] ?? "").split("\t").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? "";
    });
    return obj;
  });
}

async function loadMit(force: boolean): Promise<string | null> {
  const dest = path.join(MIT_DIR, "countypres_2000-2024.csv");
  const urls = [
    `https://dataverse.harvard.edu/api/access/datafile/${MIT_FILE_ID}?gbrecs=true`,
    `https://dataverse.harvard.edu/api/access/datafile/${MIT_FILE_ID}?format=original&gbrecs=true`,
    `https://dataverse.harvard.edu/api/access/datafile/${MIT_FILE_ID}`,
    `https://dataverse.harvard.edu/api/access/dataset/:persistentId/?persistentId=doi:10.7910/DVN/VOQCHQ`,
  ];
  if (!force && fs.existsSync(dest)) return fs.readFileSync(dest, "utf8");
  for (const url of urls) {
    const text = await fetchText(url);
    if (text && text.length > 1000 && (text.includes("county_fips") || text.includes("candidatevotes"))) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, text);
      return text;
    }
  }
  return null;
}

function toCandidates(map: Map<string, CandAgg> | undefined): ElectionCandidate[] | undefined {
  if (!map || map.size === 0) return undefined;
  const list = [...map.values()]
    .filter((c) => c.votes > 0)
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
  return list.length ? list : undefined;
}

function buildYearOffices(byOffice: Map<OfficeBucket, Map<string, CandAgg>>): YearOffices | null {
  const offices: YearOffices = {};
  const president = toCandidates(byOffice.get("president"));
  if (president) offices.president = president;
  const senate = toCandidates(byOffice.get("senate"));
  if (senate) offices.senate = senate;
  const house: HouseDistrictResult[] = [];
  for (const [bucket, cands] of byOffice) {
    if (!bucket.startsWith("house:")) continue;
    const district = Number(bucket.slice("house:".length));
    const candidates = toCandidates(cands);
    if (!candidates || !Number.isInteger(district)) continue;
    house.push({ district, candidates });
  }
  house.sort((a, b) => a.district - b.district);
  if (house.length) offices.house = house;
  if (!offices.president && !offices.senate && !offices.house) return null;
  return offices;
}

function aggregateState(store: Store): void {
  const stateYear = new Map<number, Map<OfficeBucket, Map<string, CandAgg>>>();
  for (const year of FEDERAL_ELECTION_YEARS) {
    for (const office of expectedOffices(year)) {
      const present = MI_COUNTIES.filter((c) => hasOffice(store, c.fips, year, office));
      if (present.length < MI_COUNTIES.length) {
        console.log(
          `  skip statewide ${year} ${office}: ${present.length}/83 counties (not inventing the rest)`,
        );
        continue;
      }
      let destYear = stateYear.get(year);
      if (!destYear) {
        destYear = new Map();
        stateYear.set(year, destYear);
      }
      for (const county of MI_COUNTIES) {
        const byOffice = store.get(county.fips)?.get(year);
        if (!byOffice) continue;
        for (const [bucket, cands] of byOffice) {
          if (office === "house" && !bucket.startsWith("house:")) continue;
          if (office !== "house" && bucket !== office) continue;
          let dest = destYear.get(bucket);
          if (!dest) {
            dest = new Map();
            destYear.set(bucket, dest);
          }
          for (const [key, cand] of cands) {
            const existing = dest.get(key);
            if (existing) existing.votes += cand.votes;
            else dest.set(key, { ...cand });
          }
        }
      }
    }
  }
  store.set(MICHIGAN_STATE_GEO_ID, stateYear);
}

function coverage(store: Store): { lines: string[]; gaps: string[] } {
  const lines: string[] = [];
  const gaps: string[] = [];
  for (const year of FEDERAL_ELECTION_YEARS) {
    const offices = expectedOffices(year);
    const bits: string[] = [];
    for (const office of offices) {
      const n = MI_COUNTIES.filter((c) => hasOffice(store, c.fips, year, office)).length;
      bits.push(`${office} ${n}/83`);
      if (n < 83) {
        const missing = MI_COUNTIES.filter((c) => !hasOffice(store, c.fips, year, office)).map(
          (c) => c.name,
        );
        gaps.push(`${year} ${office}: missing ${missing.join(", ")}`);
      }
    }
    const unexpected: string[] = [];
    if (!PRESIDENT_YEARS.has(year) && MI_COUNTIES.some((c) => hasOffice(store, c.fips, year, "president"))) {
      unexpected.push("president present (unexpected)");
    }
    if (!SENATE_YEARS.has(year) && MI_COUNTIES.some((c) => hasOffice(store, c.fips, year, "senate"))) {
      unexpected.push("senate present (no MI race that year — check source)");
    }
    lines.push(`${year}: ${bits.join(" · ")}${unexpected.length ? ` · ${unexpected.join("; ")}` : ""}`);
  }
  return { lines, gaps };
}

function toFile(store: Store): ElectionsFile {
  const geos: Record<string, GeographyElections> = {};

  const writeGeo = (geoId: string, name: string) => {
    const byYear = store.get(geoId);
    const years: GeographyElections["years"] = {};
    if (byYear) {
      for (const year of FEDERAL_ELECTION_YEARS) {
        const offices = byYear.get(year);
        if (!offices) continue;
        const built = buildYearOffices(offices);
        if (built) years[`${year}`] = built;
      }
    }
    geos[geoId] = { geoId, name, years };
  };

  writeGeo(MICHIGAN_STATE_GEO_ID, "Michigan");
  for (const county of MI_COUNTIES) writeGeo(county.fips, county.name);

  return { generatedAt: new Date().toISOString(), geos };
}

function printStatewideQa(file: ElectionsFile): void {
  const mi = file.geos[MICHIGAN_STATE_GEO_ID];
  if (!mi) return;
  console.log("\nStatewide presidential D/R (sum of counties, not invented):");
  for (const year of FEDERAL_ELECTION_YEARS) {
    const pres = mi.years[`${year}`]?.president;
    if (!pres) continue;
    const d = pres.filter((c) => c.party === "D").reduce((s, c) => s + c.votes, 0);
    const r = pres.filter((c) => c.party === "R").reduce((s, c) => s + c.votes, 0);
    const top = pres[0];
    console.log(
      `  ${year}: D ${d.toLocaleString("en-US")}  R ${r.toLocaleString("en-US")}  lead ${top?.name ?? "—"}`,
    );
  }
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  fs.mkdirSync(OE_DIR, { recursive: true });
  fs.mkdirSync(MIT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  console.log("Listing OpenElections MI files…");
  const oeFiles = await listOeFiles();
  console.log(oeFiles.size ? `  ${oeFiles.size} paths` : "  tree unavailable; trying known URLs");

  const store = emptyStore();
  for (const year of FEDERAL_ELECTION_YEARS) {
    console.log(`Ingest ${year}`);
    await ingestYear(store, year, oeFiles, force);
  }

  const presGaps = [...PRESIDENT_YEARS].some(
    (year) => missingCounties(store, year, "president").length > 0,
  );
  if (presGaps) {
    console.log("Presidential gaps remain; trying MIT Election Lab county returns…");
    const mit = await loadMit(force);
    if (mit) {
      ingestMitPresident(store, mit);
      console.log("  applied MIT fallback where OpenElections was missing a county");
    } else {
      console.warn("  MIT download failed (guestbook or network). Presidential gaps kept.");
    }
  }

  aggregateState(store);
  const file = toFile(store);
  fs.writeFileSync(OUT_PATH, JSON.stringify(file));

  const { lines, gaps } = coverage(store);
  console.log("\nCoverage (counties with at least one candidate):");
  for (const line of lines) console.log(`  ${line}`);
  if (gaps.length) {
    console.log("\nGaps (not filled from public files; totals not invented):");
    for (const gap of gaps) console.log(`  ${gap}`);
  } else {
    console.log("\nNo county gaps for expected offices.");
  }
  printStatewideQa(file);
  console.log(`\nWrote ${path.relative(ROOT, OUT_PATH)}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
