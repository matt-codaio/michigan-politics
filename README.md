# Michigan Voting Explorer

Local volunteer dashboard for the 2026 Michigan U.S. Senate race (Abdul El-Sayed D vs Mike Rogers R). Public data only — no VAN, QVF, or individual voter files.

## Run

```bash
npm install
npm start
```

That opens **Michigan Voting Explorer** in its own desktop window (Electron). Data still lives in this repo's `local/` folder. After UI code changes, run `npm run build` once so the window picks them up (or use `npm run app:dev` for live reload).

```bash
npm run install:app
```

Puts **Michigan Voting Explorer** in `~/Applications` so you can open it from Spotlight or the Dock — no Terminal, no hunting for a Chrome tab.

Browser-only (Vite) is still available as `npm run dev` at [http://localhost:5173](http://localhost:5173). Copy `.env.example` to `.env` if you add an optional Census API key later.

```bash
npm run typecheck
```

Routes: `/` map explorer, `/polls` (poll desk + markets), `/sources`, `/popout/:cardId`. Geography is in the query string: `?geo=26` (statewide) or a 5-digit county FIPS (`?geo=26163`). Card pop-outs subscribe to the same selection (`BroadcastChannel("mi-explorer")` plus `localStorage` fallback).

## Local data (`local/`)

Generated and downloaded files live in `local/` (gitignored). Vite maps **`/data/*` → `local/*`**. Create the folders if needed (`local/polls`, `local/counties`, `local/markets`, `local/downloads`, `local/scratch`).

| Browser URL | On disk |
| --- | --- |
| `/data/counties/counties.geojson` | `local/counties/counties.geojson` |
| `/data/counties/demographics.json` | `local/counties/demographics.json` |
| `/data/counties/elections.json` | `local/counties/elections.json` |
| `/data/polls/polls.json` | `local/polls/polls.json` |
| `/data/markets/markets.json` | `local/markets/markets.json` |

Tiny committed shapes: `fixtures/`. Do not commit `local/`, `.env`, or any voter-file extract.

## Refresh county files (ingest)

```bash
npm run ingest:geo        # Census cartographic counties (shoreline) → local/counties/counties.geojson
npm run ingest:census     # PEP + ACS + CVAP → local/counties/demographics.json
npm run ingest:cvap       # CVAP zip only (staging); census ingest merges it
npm run ingest:elections  # OpenElections (+ MIT president fallback) → local/counties/elections.json
```

`ingest:census` downloads Census PEP (2000–2010 intercensal, 2010–2020 intercensal, Vintage 2025), ACS 2020–2024 5-year, and CVAP 2020–2024. Optional `CENSUS_API_KEY` in `.env` uses the ACS API; without a key the script streams table-based summary files. Raw files stay in `local/downloads/census/`.

`ingest:elections` downloads OpenElections Michigan county CSVs (statewide or per-county precinct files when a county CSV is incomplete), then MIT Election Lab presidential county returns for remaining presidential gaps. It writes `local/counties/elections.json` (even-year generals 2000–2024: President, U.S. Senate when Michigan had a race, U.S. House). Candidate source links point at [MVIC Vote History](https://mvic.sos.state.mi.us/votehistory/). Pass `--force` to re-download raw files.

Statewide totals are summed only when all 83 counties have that office. OpenElections currently has no usable 2020 rows for Keweenaw and St. Clair, so 2020 is omitted for those counties and for Michigan statewide — the UI notes the gap and does not invent votes.

Re-run the ingest you need, then reload the app. `/sources` shows whether each `local/` file is present. Raw downloads go under `local/downloads/`, not the repo root.

## Add a poll

1. `npm run seed:polls` writes the verified PRD §8 H2H rows to `local/polls/polls.json` (pass `--force` to overwrite).
2. Open `/polls` and use **Add poll**. `POST /api/polls` with `{ "poll": { … } }` adds or edits one row; `{ "polls": [ … ] }` replaces the file.
3. Validation rejects missing source URL or field dates, `field_end` before `field_start`, and El%+Rogers%+undecided above 100±2. Duplicate key `(pollster, field_end, sample_type)` warns but still saves. Create/edit append `local/polls/polls_changelog.jsonl`.
4. `npm run validate:polls` checks the file on disk. `npm run test:polls` runs the poll validation unit tests.

Required on every row: pollster, field start/end, sample type, El-Sayed % / Rogers %, **source URL**, timestamps. Flag partisan pollsters (D/R). Do not invent numbers.

## Markets (not a poll)

Prediction-market prices are trader consensus. The UI always labels them **Not a poll** and must never fold them into poll averages.

Manual snapshot (probabilities **0–1**):

```bash
cp fixtures/markets.sample.json local/markets/markets.json
```

Edit `snapshots[]`: `timestamp`, `el_sayed_prob`, `rogers_prob`, `venue: "polymarket"`, `url`. Source: [Polymarket Michigan Senate](https://polymarket.com/event/michigan-senate-election-winner).
