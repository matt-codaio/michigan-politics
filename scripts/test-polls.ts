import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { Poll } from "../src/types/polls.ts";
import { validatePoll, validatePollsArray } from "../src/polls/validate.ts";
import { processPollsPost } from "../vite/polls-write.ts";

const validPoll: Poll = {
  id: "test-poll-2026-09-01",
  pollster: "Testster",
  sponsor: "Test News",
  partisan: "none",
  field_start: "2026-09-01",
  field_end: "2026-09-03",
  published: "2026-09-04",
  sample_size: 500,
  sample_type: "LV",
  moe: 4,
  el_sayed: 46,
  rogers: 44,
  undecided: 8,
  other: 2,
  method: "online",
  source_url: "https://example.com/poll",
  has_demo_crosstabs: false,
  has_geo_crosstabs: false,
  crosstab_notes: "",
  entered_by: "test",
  entered_at: "2026-09-11T10:00:00-05:00",
};

function tmpPaths(): { pollsPath: string; changelogPath: string; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mi-polls-"));
  return {
    dir,
    pollsPath: path.join(dir, "polls.json"),
    changelogPath: path.join(dir, "polls_changelog.jsonl"),
  };
}

test("rejects missing source URL", () => {
  const result = validatePoll({ ...validPoll, source_url: "" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join(" "), /source_url/);
  }
});

test("rejects missing field dates", () => {
  const result = validatePoll({ ...validPoll, field_start: "", field_end: "" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join(" "), /field_start/);
    assert.match(result.errors.join(" "), /field_end/);
  }
});

test("rejects field_end before field_start", () => {
  const result = validatePoll({
    ...validPoll,
    field_start: "2026-09-10",
    field_end: "2026-09-01",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join(" "), /field_end must be on or after field_start/);
  }
});

test("rejects El+Rogers+undecided above 100±2", () => {
  const result = validatePoll({
    ...validPoll,
    el_sayed: 50,
    rogers: 50,
    undecided: 10,
    other: null,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join(" "), /exceeds 100/);
  }
});

test("accepts a complete H2H poll", () => {
  const result = validatePoll(validPoll);
  assert.equal(result.ok, true);
});

test("warns on duplicate pollster+field_end+sample_type", () => {
  const twin: Poll = { ...validPoll, id: "test-poll-dup" };
  const result = validatePollsArray([validPoll, twin]);
  assert.equal(result.ok, true);
  assert.equal(result.warnings.length > 0, true);
  assert.match(result.warnings.join(" "), /Duplicate poll key/);
});

test("POST /api/polls rejects missing URL and does not write", () => {
  const paths = tmpPaths();
  const result = processPollsPost(
    { poll: { ...validPoll, source_url: "" } },
    paths,
  );
  assert.equal(result.status, 400);
  assert.equal(fs.existsSync(paths.pollsPath), false);
  assert.equal(fs.existsSync(paths.changelogPath), false);
});

test("POST /api/polls writes polls.json and changelog on create", () => {
  const paths = tmpPaths();
  const result = processPollsPost({ poll: validPoll }, paths);
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.action, "create");
  const file = JSON.parse(fs.readFileSync(paths.pollsPath, "utf8")) as { polls: Poll[] };
  assert.equal(file.polls.length, 1);
  assert.equal(file.polls[0]?.id, validPoll.id);
  const log = fs.readFileSync(paths.changelogPath, "utf8").trim().split("\n");
  assert.equal(log.length, 1);
  const entry = JSON.parse(log[0] ?? "{}") as { action: string; poll_id: string };
  assert.equal(entry.action, "create");
  assert.equal(entry.poll_id, validPoll.id);
});

test("POST /api/polls appends changelog on edit", () => {
  const paths = tmpPaths();
  processPollsPost({ poll: validPoll }, paths);
  const edited = { ...validPoll, el_sayed: 45 };
  const result = processPollsPost({ poll: edited }, paths);
  assert.equal(result.status, 200);
  assert.equal(result.body.action, "edit");
  const log = fs.readFileSync(paths.changelogPath, "utf8").trim().split("\n");
  assert.equal(log.length, 2);
  const entry = JSON.parse(log[1] ?? "{}") as { action: string };
  assert.equal(entry.action, "edit");
});

test("POST /api/polls duplicate key warns but still saves", () => {
  const paths = tmpPaths();
  processPollsPost({ poll: validPoll }, paths);
  const result = processPollsPost(
    { poll: { ...validPoll, id: "other-id" } },
    paths,
  );
  assert.equal(result.status, 200);
  const warnings = result.body.warnings as string[];
  assert.ok(warnings.some((row) => /Duplicate poll key/.test(row)));
  const file = JSON.parse(fs.readFileSync(paths.pollsPath, "utf8")) as { polls: Poll[] };
  assert.equal(file.polls.length, 2);
});
