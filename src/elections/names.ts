import type { ElectionCandidate, Party } from "../types/elections";

const PARTY_PREFIX =
  /^(?:dem(?:ocrat(?:ic)?)?|rep(?:ublican)?|gop|ind(?:ependent)?|lib(?:ertarian)?|grn|green|npa)\b[\s.\-:]*/i;

/** OpenElections often stores "Nominee / running mate" as one string. */
export function ticketNominee(name: string): string {
  const left = name.split(/\s*(?:w\/|&|\/)\s*/i)[0]?.trim() ?? name;
  const unglued = left.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/,/g, " ");
  const cleaned = unglued
    .replace(/\b(?:jr|sr|ii|iii|iv)\.?$/i, "")
    .replace(/\b(?:jr|sr|ii|iii|iv)\.?\s+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const twoPerson = cleaned.match(
    /^((?:[A-Za-z]+(?:-[A-Za-z]+)?\s+)+[A-Z]\.?\s+[A-Za-z]+(?:-[A-Za-z]+)?)\s+[A-Z]/,
  );
  return twoPerson?.[1]?.trim() ?? cleaned;
}

export function displayCandidateName(name: string): string {
  const stripped = ticketNominee(name.replace(/\s+/g, " ").trim()).replace(PARTY_PREFIX, "").trim();
  return stripped.replace(/\s+/g, " ") || name.trim();
}

function nameTokens(name: string): string[] {
  return displayCandidateName(name)
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9 -]+/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean)
    .filter((token) => token.length > 1);
}

/** Same person + party: last name and first name, ignoring middle initials and DEM/REP prefixes. */
export function candidateMergeKey(name: string, party: Party): string {
  const tokens = nameTokens(name);
  const first = tokens[0] ?? "";
  const last = tokens[tokens.length - 1] ?? "";
  return `${party}|${last}|${first}`;
}

function preferDisplayName(current: string, incoming: string): string {
  const a = displayCandidateName(current);
  const b = displayCandidateName(incoming);
  const aTokens = nameTokens(a).length;
  const bTokens = nameTokens(b).length;
  if (bTokens !== aTokens) return bTokens > aTokens ? b : a;
  return b.length > a.length ? b : a;
}

/** Combine rows that are the same person reported under slightly different strings. */
export function mergeCandidates(rows: ElectionCandidate[]): ElectionCandidate[] {
  const map = new Map<string, ElectionCandidate>();
  for (const row of rows) {
    const key = candidateMergeKey(row.name, row.party);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...row, name: displayCandidateName(row.name) });
      continue;
    }
    existing.votes += row.votes;
    existing.name = preferDisplayName(existing.name, row.name);
    if (!existing.sourceUrl && row.sourceUrl) existing.sourceUrl = row.sourceUrl;
  }
  return [...map.values()].sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
}
