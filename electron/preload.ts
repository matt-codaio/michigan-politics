import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("miExplorer", {
  arrangeCards: (geoId: string) => ipcRenderer.invoke("arrange-cards", geoId),
});
