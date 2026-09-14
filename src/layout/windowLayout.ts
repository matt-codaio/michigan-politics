import type { CardId } from "../types/cards";

export const TILE_POPOUT_IDS = ["age", "race", "education", "income"] as const;
export type TilePopoutId = (typeof TILE_POPOUT_IDS)[number];

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function layoutMainAndTiles(
  workArea: Rect,
  gap = 8,
): { main: Rect; tiles: { id: TilePopoutId; bounds: Rect }[] } {
  const maxGrid = Math.max(480, workArea.width - 520 - gap);
  const colW = Math.max(
    240,
    Math.min(Math.round(workArea.width * 0.2), Math.floor((maxGrid - gap) / 2)),
  );
  const gridW = colW * 2 + gap;
  const gridX = workArea.x + workArea.width - gridW;
  const rowH = Math.max(200, Math.floor((workArea.height - gap) / 2));
  const main: Rect = {
    x: workArea.x,
    y: workArea.y,
    width: Math.max(400, gridX - workArea.x - gap),
    height: workArea.height,
  };
  const tiles = TILE_POPOUT_IDS.map((id, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
      id,
      bounds: {
        x: gridX + col * (colW + gap),
        y: workArea.y + row * (rowH + gap),
        width: colW,
        height: rowH,
      },
    };
  });
  return { main, tiles };
}

export function cardPopoutPath(id: CardId, geoId: string): string {
  return `/popout/${id}?geo=${encodeURIComponent(geoId)}`;
}
