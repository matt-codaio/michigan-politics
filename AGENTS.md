# Agent instructions — michigan-politics

This repo is a **local volunteer dashboard** for the 2026 Michigan U.S. Senate race (Abdul El-Sayed D vs Mike Rogers R). Product source of truth: `PRD-mi-senate-volunteer-dashboard.md`.

Owner is Matt Hudson. Prefer coding in the repo over long planning. Ask only when a data-source choice is blocked; otherwise pick sensible defaults.

## Local data directory (do not commit)

Treat **`local/`** as a private data repository. It is gitignored. Use it for anything that should live on disk but not in Git:

- Downloaded CSVs, PDFs, GeoJSON, pollster exports
- Working copies of `polls.json`, changelogs, market snapshots
- Screenshots, sketches, scratch notes, one-off scripts’ output
- Anything with registration/turnout extracts or other bulky public data

Rules:

1. Create `local/` if it does not exist. Never `git add` it.
2. Put **generated and downloaded data** in `local/`, not the repo root.
3. Code, schemas, small fixtures for tests, and docs stay in Git.
4. If the app needs a committed example, add a tiny sample under something like `fixtures/` — not a full SOS extract.
5. Do not copy `local/` contents into PRs, commit messages, or chat dumps.

Suggested layout (create as needed):

```
local/
  polls/          # polls.json, polls_changelog.jsonl
  counties/       # GeoJSON, election / registration CSVs
  markets/        # Polymarket snapshots
  downloads/      # raw files from SOS, Census, news PDFs
  scratch/        # images, notes, experiments
```

The running app should read/write data from `local/` (with a documented default path). Do not assume data files are in the Git tree.

## Git

- Honor `.gitignore`. If a new data or secret path appears, add it to `.gitignore` instead of committing it.
- Do not commit `.env`, credentials, or VAN/QVF/individual-voter files (those are out of scope anyway).
- Do not commit unless Matt asks.

## Product constraints (always)

- **Public data only.** No VAN, MiniVAN, QVF, individual targeting, modeled voter scores, or contacting voters/campaigns.
- **Do not invent poll numbers** or demographic crosstabs. Polls and official returns are facts; market prices are trader consensus — never mix markets into poll averages without a clear “Not a poll” label.
- **Geography ≠ polls.** The county map is prior elections and registration, not “this week’s poll by county” unless a poll actually published geo.
- Every poll row needs timestamps and a source URL. Flag partisan pollsters.
- Out of scope for v1: live scrape of every pollster, SMS/CRM, multi-user auth, proprietary prediction models.

## How to work

1. Read the PRD before building or changing UX. Do not create or use a scratchpad markdown file.
2. Prefer the desktop app (`npm start`) for daily use. `npm run dev` still runs the Vite browser app. Vite + React + MapLibre is the UI.
3. Validate polls (required fields, field dates, duplicate key warning). Append to a changelog when creating/editing polls.
4. Keep README accurate for how to run the app (desktop `npm start` or Vite `npm run dev`), add a poll, and refresh county files from `local/`.
5. Match existing style. Do not add extra markdown files unless asked.
