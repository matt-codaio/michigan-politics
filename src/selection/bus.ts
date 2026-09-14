import type { GeographyId } from "../types/geography";
import { SELECTION_CHANNEL, SELECTION_STORAGE_KEY } from "./constants";
import { defaultGeographyId, parseGeographyId, readGeoFromUrl, writeGeoToUrl } from "./geo";

export interface SelectionMessage {
  type: "geo";
  geoId: GeographyId;
}

type Listener = (geoId: GeographyId) => void;

const listeners = new Set<Listener>();

let channel: BroadcastChannel | null = null;
let started = false;
let current: GeographyId = defaultGeographyId();

function isSelectionMessage(data: unknown): data is SelectionMessage {
  if (typeof data !== "object" || data === null) return false;
  const rec = data as { type?: unknown; geoId?: unknown };
  return rec.type === "geo" && typeof rec.geoId === "string" && parseGeographyId(rec.geoId) !== null;
}

function readGeoFromStorage(): GeographyId | null {
  try {
    return parseGeographyId(localStorage.getItem(SELECTION_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeGeoToStorage(geoId: GeographyId): void {
  try {
    localStorage.setItem(SELECTION_STORAGE_KEY, geoId);
  } catch {
    // Private mode / blocked storage — BroadcastChannel may still work.
  }
}

function emit(geoId: GeographyId): void {
  current = geoId;
  for (const listener of listeners) listener(geoId);
}

function applyFromPeer(geoId: GeographyId): void {
  writeGeoToUrl(geoId);
  writeGeoToStorage(geoId);
  emit(geoId);
}

function onChannelMessage(event: MessageEvent): void {
  if (!isSelectionMessage(event.data)) return;
  const geoId = parseGeographyId(event.data.geoId);
  if (!geoId || geoId === current) return;
  applyFromPeer(geoId);
}

function onStorage(event: StorageEvent): void {
  if (event.key !== SELECTION_STORAGE_KEY || event.newValue == null) return;
  const geoId = parseGeographyId(event.newValue);
  if (!geoId || geoId === current) return;
  writeGeoToUrl(geoId);
  emit(geoId);
}

/** Call once on app boot. URL wins, then localStorage, then statewide `"26"`. */
export function initSelection(): void {
  if (started) return;
  started = true;
  current = readGeoFromUrl() ?? readGeoFromStorage() ?? defaultGeographyId();
  writeGeoToUrl(current);
  writeGeoToStorage(current);

  try {
    channel = new BroadcastChannel(SELECTION_CHANNEL);
    channel.addEventListener("message", onChannelMessage);
  } catch {
    channel = null;
  }

  window.addEventListener("storage", onStorage);
}

export function getSelection(): GeographyId {
  return current;
}

export function setSelection(geoId: GeographyId): void {
  const parsed = parseGeographyId(geoId);
  if (!parsed) return;
  writeGeoToUrl(parsed);
  writeGeoToStorage(parsed);
  try {
    channel?.postMessage({ type: "geo", geoId: parsed } satisfies SelectionMessage);
  } catch {
    // Channel closed or unavailable.
  }
  emit(parsed);
}

export function subscribeSelection(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
