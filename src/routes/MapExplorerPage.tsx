import { AccordionCard } from "../layout/AccordionCard";
import { CardContent } from "../layout/CardContent";
import { CountyMap } from "../map/CountyMap";
import { useSelection } from "../selection/useSelection";
import { CARD_DEFAULT_OPEN, CARD_IDS, CARD_TITLES, type CardId } from "../types/cards";

const MAP_RAIL: CardId[] = CARD_IDS.filter((id) => id !== "markets");

export function MapExplorerPage() {
  const [geoId] = useSelection();

  return (
    <div className="explorer">
      <section className="explorer__map" aria-label="County map">
        <CountyMap />
      </section>
      <aside className="explorer__rail" aria-label="Geography cards">
        {MAP_RAIL.map((id) => (
          <AccordionCard
            key={id}
            id={id}
            title={CARD_TITLES[id]}
            defaultOpen={CARD_DEFAULT_OPEN[id]}
          >
            <CardContent cardId={id} geoId={geoId} />
          </AccordionCard>
        ))}
      </aside>
    </div>
  );
}
