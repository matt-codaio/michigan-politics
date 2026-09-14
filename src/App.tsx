import { Route, Routes } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { GeoCommandPalette } from "./layout/GeoCommandPalette";
import { MapExplorerPage } from "./routes/MapExplorerPage";
import { PollsPage } from "./routes/PollsPage";
import { PopoutPage } from "./routes/PopoutPage";
import { SourcesPage } from "./routes/SourcesPage";

export function App() {
  return (
    <>
      <GeoCommandPalette />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<MapExplorerPage />} />
          <Route path="/polls" element={<PollsPage />} />
          <Route path="/sources" element={<SourcesPage />} />
        </Route>
        <Route path="/popout/:cardId" element={<PopoutPage />} />
      </Routes>
    </>
  );
}
