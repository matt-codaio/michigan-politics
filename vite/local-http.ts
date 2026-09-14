import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { processPollsPost } from "./polls-write.ts";

const pluginDir = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(pluginDir, "..");

const POLLS_REL = path.join("polls", "polls.json");
const CHANGELOG_REL = path.join("polls", "polls_changelog.jsonl");
const BODY_LIMIT = 1_000_000;

const MIME: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8",
  ".jsonl": "application/jsonl; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const LOCAL_SUBDIRS = [
  "polls",
  "counties",
  "markets",
  "downloads",
  "scratch",
] as const;

let localRoot = path.resolve(REPO_ROOT, "local");

/** Gitignored data directory. Served at `/data/*`. */
export function getLocalRoot(): string {
  return localRoot;
}

export function setLocalRoot(dir: string): void {
  localRoot = path.resolve(dir);
}

export function ensureLocalDirs(): void {
  for (const dir of LOCAL_SUBDIRS) {
    fs.mkdirSync(path.join(localRoot, dir), { recursive: true });
  }
}

/** Resolve a path under `local/`. Returns null on traversal or empty. */
export function resolveLocalPath(urlPath: string): string | null {
  const raw = urlPath.split("?")[0] ?? "";
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const relative = decoded.replace(/^\/data\/?/, "");
  if (!relative || relative === "/") return null;
  const resolved = path.resolve(localRoot, relative);
  const rootWithSep = localRoot.endsWith(path.sep) ? localRoot : localRoot + path.sep;
  if (resolved !== localRoot && !resolved.startsWith(rootWithSep)) return null;
  return resolved;
}

export function pollsFilePath(): string {
  return path.join(localRoot, POLLS_REL);
}

export function pollsChangelogPath(): string {
  return path.join(localRoot, CHANGELOG_REL);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage, limit = BODY_LIMIT): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer | string) => {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      size += buf.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(buf);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handlePollsApi(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      writePath: "local/polls/polls.json",
      changelogPath: "local/polls/polls_changelog.jsonl",
      resolvedPath: pollsFilePath(),
      message:
        'POST { "poll": Poll } to add or edit one row, or { "polls": Poll[] } to replace the file. Rows are validated; changelog appends to polls_changelog.jsonl.',
    });
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  ensureLocalDirs();

  let raw: string;
  try {
    raw = await readBody(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read body";
    sendJson(res, message === "payload too large" ? 413 : 400, {
      ok: false,
      error: message,
    });
    return;
  }

  if (!raw.trim()) {
    sendJson(res, 400, { ok: false, error: "Empty body" });
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    sendJson(res, 400, { ok: false, error: "Body must be JSON" });
    return;
  }

  const result = processPollsPost(parsed, {
    pollsPath: pollsFilePath(),
    changelogPath: pollsChangelogPath(),
  });
  sendJson(res, result.status, result.body);
}

function handleData(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;

  const url = req.url ?? "";
  const filePath = resolveLocalPath(url);
  if (!filePath) {
    sendJson(res, 400, { ok: false, error: "Invalid data path" });
    return true;
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    sendJson(res, 404, {
      ok: false,
      error: "Not found",
      hint: "Put processed files under local/ (gitignored). See fixtures/ for shapes.",
    });
    return true;
  }

  if (!stat.isFile()) {
    sendJson(res, 404, { ok: false, error: "Not a file" });
    return true;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
  res.setHeader("Cache-Control", "no-cache");
  if (req.method === "HEAD") {
    res.setHeader("Content-Length", String(stat.size));
    res.end();
    return true;
  }
  fs.createReadStream(filePath).pipe(res);
  return true;
}

/**
 * Handle `/data/*` and `/api/polls`. Returns true if the request was consumed.
 */
export function handleLocalRequest(req: IncomingMessage, res: ServerResponse): boolean {
  const pathname = (req.url ?? "").split("?")[0] ?? "";
  if (pathname === "/api/polls") {
    void handlePollsApi(req, res);
    return true;
  }
  if (pathname === "/data" || pathname.startsWith("/data/")) {
    return handleData(req, res);
  }
  return false;
}
