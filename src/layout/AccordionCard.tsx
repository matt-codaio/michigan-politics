import { useState, type MouseEvent, type ReactNode } from "react";
import { useSelection } from "../selection/useSelection";
import { isCardId, type CardId } from "../types/cards";
import { openCardPopout } from "./popoutWindows";

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
    openCardPopout(id, geoId);
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
