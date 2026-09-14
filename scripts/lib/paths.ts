import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "..", "..");
export const LOCAL_ROOT = path.join(REPO_ROOT, "local");
export const DOWNLOAD_DIR = path.join(LOCAL_ROOT, "downloads", "census");
export const COUNTIES_DIR = path.join(LOCAL_ROOT, "counties");
export const DEMOGRAPHICS_PATH = path.join(COUNTIES_DIR, "demographics.json");

export const UA =
  "michigan-politics-local-dashboard/0.1 (volunteer public-data ingest; Census PEP/ACS/CVAP)";

export function ensureDirs(): void {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  fs.mkdirSync(COUNTIES_DIR, { recursive: true });
}

/** Load `.env` without overriding real environment variables. */
export function loadDotEnv(): void {
  const envPath = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function censusApiKey(): string | undefined {
  const key = process.env.CENSUS_API_KEY?.trim();
  return key ? key : undefined;
}
