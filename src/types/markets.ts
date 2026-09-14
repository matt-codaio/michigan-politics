/**
 * Prediction-market snapshot. Always labeled **Not a poll** in the UI.
 * Never mix into poll averages.
 */
export interface MarketSnapshot {
  timestamp: string;
  /** Implied probability 0–1. */
  el_sayed_prob: number;
  /** Implied probability 0–1. */
  rogers_prob: number;
  venue: "polymarket";
  url: string;
}

export interface MarketsFile {
  snapshots: MarketSnapshot[];
}
