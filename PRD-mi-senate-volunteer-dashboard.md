# PRD: Michigan Senate Volunteer Dashboard (El-Sayed vs Rogers)

**Owner:** Matt Hudson (volunteer; Superhuman CFO)  
**Working title:** `MI Senate Map & Poll Desk`  
**Status:** Draft for Cursor handoff — fill **§12 UI sketch** before build if possible  
**Date:** 2026-09-09  
**Out of scope forever (v1):** VAN, QVF individual targeting, modeled scores, contacting voters/campaigns, inventing poll numbers  

---

## 1. Problem

Matt tracks the 2026 Michigan U.S. Senate race (Abdul El-Sayed D vs Mike Rogers R) for volunteer call-time and fundraising. Data lives in many places:

- Statewide polls (CNN/SSRS, Glengariff, EPIC-MRA, MSU, aggregators)
- County results from prior elections (SOS / MVIC)
- Registration / turnout dashboards (Michigan SOS)
- Prediction markets (Polymarket) as a separate, non-poll signal

There is **no single volunteer-facing place** to see recent polls, add a new poll cleanly, and put those next to **county geography + registration + prior election margins**.

## 2. Goal (v1 success)

A local or simple web app where Matt can:

1. See a **ranked / chronological poll table** + trend chart for MI Senate H2H.
2. **Add a new poll** via a form (or CSV row) with required metadata; it appears on charts immediately.
3. View an **interactive Michigan county map** colored by a chosen prior race (e.g. 2024 Prez, 2022/2024 Senate, 2026 Dem primary).
4. Click a county to see **registration (if available), turnout, and prior margins**.
5. Keep **markets** (Polymarket) as an optional secondary panel — never mixed into poll averages without a clear label.

**Non-goal:** Predicting the election with a proprietary model; replacing staff VAN tools.

## 3. Users & jobs-to-be-done

| User | Job |
|------|-----|
| Matt (primary) | “What do the latest polls say, and where in MI should I mentally focus for call-time / fundraising narrative?” |
| Future self / Cursor agent | Ingest a newly released poll in &lt;5 minutes without breaking history. |

## 4. Product principles

1. **Fact vs claim vs rumor** — polls and official returns are facts; market prices are trader consensus; never invent crosstabs.
2. **Timestamps everywhere** — field dates, publish date, source URL required on every poll.
3. **Partisan pollsters flagged** — visual badge (D/R/media/nonpartisan).
4. **Geography ≠ polls** — county map is **prior elections / registration**, not “this week’s CNN by county” (unless a poll publishes geo, which most don’t).
5. **Public data only** — SOS, FEC-adjacent not required for v1, news links for poll cites.

## 5. MVP scope (must ship)

### 5.1 Poll desk
- Table of H2H polls: pollster, sponsor, field start/end, sample size, MoE, population (LV/RV), El-Sayed %, Rogers %, undecided %, source URL, notes, partisan flag.
- Chart: time series of El-Sayed / Rogers from verified rows only.
- Aggregator snapshot fields (manual entry OK in v1): PollingSource / RCP average + as-of date + URL.
- Filter: date range, LV-only, hide partisan.

### 5.2 Poll ingest workflow
- UI form **“Add poll”** writing to `data/polls.json` (or SQLite).
- Validation: required fields; El%+Rogers%+undecided roughly ≤ 100±2; field end ≥ start; unique key `(pollster, field_end, sample_type)` warn on duplicate.
- Optional: paste “from brief” markdown → structured fields (nice-to-have, not blocking).
- Changelog: `data/polls_changelog.jsonl` append on create/edit.

### 5.3 County map
- Michigan counties (GeoJSON).
- Choropleth modes (toggle):
  - 2024 Presidential margin (or Dem share)
  - 2022 and/or 2024 U.S. Senate margin (if data file present)
  - 2026 Dem primary El-Sayed vs Stevens (if data file present)
  - Registered voters (absolute or per county) when SOS-derived CSV available
- Click county → side panel: name, FIPS, registration, turnout (if present), prior margins, notes.
- Search county by name.

### 5.4 Markets panel (secondary)
- Manual or scraped-later fields: Polymarket El-Sayed ¢, Rogers ¢, as-of timestamp, URL.
- Clear label: **Not a poll.**

### 5.5 Empty / sketch space
- In-app page or markdown section **“Matt’s UI wishes”** editable locally (see §12).

## 6. Explicit non-goals (v1)

- VAN / MiniVAN / QVF individual or turf maps  
- Live auto-scrape of every pollster (manual + occasional agent assist is fine)  
- SMS / donor CRM  
- Auth multi-user  
- Mobile-perfect polish (usable tablet OK)  
- Invented demographic crosstabs on the map  

## 7. Data model (suggested)

### `polls[]`
```json
{
  "id": "cnn-ssrs-2026-09-06",
  "pollster": "CNN/SSRS",
  "sponsor": "CNN",
  "partisan": "none",
  "field_start": "2026-08-31",
  "field_end": "2026-09-06",
  "published": "2026-09-09",
  "sample_size": 843,
  "sample_type": "LV",
  "moe": 4.1,
  "el_sayed": 47,
  "rogers": 44,
  "undecided": null,
  "other": null,
  "method": "online+phone",
  "source_url": "https://www.cnn.com/...",
  "has_demo_crosstabs": true,
  "has_geo_crosstabs": false,
  "crosstab_notes": "Party/age/gender/race in article; no region tables in PDF",
  "entered_by": "matt|agent",
  "entered_at": "2026-09-09T19:00:00-05:00"
}
```

### `counties[]` (from static build)
- `geoid` / FIPS, name, centroid optional  
- Metrics keyed by `metric_id` → number  

### `metrics` catalog
- e.g. `pres_2024_dem_share`, `pres_2024_margin`, `reg_voters_2024`, `senate_2024_dem_share`, `dem_primary_2026_elsayed_share`

### `markets_snapshots[]`
- timestamp, el_sayed_prob, rogers_prob, venue (`polymarket`), url

## 8. Data sources (public)

| Need | Source | How for v1 |
|------|--------|------------|
| Poll headlines + demos | CNN, Free Press, MLive, ClickOnDetroit, PollingSource, 270toWin | Manual entry + URL |
| Official county results | [MVIC Vote History](https://mvic.sos.state.mi.us/votehistory/Index?type=C) | One-time CSV extract / scrape script |
| Registration | [MVIC Voter Count](https://mvic.sos.state.mi.us/VoterCount/Index), SOS PDFs | CSV load |
| Participation dashboard | [MI Voting Dashboard](https://www.michigan.gov/sos/elections/election-results-and-data/voter-participation-dashboard) | Link out + optional CSV later |
| County shapes | US Census county GeoJSON (MI filter) | Static file in repo |
| Historical maps reference | uselectionatlas.org, NYT maps | Inspiration / QA only |
| Markets | polymarket.com/event/michigan-senate-election-winner | Manual snapshot or later fetch |

**Seed polls to include at launch** (already verified in Small Fry briefs — implementer should re-verify URLs): Fox/Beacon+Shaw Aug 6–10; GBAO; Fabrizio/AARP; Susquehanna; MSU/YouGov; EPIC-MRA Aug 22–28; Glengariff Aug 31–Sep 3; CNN/SSRS Aug 31–Sep 6.

## 9. UX structure (IA)

1. **Overview** — bottom line strip (“newest poll”, “aggregator”, “market”), sparkline  
2. **Polls** — table + chart + Add Poll  
3. **Map** — choropleth + county drawer  
4. **Sources** — links + “last data refresh”  
5. **Scratchpad / UI wishes** — Matt’s freeform notes (§12)  

## 10. Technical suggestions (Cursor may choose)

- **Stack:** Next.js or Vite+React; map via MapLibre/Leaflet; charts via Recharts/Observable Plot.  
- **Storage:** flat files in `/data` committed to repo for portability (JSON/CSV) — easy for agents to edit.  
- **Deploy:** local `npm run dev` first; optional static export.  
- **Scripts:** `npm run import:counties` / `npm run validate:polls`.  
- **Tests:** schema validation for polls; snapshot test that chart excludes nulls.

## 11. Acceptance criteria (v1)

- [ ] Can open app locally and see ≥5 seeded H2H polls on a chart.  
- [ ] Can add a poll via form; it appears on table+chart without code change.  
- [ ] Invalid poll (missing URL or field dates) is rejected with a clear error.  
- [ ] County map renders all MI counties; clicking Wayne/Oakland/Kent shows a detail panel.  
- [ ] At least one prior-election metric and one registration metric load from `/data`.  
- [ ] Markets panel visibly labeled non-poll.  
- [ ] README documents how to add a poll and refresh county CSVs.  
- [ ] No VAN/QVF individual data anywhere in the repo.

## 12. Matt’s UI sketch / wishes *(fill this in)*

> Free space for wireframe notes, screenshots, or bullets. Cursor should treat this as product input.

```
[Sketch here — ASCII, bullets, or “see attached image”]


What I care about most on first load:



Poll add flow — anything annoying to avoid:



Map defaults I want (which election year / metric):



Nice-to-haves if easy:



```

## 13. Phased roadmap

| Phase | Deliverable |
|-------|-------------|
| **v1** | Poll desk + manual ingest + county map + registration/prior margins + scratchpad |
| **v1.1** | Import poll from pasted CNN/Free Press URL via agent-assisted script; crosstab notes fields |
| **v2** | Precinct layer for one metro (Detroit) if public shapefiles easy; compare two elections swipe |
| **v3** | Optional Polymarket auto-snapshot; export PNG for morning brief |

## 14. Handoff prompt for Cursor (copy-paste)

```
Build the MI Senate Volunteer Dashboard per PRD at:
PRD-mi-senate-volunteer-dashboard.md

Constraints:
- Public data only; no VAN/QVF targeting.
- Polls are statewide; map is prior elections + registration.
- Implement Add Poll → data/polls.json with validation.
- Seed with the polls listed in the PRD (verify URLs).
- Leave §12 scratchpad editable in the app or as SCRATCHPAD.md.
- README with run instructions.

Ask me only if a data source choice is blocked; otherwise pick sensible defaults (Vite+React+MapLibre is fine).
```

## 15. Open questions

1. Prefer **local-only** vs deployed URL (Vercel)?  
2. Which **default map metric**: 2024 Prez margin vs 2026 Dem primary?  
3. Should aggregator averages be **manual** only in v1? (Recommended: yes.)

---

*Prepared for handoff to Cursor. Companion chat context: Small Fry MI Senate briefs + CNN/SSRS Sep 9 2026 crosstab notes (demos yes, geo no).*
