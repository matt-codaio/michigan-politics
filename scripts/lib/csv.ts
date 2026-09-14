/** Minimal CSV parser that handles quoted fields. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  const header = rows.shift();
  if (!header) return [];
  const keys = header.map((h) => h.trim().replace(/^\uFEFF/, ""));
  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => {
      const rec: Record<string, string> = {};
      for (let i = 0; i < keys.length; i += 1) {
        rec[keys[i] ?? `col${i}`] = row[i] ?? "";
      }
      return rec;
    });
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      if (cell.endsWith("\r")) cell = cell.slice(0, -1);
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function parsePipeDat(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  const header = lines.shift()?.split("|");
  if (!header) return [];
  const keys = header.map((h) => h.trim().replace(/^\uFEFF/, ""));
  return lines.map((line) => {
    const parts = line.split("|");
    const rec: Record<string, string> = {};
    for (let i = 0; i < keys.length; i += 1) {
      rec[keys[i] ?? `col${i}`] = parts[i] ?? "";
    }
    return rec;
  });
}

export function intField(row: Record<string, string>, key: string): number {
  const raw = row[key];
  if (raw === undefined || raw === "" || raw === "." || raw === "null") {
    throw new Error(`Missing numeric field ${key}`);
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Non-numeric ${key}=${raw}`);
  return n;
}

export function optionalInt(row: Record<string, string>, key: string): number | undefined {
  const raw = row[key];
  if (raw === undefined || raw === "" || raw === "." || raw === "null") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function padFips(state: string, county: string): string {
  const s = state.trim().padStart(2, "0");
  const c = county.trim().padStart(3, "0");
  if (c === "000") return s;
  return `${s}${c}`;
}

export function countyDisplayName(raw: string): string {
  return raw.replace(/\s+County$/i, "").trim();
}
