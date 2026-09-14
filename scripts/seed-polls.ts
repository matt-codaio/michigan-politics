/**
 * Verified PRD §8 seed polls. Numbers and URLs re-checked 2026-09-11.
 * Writes gitignored local/polls/polls.json + changelog. Does not invent figures.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Poll, PollChangelogEntry, PollsFile } from "../src/types/polls.ts";
import { validatePollsArray } from "../src/polls/validate.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pollsDir = path.join(repoRoot, "local", "polls");
const pollsPath = path.join(pollsDir, "polls.json");
const changelogPath = path.join(pollsDir, "polls_changelog.jsonl");

const ENTERED_AT = "2026-09-11T10:00:00-05:00";
const ENTERED_BY = "agent";

const SEED_POLLS: Poll[] = [
  {
    id: "fox-beacon-shaw-2026-08-10",
    pollster: "Fox/Beacon+Shaw",
    sponsor: "Fox News",
    partisan: "media",
    field_start: "2026-08-06",
    field_end: "2026-08-10",
    published: "2026-08-13",
    sample_size: 1006,
    sample_type: "RV",
    moe: 3,
    el_sayed: 47,
    rogers: 51,
    undecided: 2,
    other: null,
    method: "live phone + text-to-web",
    source_url:
      "https://www.foxnews.com/politics/fox-news-poll-senate-battle-looms-michigan",
    has_demo_crosstabs: true,
    has_geo_crosstabs: false,
    crosstab_notes:
      "Beacon Research (D) and Shaw & Company (R). Topline PDF: El-Sayed 47, Rogers 51, DK 2. Full-sample MoE ±3.",
    entered_by: ENTERED_BY,
    entered_at: ENTERED_AT,
  },
  {
    id: "gbao-smp-2026-08-10",
    pollster: "GBAO",
    sponsor: "Senate Majority PAC",
    partisan: "D",
    field_start: "2026-08-06",
    field_end: "2026-08-10",
    published: "2026-08-14",
    sample_size: 800,
    sample_type: "LV",
    moe: 3.5,
    el_sayed: 50,
    rogers: 44,
    undecided: null,
    other: null,
    method: "live-caller + text-to-online",
    source_url: "https://senatemajority.com/wp-content/uploads/MI-Poll-August-15.pdf",
    has_demo_crosstabs: true,
    has_geo_crosstabs: false,
    crosstab_notes:
      "Partisan D poll (SMP). Memo reports 50–44 only; undecided not published — left null, not invented.",
    entered_by: ENTERED_BY,
    entered_at: ENTERED_AT,
  },
  {
    id: "fabrizio-aarp-2026-08-11",
    pollster: "Fabrizio/Impact (AARP)",
    sponsor: "AARP",
    partisan: "none",
    field_start: "2026-08-09",
    field_end: "2026-08-11",
    published: "2026-08-20",
    sample_size: 877,
    sample_type: "LV",
    moe: 3.3,
    el_sayed: 48,
    rogers: 47,
    undecided: 5,
    other: null,
    method: "live phone + SMS-to-web",
    source_url:
      "https://www.aarp.org/press/releases/2026-08-20-New-AARP-Michigan-Poll-Older-Voters-Critical-Demographic-in-Narrow-Senate-Governor-Races.html",
    has_demo_crosstabs: true,
    has_geo_crosstabs: false,
    crosstab_notes:
      "Bipartisan Fabrizio Ward (R) + Impact Research (D) for AARP. 48–47–5 among likely voters.",
    entered_by: ENTERED_BY,
    entered_at: ENTERED_AT,
  },
  {
    id: "susquehanna-2026-08-17",
    pollster: "Susquehanna",
    sponsor: "Susquehanna Polling & Research",
    partisan: "none",
    field_start: "2026-08-11",
    field_end: "2026-08-17",
    published: "2026-08-18",
    sample_size: 800,
    sample_type: "LV",
    moe: 3.46,
    el_sayed: 46,
    rogers: 39,
    undecided: 9,
    other: 4,
    method: "live telephone",
    source_url:
      "https://www.fox2detroit.com/news/el-sayed-rogers-michigan-senate-polls-susquehanna-aarp",
    has_demo_crosstabs: true,
    has_geo_crosstabs: false,
    crosstab_notes:
      "Self-released. Topline 46–39, 9% not sure, 4% other (2% refuse not stored). No partisan sponsor.",
    entered_by: ENTERED_BY,
    entered_at: ENTERED_AT,
  },
  {
    id: "msu-yougov-2026-08-20",
    pollster: "MSU/YouGov",
    sponsor: "MSU IPPSR / SOSS",
    partisan: "none",
    field_start: "2026-08-10",
    field_end: "2026-08-20",
    published: "2026-09-01",
    sample_size: 913,
    sample_type: "RV",
    moe: null,
    el_sayed: 48,
    rogers: 44,
    undecided: null,
    other: null,
    method: "YouGov online panel",
    source_url:
      "https://ippsr.msu.edu/news/msu-poll-shows-democrats-lead-republicans-coalesce-behind-rogers",
    has_demo_crosstabs: false,
    has_geo_crosstabs: false,
    crosstab_notes:
      "Registered voters n=913: 48–44. Likely voters n=779: 50–45 (not a second row). IPPSR did not publish an RV MoE; left null.",
    entered_by: ENTERED_BY,
    entered_at: ENTERED_AT,
  },
  {
    id: "epic-mra-2026-08-28",
    pollster: "EPIC-MRA",
    sponsor: "EPIC-MRA",
    partisan: "none",
    field_start: "2026-08-22",
    field_end: "2026-08-28",
    published: "2026-09-01",
    sample_size: 600,
    sample_type: "LV",
    moe: 4,
    el_sayed: 47,
    rogers: 43,
    undecided: 10,
    other: null,
    method: "live interview (mostly cell)",
    source_url:
      "https://www.fox2detroit.com/news/abdul-el-sayed-leads-mike-rogers-latest-poll",
    has_demo_crosstabs: true,
    has_geo_crosstabs: false,
    crosstab_notes:
      "Including leaners: El-Sayed 47, Rogers 43, undecided/refused 10. Frequency report hosted by EPIC-MRA.",
    entered_by: ENTERED_BY,
    entered_at: ENTERED_AT,
  },
  {
    id: "glengariff-2026-09-03",
    pollster: "Glengariff",
    sponsor: "Detroit News / WDIV",
    partisan: "media",
    field_start: "2026-08-31",
    field_end: "2026-09-03",
    published: "2026-09-08",
    sample_size: 600,
    sample_type: "LV",
    moe: 4,
    el_sayed: 44.4,
    rogers: 45.8,
    undecided: 9.4,
    other: 0.3,
    method: "live-operator telephone",
    source_url:
      "https://www.clickondetroit.com/news/local/2026/09/08/poll-which-us-senate-candidates-are-most-favorable-to-michigan-voters/",
    has_demo_crosstabs: true,
    has_geo_crosstabs: false,
    crosstab_notes:
      "WDIV/Detroit News. H2H including leans: El-Sayed 44.4, Rogers 45.8, other 0.3, DK/refused 9.4 (same as undecided line, not additive).",
    entered_by: ENTERED_BY,
    entered_at: ENTERED_AT,
  },
  {
    id: "cnn-ssrs-2026-09-06",
    pollster: "CNN/SSRS",
    sponsor: "CNN",
    partisan: "media",
    field_start: "2026-08-31",
    field_end: "2026-09-06",
    published: "2026-09-09",
    sample_size: 843,
    sample_type: "LV",
    moe: 4.1,
    el_sayed: 47,
    rogers: 44,
    undecided: 5,
    other: 3,
    method: "online+phone",
    source_url:
      "https://www.cnn.com/2026/09/09/politics/cnn-polls-maine-senate-michigan-senate-abdul-el-sayed-susan-collins",
    has_demo_crosstabs: true,
    has_geo_crosstabs: false,
    crosstab_notes:
      "Likely voters including leaners: 47–44, neither 5, other 3. Crosstabs: documentcloud.org/documents/28608784.",
    entered_by: ENTERED_BY,
    entered_at: ENTERED_AT,
  },
];

const force = process.argv.includes("--force");

const validated = validatePollsArray(SEED_POLLS);
if (!validated.ok) {
  console.error(validated.errors.join("\n"));
  process.exit(1);
}
if (validated.warnings.length > 0) {
  for (const warning of validated.warnings) console.warn(warning);
}

if (fs.existsSync(pollsPath) && !force) {
  const existing = JSON.parse(fs.readFileSync(pollsPath, "utf8")) as PollsFile;
  if (Array.isArray(existing.polls) && existing.polls.length > 0) {
    console.log(
      `Kept ${existing.polls.length} existing poll(s) in local/polls/polls.json (pass --force to overwrite with seed).`,
    );
    process.exit(0);
  }
}

fs.mkdirSync(pollsDir, { recursive: true });
const file: PollsFile = { polls: validated.polls };
fs.writeFileSync(pollsPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");

const changelog: PollChangelogEntry[] = validated.polls.map((poll) => ({
  at: ENTERED_AT,
  action: "create",
  poll_id: poll.id,
  entered_by: ENTERED_BY,
}));
fs.writeFileSync(
  changelogPath,
  changelog.map((entry) => JSON.stringify(entry)).join("\n") + "\n",
  "utf8",
);

console.log(`Seeded ${validated.polls.length} polls → ${path.relative(repoRoot, pollsPath)}`);
