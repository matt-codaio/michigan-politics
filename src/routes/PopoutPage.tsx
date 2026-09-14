import { useParams } from "react-router-dom";
import { CardContent, selectionLabel } from "../layout/CardContent";
import { CARD_TITLES, isCardId } from "../types/cards";
import { useSelection } from "../selection/useSelection";

export function PopoutPage() {
  const { cardId } = useParams();
  const [geoId] = useSelection();

  if (!cardId || !isCardId(cardId)) {
    return (
      <main className="page popout-page">
        <h1>Unknown card</h1>
        <p>Expected a card id from the explorer rail.</p>
      </main>
    );
  }

  const wide = cardId === "elections";

  return (
    <main
      className={wide ? "page popout-page popout-page--wide" : "page popout-page"}
    >
      <h1>{CARD_TITLES[cardId]}</h1>
      <p className="popout-page__selection" aria-live="polite">
        Selection: <strong>{selectionLabel(geoId)}</strong> (<code>{geoId}</code>
        )
      </p>
      <CardContent cardId={cardId} geoId={geoId} />
    </main>
  );
}
