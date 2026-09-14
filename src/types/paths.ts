/**
 * URLs served by Vite from `local/` (see `vite/local-data-plugin.ts`).
 * Processed files are gitignored; tiny shapes live in `fixtures/`.
 */
export const DATA_PATHS = {
  countiesGeojson: "/data/counties/counties.geojson",
  demographics: "/data/counties/demographics.json",
  elections: "/data/counties/elections.json",
  polls: "/data/polls/polls.json",
  markets: "/data/markets/markets.json",
} as const;
