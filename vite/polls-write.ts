import fs from "node:fs";
import path from "node:path";
import type { Poll, PollChangelogEntry, PollsFile } from "../src/types/polls.ts";
import { validatePoll, validatePollsArray } from "../src/polls/validate.ts";

export interface PollsIoPaths {
  pollsPath: string;
  changelogPath: string;
}

export interface PollsWriteResult {
  status: number;
  body: Record<string, unknown>;
}

function send(
  status: number,
  body: Record<string, unknown>,
): PollsWriteResult {
  return { status, body };
}

function slugId(pollster: string, fieldEnd: string): string {
  const slug = pollster
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "poll"}-${fieldEnd || "undated"}`;
}

function readPollsFile(pollsPath: string): PollsFile {
  if (!fs.existsSync(pollsPath)) return { polls: [] };
  const raw = fs.readFileSync(pollsPath, "utf8");
  if (!raw.trim()) return { polls: [] };
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("polls.json must be an object");
  }
  const polls = (parsed as { polls?: unknown }).polls;
  const aggregators = (parsed as PollsFile).aggregators;
  return {
    polls: Array.isArray(polls) ? (polls as Poll[]) : [],
    ...(aggregators ? { aggregators } : {}),
  };
}

function writePollsFile(pollsPath: string, file: PollsFile): void {
  fs.mkdirSync(path.dirname(pollsPath), { recursive: true });
  const payload = `${JSON.stringify(file, null, 2)}\n`;
  fs.writeFileSync(pollsPath, payload, "utf8");
}

function appendChangelog(
  changelogPath: string,
  entries: PollChangelogEntry[],
): void {
  if (entries.length === 0) return;
  fs.mkdirSync(path.dirname(changelogPath), { recursive: true });
  const lines = entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n";
  fs.appendFileSync(changelogPath, lines, "utf8");
}

function withDefaults(raw: Record<string, unknown>): Record<string, unknown> {
  const pollster = typeof raw.pollster === "string" ? raw.pollster : "";
  const fieldEnd = typeof raw.field_end === "string" ? raw.field_end : "";
  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : slugId(pollster, fieldEnd);
  const enteredAt =
    typeof raw.entered_at === "string" && raw.entered_at.trim()
      ? raw.entered_at.trim()
      : new Date().toISOString();
  const enteredBy =
    typeof raw.entered_by === "string" && raw.entered_by.trim()
      ? raw.entered_by.trim()
      : "matt";
  return { ...raw, id, entered_at: enteredAt, entered_by: enteredBy };
}

function pollChanged(before: Poll | undefined, after: Poll): boolean {
  if (!before) return true;
  return JSON.stringify(before) !== JSON.stringify(after);
}

function upsertPoll(
  existing: PollsFile,
  incoming: Poll,
  enteredBy: string,
): { file: PollsFile; changelog: PollChangelogEntry[]; action: "create" | "edit" } {
  const others = existing.polls.filter((row) => row.id !== incoming.id);
  const prior = existing.polls.find((row) => row.id === incoming.id);
  const action: "create" | "edit" = prior ? "edit" : "create";
  const polls = [...others, incoming].sort((a, b) =>
    a.field_end === b.field_end
      ? a.pollster.localeCompare(b.pollster)
      : a.field_end.localeCompare(b.field_end),
  );
  const changelog: PollChangelogEntry[] = pollChanged(prior, incoming)
    ? [
        {
          at: new Date().toISOString(),
          action,
          poll_id: incoming.id,
          entered_by: enteredBy,
        },
      ]
    : [];
  return {
    file: { ...existing, polls },
    changelog,
    action,
  };
}

export function processPollsPost(
  parsed: unknown,
  paths: PollsIoPaths,
): PollsWriteResult {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return send(400, {
      ok: false,
      errors: ['Expected JSON object { "poll": Poll } or { "polls": Poll[] }.'],
    });
  }

  const body = parsed as Record<string, unknown>;

  try {
    if ("poll" in body && body.poll !== undefined) {
      return processSinglePoll(body.poll, paths);
    }
    if ("polls" in body) {
      return processPollsReplace(body.polls, paths);
    }
    return send(400, {
      ok: false,
      errors: ['Expected JSON object { "poll": Poll } or { "polls": Poll[] }.'],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Write failed";
    return send(500, { ok: false, errors: [message] });
  }
}

function processSinglePoll(rawPoll: unknown, paths: PollsIoPaths): PollsWriteResult {
  if (rawPoll === null || typeof rawPoll !== "object" || Array.isArray(rawPoll)) {
    return send(400, { ok: false, errors: ["poll must be a JSON object."] });
  }

  let existing: PollsFile;
  try {
    existing = readPollsFile(paths.pollsPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read polls.json";
    return send(500, { ok: false, errors: [message] });
  }

  const incoming = withDefaults(rawPoll as Record<string, unknown>);
  const siblings = existing.polls.filter((row) => row.id !== incoming.id);
  const result = validatePoll(incoming, siblings);
  if (!result.ok) {
    return send(400, { ok: false, errors: result.errors });
  }

  const { file, changelog, action } = upsertPoll(
    existing,
    result.poll,
    result.poll.entered_by,
  );
  writePollsFile(paths.pollsPath, file);
  appendChangelog(paths.changelogPath, changelog);

  return send(200, {
    ok: true,
    action,
    poll: result.poll,
    count: file.polls.length,
    warnings: result.warnings,
    wrote: "local/polls/polls.json",
    changelog: "local/polls/polls_changelog.jsonl",
  });
}

function processPollsReplace(rawPolls: unknown, paths: PollsIoPaths): PollsWriteResult {
  if (!Array.isArray(rawPolls)) {
    return send(400, {
      ok: false,
      errors: ['Expected JSON object { "polls": Poll[] }.'],
    });
  }

  const prepared = rawPolls.map((row) => {
    if (row === null || typeof row !== "object" || Array.isArray(row)) return row;
    return withDefaults(row as Record<string, unknown>);
  });
  const validated = validatePollsArray(prepared);
  if (!validated.ok) {
    return send(400, { ok: false, errors: validated.errors });
  }

  let existing: PollsFile;
  try {
    existing = readPollsFile(paths.pollsPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to read polls.json";
    return send(500, { ok: false, errors: [message] });
  }

  const priorById = new Map(existing.polls.map((row) => [row.id, row]));
  const now = new Date().toISOString();
  const changelog: PollChangelogEntry[] = [];
  for (const poll of validated.polls) {
    const prior = priorById.get(poll.id);
    if (!pollChanged(prior, poll)) continue;
    changelog.push({
      at: now,
      action: prior ? "edit" : "create",
      poll_id: poll.id,
      entered_by: poll.entered_by,
    });
  }

  const polls = [...validated.polls].sort((a, b) =>
    a.field_end === b.field_end
      ? a.pollster.localeCompare(b.pollster)
      : a.field_end.localeCompare(b.field_end),
  );
  const file: PollsFile = { ...existing, polls };
  writePollsFile(paths.pollsPath, file);
  appendChangelog(paths.changelogPath, changelog);

  return send(200, {
    ok: true,
    action: "replace",
    count: polls.length,
    warnings: validated.warnings,
    wrote: "local/polls/polls.json",
    changelog: "local/polls/polls_changelog.jsonl",
  });
}
