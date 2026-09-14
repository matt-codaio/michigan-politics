export const CARD_IDS = [
  "population",
  "age",
  "race",
  "education",
  "income",
  "cvap",
  "elections",
  "markets",
] as const;

export type CardId = (typeof CARD_IDS)[number];

export const CARD_TITLES: Record<CardId, string> = {
  population: "Population",
  age: "Age",
  race: "Race",
  education: "Education",
  income: "Income",
  cvap: "CVAP",
  elections: "Prior elections",
  markets: "Markets",
};

/** Education, income, race, age, and prior elections start collapsed. */
export const CARD_DEFAULT_OPEN: Record<CardId, boolean> = {
  population: true,
  age: false,
  race: false,
  education: false,
  income: false,
  cvap: true,
  elections: false,
  markets: true,
};

export function isCardId(value: string): value is CardId {
  return (CARD_IDS as readonly string[]).includes(value);
}
