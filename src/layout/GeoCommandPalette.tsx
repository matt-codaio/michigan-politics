import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useCountiesGeo } from "../map/useCountiesGeo";
import { useSelection } from "../selection/useSelection";
import {
  MICHIGAN_STATE_GEO_ID,
  type CountyFeature,
  type GeographyId,
} from "../types";

export const OPEN_GEO_PALETTE = "mi-explorer:open-geo-palette";

export function requestGeoPalette(): void {
  window.dispatchEvent(new Event(OPEN_GEO_PALETTE));
}

type PaletteItem = {
  id: string;
  label: string;
  hint: string;
  geoId: GeographyId;
};

const ALL_ITEM: PaletteItem = {
  id: "all",
  label: "All",
  hint: "Michigan statewide",
  geoId: MICHIGAN_STATE_GEO_ID,
};

export function filterCounties(counties: CountyFeature[], query: string): CountyFeature[] {
  const q = query.trim().toLowerCase();
  if (!q) return counties;
  const starts: CountyFeature[] = [];
  const contains: CountyFeature[] = [];
  for (const county of counties) {
    const name = county.name.toLowerCase();
    if (name.startsWith(q) || county.fips.startsWith(q)) starts.push(county);
    else if (name.includes(q) || county.fips.includes(q)) contains.push(county);
  }
  return [...starts, ...contains];
}

function queryTargetsAll(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return ["all", "michigan", "statewide"].some((word) => word.startsWith(q));
}

function isPaletteToggle(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
}

export function GeoCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [geoId, setGeoId] = useSelection();
  const { counties, status } = useCountiesGeo();
  const listId = useId();

  const items = useMemo<PaletteItem[]>(() => {
    const matched = filterCounties(counties, query).map((county) => ({
      id: county.fips,
      label: county.name,
      hint: county.fips,
      geoId: county.fips,
    }));
    return queryTargetsAll(query) ? [ALL_ITEM, ...matched] : matched;
  }, [counties, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isPaletteToggle(event)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_GEO_PALETTE, onOpen);
    return () => window.removeEventListener(OPEN_GEO_PALETTE, onOpen);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      const idx = items.findIndex((item) => item.geoId === geoId);
      setActive(idx >= 0 ? idx : 0);
      return;
    }
    if (queryTargetsAll(query)) {
      const allIdx = items.findIndex((item) => item.id === "all");
      setActive(allIdx >= 0 ? allIdx : 0);
      return;
    }
    const countyIdx = items.findIndex((item) => item.id !== "all");
    setActive(countyIdx >= 0 ? countyIdx : 0);
  }, [open, query, items, geoId]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (item: PaletteItem) => {
    setGeoId(item.geoId);
    setOpen(false);
  };

  if (!open) return null;

  const activeItem = items[active] ?? items[0];
  const noCountyMatch =
    Boolean(query.trim()) &&
    counties.length > 0 &&
    items.every((item) => item.id === "all");

  return (
    <div
      className="geo-palette-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div
        className="geo-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Jump to county"
      >
        <input
          ref={inputRef}
          className="geo-palette__input"
          type="search"
          placeholder="Jump to county…"
          value={query}
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeItem ? `${listId}-${activeItem.id}` : undefined}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((i) => Math.min(i + 1, items.length - 1));
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
              return;
            }
            if (event.key === "Enter" && activeItem) {
              event.preventDefault();
              choose(activeItem);
            }
          }}
        />
        <ul id={listId} className="geo-palette__list" role="listbox">
          {items.map((item, index) => {
            const isActive = index === active;
            const current = item.geoId === geoId;
            return (
              <li key={item.id} role="presentation">
                <button
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  id={`${listId}-${item.id}`}
                  role="option"
                  aria-selected={isActive}
                  className={
                    isActive ? "geo-palette__item is-active" : "geo-palette__item"
                  }
                  onPointerMove={() => setActive(index)}
                  onClick={() => choose(item)}
                >
                  <span className="geo-palette__label">{item.label}</span>
                  <span className="geo-palette__hint">
                    {current ? "Current · " : ""}
                    {item.hint}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {status === "loading" && counties.length === 0 ? (
          <p className="geo-palette__status">Loading counties…</p>
        ) : null}
        {status === "missing" || status === "error" ? (
          <p className="geo-palette__status">
            County list unavailable. All still selects statewide.
          </p>
        ) : null}
        {noCountyMatch ? <p className="geo-palette__status">No matching counties.</p> : null}
      </div>
    </div>
  );
}
