/** Matches PRD §7 JSON keys (snake_case) so agents can edit `polls.json` directly. */

export type PartisanFlag = "none" | "D" | "R" | "media";

export type SampleType = "LV" | "RV" | "A";

export interface Poll {
  id: string;
  pollster: string;
  sponsor: string;
  /** `"none"` = nonpartisan / not a party-sponsored poll. Flag D/R/media in the UI. */
  partisan: PartisanFlag;
  field_start: string;
  field_end: string;
  published: string;
  sample_size: number;
  sample_type: SampleType;
  moe: number | null;
  el_sayed: number;
  rogers: number;
  undecided: number | null;
  other: number | null;
  method: string;
  source_url: string;
  has_demo_crosstabs: boolean;
  has_geo_crosstabs: boolean;
  crosstab_notes: string;
  entered_by: string;
  entered_at: string;
}

export interface AggregatorSnapshot {
  name: string;
  average_el_sayed: number | null;
  average_rogers: number | null;
  as_of: string;
  source_url: string;
}

export interface PollsFile {
  polls: Poll[];
  aggregators?: AggregatorSnapshot[];
}

export interface PollChangelogEntry {
  at: string;
  action: "create" | "edit";
  poll_id: string;
  entered_by: string;
}
