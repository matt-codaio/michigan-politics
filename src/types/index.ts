/**
 * Shared data contracts. Later tracks import these types and must not change
 * them without a note. Geography is Michigan state (`"26"`) or county FIPS.
 */

export {
  MICHIGAN_STATE_GEO_ID,
  isCountyFips,
  isStateGeoId,
  isValidGeographyId,
  type CountyFeature,
  type GeographyId,
} from "./geography";

export {
  AGE_BUCKETS,
  EDUCATION_KEYS,
  INCOME_BRACKET_KEYS,
  RACE_KEYS,
  type AgeBucket,
  type DataVintage,
  type DemographicsBundle,
  type DemographicsFile,
  type EducationKey,
  type IncomeBracketKey,
  type PopulationPoint,
  type RaceKey,
} from "./demographics";

export {
  FEDERAL_ELECTION_YEARS,
  isFederalElectionYear,
  type ElectionCandidate,
  type ElectionYear,
  type ElectionsFile,
  type FederalOffice,
  type GeographyElections,
  type HouseDistrictResult,
  type Party,
  type YearOffices,
} from "./elections";

export {
  type AggregatorSnapshot,
  type PartisanFlag,
  type Poll,
  type PollChangelogEntry,
  type PollsFile,
  type SampleType,
} from "./polls";

export { type MarketSnapshot, type MarketsFile } from "./markets";

export {
  CARD_DEFAULT_OPEN,
  CARD_IDS,
  CARD_TITLES,
  isCardId,
  type CardId,
} from "./cards";

export { DATA_PATHS } from "./paths";
