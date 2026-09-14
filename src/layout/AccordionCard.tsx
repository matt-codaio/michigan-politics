import { useState, type MouseEvent, type ReactNode } from "react";
import { useSelection } from "../selection/useSelection";
import { GEO_QUERY_PARAM } from "../selection/constants";
import { isCardId, type CardId } from "../types/cards";

interface AccordionCardProps {
  id: CardId | string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function AccordionCard({
  id,
  title,
  defaultOpen = false,
  children,
}: AccordionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [geoId] = useSelection();
  const panelId = `card-panel-${id}`;

  function openPopout(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    if (!isCardId(id)) return;
    const url = `/popout/${id}?${GEO_QUERY_PARAM}=${encodeURIComponent(geoId)}`;
    const features =
      id === "elections"
        ? "popup=yes,width=960,height=800"
        : "popup=yes,width=520,height=760";
    window.open(url, `mi-explorer-${id}`, features);
  }

  return (
    <article className="accordion-card">
      <header className="accordion-card__header">
        <button
          type="button"
          className="accordion-card__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="accordion-card__chevron" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
          {title}
        </button>
        <button
          type="button"
          className="accordion-card__popout"
          aria-label={`Open ${title} in a new window`}
          title="Open in new window"
          onClick={openPopout}
        >
          ↗
        </button>
      </header>
      <div id={panelId} className="accordion-card__body" hidden={!open}>
        {children}
      </div>
    </article>
  );
}
