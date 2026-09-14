import { GEO_QUERY_PARAM } from "../selection/constants";
import type { CardId } from "../types/cards";
import { layoutMainAndTiles, type Rect } from "./windowLayout";

export function cardPopoutUrl(id: CardId, geoId: string): string {
  return `/popout/${id}?${GEO_QUERY_PARAM}=${encodeURIComponent(geoId)}`;
}

export function cardPopoutName(id: CardId): string {
  return `mi-explorer-${id}`;
}

export function openCardPopout(id: CardId, geoId: string, bounds?: Rect): Window | null {
  const features = bounds
    ? `popup=yes,width=${Math.round(bounds.width)},height=${Math.round(bounds.height)},left=${Math.round(bounds.x)},top=${Math.round(bounds.y)}`
    : id === "elections"
      ? "popup=yes,width=960,height=800"
      : "popup=yes,width=520,height=760";
  return window.open(cardPopoutUrl(id, geoId), cardPopoutName(id), features);
}

function arrangeCardsInBrowser(geoId: string): void {
  const screen = window.screen as Screen & { availLeft?: number; availTop?: number };
  const area = {
    x: screen.availLeft ?? 0,
    y: screen.availTop ?? 0,
    width: screen.availWidth,
    height: screen.availHeight,
  };
  const { main, tiles } = layoutMainAndTiles(area);
  window.moveTo(main.x, main.y);
  window.resizeTo(main.width, main.height);
  for (const tile of tiles) {
    openCardPopout(tile.id, geoId, tile.bounds);
  }
  openCardPopout("elections", geoId, {
    x: area.x,
    y: area.y,
    width: Math.min(1100, area.width),
    height: area.height,
  });
}

/** Electron tiles on the main display and full-screens elections on another monitor. */
export async function arrangeCardWindows(geoId: string): Promise<void> {
  if (window.miExplorer?.arrangeCards) {
    await window.miExplorer.arrangeCards(geoId);
    return;
  }
  arrangeCardsInBrowser(geoId);
}
