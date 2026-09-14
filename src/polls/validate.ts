import type { PartisanFlag, Poll, SampleType } from "../types/polls.ts";

/** El% + Rogers% + undecided may not exceed 100 + this tolerance (PRD §5.2). */
export const POLL_SUM_TOLERANCE = 2;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PARTISAN_FLAGS: readonly PartisanFlag[] = ["none", "D", "R", "media"];
const SAMPLE_TYPES: readonly SampleType[] = ["LV", "RV", "A"];

export interface PollValidationSuccess {
  ok: true;
  poll: Poll;
  warnings: string[];
}

export interface PollValidationFailure {
  ok: false;
  errors: string[];
}

export type PollValidationResult = PollValidationSuccess | PollValidationFailure;

export function pollDuplicateKey(
  poll: Pick<Poll, "pollster" | "field_end" | "sample_type">,
): string {
  return `${poll.pollster.trim().toLowerCase()}|${poll.field_end}|${poll.sample_type}`;
}

export function isPartisanFlag(value: unknown): value is PartisanFlag {
  return typeof value === "string" && (PARTISAN_FLAGS as string[]).includes(value);
}

export function isSampleType(value: unknown): value is SampleType {
  return typeof value === "string" && (SAMPLE_TYPES as string[]).includes(value);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** Finite number in [min, max]. Rejects numeric strings so JSON stays typed. */
function asNumberInRange(
  value: unknown,
  min: number,
  max: number,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function asNullableNumberInRange(
  value: unknown,
  min: number,
  max: number,
): number | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return asNumberInRange(value, min, max);
}

export function duplicateKeyWarnings(polls: Poll[]): string[] {
  const groups = new Map<string, Poll[]>();
  for (const poll of polls) {
    const key = pollDuplicateKey(poll);
    const list = groups.get(key) ?? [];
    list.push(poll);
    groups.set(key, list);
  }
  const warnings: string[] = [];
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    const ids = group.map((row) => row.id).join(", ");
    warnings.push(
      `Duplicate poll key (${key.replace(/\|/g, ", ")}) — ids ${ids}. Saving anyway; confirm this is not a double entry.`,
    );
  }
  return warnings;
}

export function validatePoll(
  input: unknown,
  siblings: Poll[] = [],
): PollValidationResult {
  const errors: string[] = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Poll must be a JSON object."] };
  }
  const raw = input as Record<string, unknown>;

  const id = asTrimmedString(raw.id);
  if (!id) errors.push("id is required.");

  const pollster = asTrimmedString(raw.pollster);
  if (!pollster) errors.push("pollster is required.");

  const sponsor = asTrimmedString(raw.sponsor);
  if (sponsor === null || sponsor === "") errors.push("sponsor is required.");

  if (!isPartisanFlag(raw.partisan)) {
    errors.push('partisan must be "none", "D", "R", or "media".');
  }

  if (!isIsoDate(raw.field_start)) {
    errors.push("field_start is required (YYYY-MM-DD).");
  }
  if (!isIsoDate(raw.field_end)) {
    errors.push("field_end is required (YYYY-MM-DD).");
  }
  if (
    isIsoDate(raw.field_start) &&
    isIsoDate(raw.field_end) &&
    raw.field_end < raw.field_start
  ) {
    errors.push("field_end must be on or after field_start.");
  }

  if (!isIsoDate(raw.published)) {
    errors.push("published is required (YYYY-MM-DD).");
  }

  const sampleSize = asNumberInRange(raw.sample_size, 1, 10_000_000);
  if (
    sampleSize === null ||
    (typeof raw.sample_size === "number" && !Number.isInteger(raw.sample_size))
  ) {
    errors.push("sample_size must be a positive integer.");
  }

  if (!isSampleType(raw.sample_type)) {
    errors.push('sample_type must be "LV", "RV", or "A".');
  }

  const moe = asNullableNumberInRange(raw.moe, 0, 50);
  if (raw.moe !== null && moe === null) {
    errors.push("moe must be a number ≥ 0, or null.");
  }
  if (moe === undefined) {
    errors.push("moe is required (number or null).");
  }

  const elSayed = asNumberInRange(raw.el_sayed, 0, 100);
  if (elSayed === null) errors.push("el_sayed must be a number from 0 to 100.");

  const rogers = asNumberInRange(raw.rogers, 0, 100);
  if (rogers === null) errors.push("rogers must be a number from 0 to 100.");

  const undecided = asNullableNumberInRange(raw.undecided, 0, 100);
  if (raw.undecided !== null && undecided === null) {
    errors.push("undecided must be a number from 0 to 100, or null.");
  }
  if (undecided === undefined) {
    errors.push("undecided is required (number or null).");
  }

  const other = asNullableNumberInRange(raw.other, 0, 100);
  if (raw.other !== null && other === null) {
    errors.push("other must be a number from 0 to 100, or null.");
  }
  if (other === undefined) {
    errors.push("other is required (number or null).");
  }

  if (elSayed !== null && rogers !== null && undecided !== undefined) {
    const trio = elSayed + rogers + (undecided ?? 0);
    if (trio > 100 + POLL_SUM_TOLERANCE) {
      errors.push(
        `El-Sayed % + Rogers % + undecided (${trio.toFixed(1)}) exceeds 100±${POLL_SUM_TOLERANCE}.`,
      );
    }
    if (other !== undefined) {
      const total = trio + (other ?? 0);
      if (total > 100 + POLL_SUM_TOLERANCE) {
        errors.push(
          `El-Sayed % + Rogers % + undecided + other (${total.toFixed(1)}) exceeds 100±${POLL_SUM_TOLERANCE}.`,
        );
      }
    }
  }

  const method = asTrimmedString(raw.method);
  if (!method) errors.push("method is required.");

  if (!isHttpUrl(raw.source_url)) {
    errors.push("source_url is required (http or https URL).");
  }

  const hasDemo = asBoolean(raw.has_demo_crosstabs);
  if (hasDemo === null) errors.push("has_demo_crosstabs must be a boolean.");

  const hasGeo = asBoolean(raw.has_geo_crosstabs);
  if (hasGeo === null) errors.push("has_geo_crosstabs must be a boolean.");

  if (typeof raw.crosstab_notes !== "string") {
    errors.push("crosstab_notes must be a string.");
  }

  const enteredBy = asTrimmedString(raw.entered_by);
  if (!enteredBy) errors.push("entered_by is required.");

  const enteredAt = asTrimmedString(raw.entered_at);
  if (!enteredAt) errors.push("entered_at is required.");

  if (errors.length > 0) return { ok: false, errors };

  const poll: Poll = {
    id: id as string,
    pollster: pollster as string,
    sponsor: sponsor as string,
    partisan: raw.partisan as PartisanFlag,
    field_start: raw.field_start as string,
    field_end: raw.field_end as string,
    published: raw.published as string,
    sample_size: sampleSize as number,
    sample_type: raw.sample_type as SampleType,
    moe: moe as number | null,
    el_sayed: elSayed as number,
    rogers: rogers as number,
    undecided: undecided as number | null,
    other: other as number | null,
    method: method as string,
    source_url: (raw.source_url as string).trim(),
    has_demo_crosstabs: hasDemo as boolean,
    has_geo_crosstabs: hasGeo as boolean,
    crosstab_notes: raw.crosstab_notes as string,
    entered_by: enteredBy as string,
    entered_at: enteredAt as string,
  };

  const warnings = duplicateKeyWarnings([poll, ...siblings.filter((row) => row.id !== poll.id)]);
  return { ok: true, poll, warnings };
}

function describePoll(row: unknown): string {
  if (row !== null && typeof row === "object" && !Array.isArray(row)) {
    const rec = row as Record<string, unknown>;
    if (typeof rec.id === "string" && rec.id.trim()) return rec.id;
    if (typeof rec.pollster === "string" && rec.pollster.trim()) return rec.pollster;
  }
  return "unknown";
}

/** Validate every row in a `{ polls }` file (or array). Collects all errors. */
export function validatePollsFile(data: unknown): {
  ok: boolean;
  polls: Poll[];
  errors: string[];
  warnings: string[];
} {
  if (Array.isArray(data)) {
    return validatePollsArray(data);
  }
  if (data === null || typeof data !== "object") {
    return {
      ok: false,
      polls: [],
      errors: ['Expected a JSON object with a "polls" array.'],
      warnings: [],
    };
  }
  const polls = (data as { polls?: unknown }).polls;
  if (!Array.isArray(polls)) {
    return {
      ok: false,
      polls: [],
      errors: ['Expected JSON object { "polls": Poll[] }.'],
      warnings: [],
    };
  }
  return validatePollsArray(polls);
}

export function validatePollsArray(rows: unknown[]): {
  ok: boolean;
  polls: Poll[];
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const polls: Poll[] = [];
  rows.forEach((row, index) => {
    const result = validatePoll(row);
    if (!result.ok) {
      errors.push(
        ...result.errors.map((message) => `Poll ${index + 1} (${describePoll(row)}): ${message}`),
      );
      return;
    }
    polls.push(result.poll);
  });
  const warnings = errors.length === 0 ? duplicateKeyWarnings(polls) : [];
  return { ok: errors.length === 0, polls, errors, warnings };
}
