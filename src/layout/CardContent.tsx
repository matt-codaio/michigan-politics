import type { ComponentType } from "react";
import { MarketsPanel } from "../markets/MarketsPanel";
import { AgeCard } from "../panels/AgeCard";
import { CvapCard } from "../panels/CvapCard";
import { EducationCard } from "../panels/EducationCard";
import { ElectionsCard } from "../panels/ElectionsCard";
import { IncomeCard } from "../panels/IncomeCard";
import { PopulationCard } from "../panels/PopulationCard";
import { RaceCard } from "../panels/RaceCard";
import { MICHIGAN_STATE_GEO_ID, type GeographyId } from "../types/geography";
import type { CardId } from "../types/cards";

export interface GeoCardProps {
  geoId: GeographyId;
}

/** Shared card body for the map rail and `/popout/:cardId`. */
const CARDS: Record<CardId, ComponentType<GeoCardProps>> = {
  population: PopulationCard,
  age: AgeCard,
  race: RaceCard,
  education: EducationCard,
  income: IncomeCard,
  cvap: CvapCard,
  elections: ElectionsCard,
  markets: MarketsPanel,
};

export function selectionLabel(geoId: GeographyId): string {
  return geoId === MICHIGAN_STATE_GEO_ID ? "Michigan" : `county ${geoId}`;
}

export function CardContent({
  cardId,
  geoId,
}: {
  cardId: CardId;
  geoId: GeographyId;
}) {
  const Card = CARDS[cardId];
  return <Card geoId={geoId} />;
}
