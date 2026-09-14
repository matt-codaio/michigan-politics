import { Link, Outlet, useLocation } from "react-router-dom";
import { useCountiesGeo } from "../map/useCountiesGeo";
import { useSelection } from "../selection/useSelection";
import { MICHIGAN_STATE_GEO_ID } from "../types/geography";
import { requestGeoPalette } from "./GeoCommandPalette";

const NAV = [
  { to: "/", label: "Map" },
  { to: "/polls", label: "Polls" },
  { to: "/sources", label: "Sources" },
] as const;

function shortcutHint(): string {
  if (typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)) {
    return "⌘K";
  }
  return "Ctrl+K";
}

export function AppShell() {
  const location = useLocation();
  const [geoId, setGeoId] = useSelection();
  const { counties } = useCountiesGeo();
  const countyName = counties.find((county) => county.fips === geoId)?.name;
  const label =
    geoId === MICHIGAN_STATE_GEO_ID
      ? "Michigan"
      : (countyName ?? `County ${geoId}`);

  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__brand">
          <Link to={{ pathname: "/", search: location.search }}>
            Michigan Voting Explorer
          </Link>
          <p className="shell__sub">2026 Senate · El-Sayed vs Rogers · public data</p>
        </div>
        <nav className="shell__nav" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                className={active ? "is-active" : undefined}
                to={{ pathname: item.to, search: location.search }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="shell__geo">
          <button
            type="button"
            className="shell__geo-jump"
            onClick={requestGeoPalette}
          >
            Selection: <strong>{label}</strong>
            <kbd className="shell__kbd">{shortcutHint()}</kbd>
          </button>
          {geoId !== MICHIGAN_STATE_GEO_ID ? (
            <button type="button" onClick={() => setGeoId(MICHIGAN_STATE_GEO_ID)}>
              View Michigan
            </button>
          ) : null}
        </div>
      </header>
      <Outlet />
    </div>
  );
}
