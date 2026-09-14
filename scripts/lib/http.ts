import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { UA } from "./paths.ts";

const RETRIES = 4;

export async function fetchBuffer(
  url: string,
  attempt = 1,
): Promise<{ body: Buffer; contentType: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "*/*" },
    redirect: "follow",
  });
  if (!res.ok) {
    if (attempt < RETRIES && res.status >= 500) {
      await sleep(500 * 2 ** (attempt - 1));
      return fetchBuffer(url, attempt + 1);
    }
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  const body = Buffer.from(await res.arrayBuffer());
  if (contentType.includes("text/html") && body.includes(Buffer.from("Missing Key"))) {
    throw new Error(`Census API requires CENSUS_API_KEY (${url})`);
  }
  return { body, contentType };
}

export async function downloadFile(
  url: string,
  dest: string,
  opts?: { skipIfExists?: boolean },
): Promise<string> {
  if (opts?.skipIfExists !== false && fs.existsSync(dest) && fs.statSync(dest).size > 64) {
    return dest;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  const { body } = await fetchBuffer(url);
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, dest);
  return dest;
}

/** Stream an ACS table-based SF `.dat` and keep Michigan state + county rows. */
export async function downloadMichiganDat(
  url: string,
  dest: string,
): Promise<string> {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 64) return dest;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "*/*" },
    redirect: "follow",
  });
  if (!res.ok || !res.body) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  }
  const nodeStream = Readable.fromWeb(
    res.body as import("stream/web").ReadableStream<Uint8Array>,
  );
  const rl = readline.createInterface({ input: nodeStream, crlfDelay: Infinity });
  const out = fs.createWriteStream(tmp);
  let header = false;
  let kept = 0;
  for await (const line of rl) {
    if (!header) {
      out.write(`${line}\n`);
      header = true;
      continue;
    }
    const geo = line.slice(0, line.indexOf("|"));
    if (geo === "0400000US26" || geo.startsWith("0500000US26")) {
      out.write(`${line}\n`);
      kept += 1;
    }
  }
  await new Promise<void>((resolve, reject) => {
    out.end(() => resolve());
    out.on("error", reject);
  });
  if (kept < 84) {
    fs.rmSync(tmp, { force: true });
    throw new Error(`${url}: expected 84 MI geos, kept ${kept}`);
  }
  fs.renameSync(tmp, dest);
  return dest;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
