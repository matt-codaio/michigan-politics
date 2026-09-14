import { useEffect, useState, type FormEvent } from "react";
import type { PartisanFlag, Poll, SampleType } from "../types/polls";
import { validatePoll } from "./validate";

interface Draft {
  id: string;
  pollster: string;
  sponsor: string;
  partisan: PartisanFlag;
  field_start: string;
  field_end: string;
  published: string;
  sample_size: string;
  sample_type: SampleType;
  moe: string;
  el_sayed: string;
  rogers: string;
  undecided: string;
  other: string;
  method: string;
  source_url: string;
  has_demo_crosstabs: boolean;
  has_geo_crosstabs: boolean;
  crosstab_notes: string;
  entered_by: string;
}

const EMPTY: Draft = {
  id: "",
  pollster: "",
  sponsor: "",
  partisan: "none",
  field_start: "",
  field_end: "",
  published: "",
  sample_size: "",
  sample_type: "LV",
  moe: "",
  el_sayed: "",
  rogers: "",
  undecided: "",
  other: "",
  method: "",
  source_url: "",
  has_demo_crosstabs: false,
  has_geo_crosstabs: false,
  crosstab_notes: "",
  entered_by: "matt",
};

function pollToDraft(poll: Poll): Draft {
  return {
    id: poll.id,
    pollster: poll.pollster,
    sponsor: poll.sponsor,
    partisan: poll.partisan,
    field_start: poll.field_start,
    field_end: poll.field_end,
    published: poll.published,
    sample_size: String(poll.sample_size),
    sample_type: poll.sample_type,
    moe: poll.moe === null ? "" : String(poll.moe),
    el_sayed: String(poll.el_sayed),
    rogers: String(poll.rogers),
    undecided: poll.undecided === null ? "" : String(poll.undecided),
    other: poll.other === null ? "" : String(poll.other),
    method: poll.method,
    source_url: poll.source_url,
    has_demo_crosstabs: poll.has_demo_crosstabs,
    has_geo_crosstabs: poll.has_geo_crosstabs,
    crosstab_notes: poll.crosstab_notes,
    entered_by: poll.entered_by || "matt",
  };
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

function draftToPayload(draft: Draft): Record<string, unknown> {
  return {
    id: draft.id.trim(),
    pollster: draft.pollster,
    sponsor: draft.sponsor,
    partisan: draft.partisan,
    field_start: draft.field_start,
    field_end: draft.field_end,
    published: draft.published,
    sample_size: Number(draft.sample_size),
    sample_type: draft.sample_type,
    moe: parseOptionalNumber(draft.moe),
    el_sayed: Number(draft.el_sayed),
    rogers: Number(draft.rogers),
    undecided: parseOptionalNumber(draft.undecided),
    other: parseOptionalNumber(draft.other),
    method: draft.method,
    source_url: draft.source_url,
    has_demo_crosstabs: draft.has_demo_crosstabs,
    has_geo_crosstabs: draft.has_geo_crosstabs,
    crosstab_notes: draft.crosstab_notes,
    entered_by: draft.entered_by.trim() || "matt",
    entered_at: new Date().toISOString(),
  };
}

export function AddPollForm({
  editing,
  existing,
  onSaved,
  onCancelEdit,
}: {
  editing: Poll | null;
  existing: Poll[];
  onSaved: () => void;
  onCancelEdit: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setDraft(editing ? pollToDraft(editing) : EMPTY);
    setErrors([]);
    setWarnings([]);
    setStatus(null);
  }, [editing]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]): void {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setStatus(null);
    const payload = draftToPayload(draft);
    const siblings = existing.filter((row) => row.id !== String(payload.id));
    const local = validatePoll(payload, siblings);
    if (!local.ok) {
      setErrors(local.errors);
      setWarnings([]);
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poll: local.poll }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        errors?: string[];
        warnings?: string[];
        error?: string;
        action?: string;
      };
      if (!res.ok || !body.ok) {
        const messages = body.errors ?? (body.error ? [body.error] : [`Save failed (${res.status})`]);
        setErrors(messages);
        setWarnings([]);
        return;
      }
      setErrors([]);
      setWarnings(body.warnings ?? []);
      setStatus(body.action === "edit" ? "Poll updated." : "Poll added.");
      if (!editing) setDraft({ ...EMPTY, entered_by: draft.entered_by });
      onSaved();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Save failed"]);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="poll-form" onSubmit={onSubmit}>
      <div className="poll-form__header">
        <h2>{editing ? "Edit poll" : "Add poll"}</h2>
        {editing ? (
          <button type="button" className="poll-form__cancel" onClick={onCancelEdit}>
            Cancel edit
          </button>
        ) : null}
      </div>
      <p className="muted">
        Required: source URL and field dates. Do not invent numbers. Flag D/R pollsters.
      </p>

      {errors.length > 0 ? (
        <ul className="poll-form__errors" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="poll-form__warnings" role="status">
          {warnings.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      {status ? <p className="poll-form__ok">{status}</p> : null}

      <div className="poll-form__grid">
        <label>
          Pollster
          <input
            value={draft.pollster}
            onChange={(e) => update("pollster", e.target.value)}
            required
          />
        </label>
        <label>
          Sponsor
          <input
            value={draft.sponsor}
            onChange={(e) => update("sponsor", e.target.value)}
            required
          />
        </label>
        <label>
          Partisan flag
          <select
            value={draft.partisan}
            onChange={(e) => update("partisan", e.target.value as PartisanFlag)}
          >
            <option value="none">none (nonpartisan)</option>
            <option value="D">D</option>
            <option value="R">R</option>
            <option value="media">media</option>
          </select>
        </label>
        <label>
          Sample type
          <select
            value={draft.sample_type}
            onChange={(e) => update("sample_type", e.target.value as SampleType)}
          >
            <option value="LV">LV</option>
            <option value="RV">RV</option>
            <option value="A">A</option>
          </select>
        </label>
        <label>
          Field start
          <input
            type="date"
            value={draft.field_start}
            onChange={(e) => update("field_start", e.target.value)}
            required
          />
        </label>
        <label>
          Field end
          <input
            type="date"
            value={draft.field_end}
            onChange={(e) => update("field_end", e.target.value)}
            required
          />
        </label>
        <label>
          Published
          <input
            type="date"
            value={draft.published}
            onChange={(e) => update("published", e.target.value)}
            required
          />
        </label>
        <label>
          Sample size
          <input
            type="number"
            min={1}
            step={1}
            value={draft.sample_size}
            onChange={(e) => update("sample_size", e.target.value)}
            required
          />
        </label>
        <label>
          MoE (blank = null)
          <input
            type="number"
            min={0}
            step="0.1"
            value={draft.moe}
            onChange={(e) => update("moe", e.target.value)}
          />
        </label>
        <label>
          El-Sayed %
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={draft.el_sayed}
            onChange={(e) => update("el_sayed", e.target.value)}
            required
          />
        </label>
        <label>
          Rogers %
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={draft.rogers}
            onChange={(e) => update("rogers", e.target.value)}
            required
          />
        </label>
        <label>
          Undecided % (blank = null)
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={draft.undecided}
            onChange={(e) => update("undecided", e.target.value)}
          />
        </label>
        <label>
          Other % (blank = null)
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={draft.other}
            onChange={(e) => update("other", e.target.value)}
          />
        </label>
        <label>
          Method
          <input
            value={draft.method}
            onChange={(e) => update("method", e.target.value)}
            placeholder="live phone, online, mixed"
            required
          />
        </label>
        <label className="poll-form__wide">
          Source URL
          <input
            type="url"
            value={draft.source_url}
            onChange={(e) => update("source_url", e.target.value)}
            placeholder="https://"
            required
          />
        </label>
        <label className="poll-form__wide">
          Notes
          <input
            value={draft.crosstab_notes}
            onChange={(e) => update("crosstab_notes", e.target.value)}
          />
        </label>
        <label>
          Entered by
          <input
            value={draft.entered_by}
            onChange={(e) => update("entered_by", e.target.value)}
          />
        </label>
        <label>
          Id (optional)
          <input
            value={draft.id}
            onChange={(e) => update("id", e.target.value)}
            placeholder="auto from pollster + field end"
          />
        </label>
        <label className="poll-form__check">
          <input
            type="checkbox"
            checked={draft.has_demo_crosstabs}
            onChange={(e) => update("has_demo_crosstabs", e.target.checked)}
          />
          Demo crosstabs
        </label>
        <label className="poll-form__check">
          <input
            type="checkbox"
            checked={draft.has_geo_crosstabs}
            onChange={(e) => update("has_geo_crosstabs", e.target.checked)}
          />
          Geo crosstabs
        </label>
      </div>

      <button type="submit" className="poll-form__submit" disabled={pending}>
        {pending ? "Saving…" : editing ? "Save changes" : "Add poll"}
      </button>
    </form>
  );
}
