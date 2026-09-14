/// <reference types="vite/client" />

interface MiExplorerBridge {
  arrangeCards: (geoId: string) => Promise<unknown>;
}

interface Window {
  miExplorer?: MiExplorerBridge;
}
