import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useSelection } from "../selection";
import { MICHIGAN_STATE_GEO_ID, isCountyFips } from "../types";
import { applyChoropleth, NO_DATA_FILL } from "./choropleth";
import { CountySearch } from "./CountySearch";
import { collectionBounds, featureBounds } from "./geojson";
import {
  COUNTIES_FILL,
  COUNTIES_HIGHLIGHT,
  COUNTIES_LABEL,
  COUNTIES_LINE,
  COUNTIES_SOURCE,
  COUNTY_LABEL_FONTS,
  MAP_STYLE,
} from "./mapStyle";
import { useCountiesGeo } from "./useCountiesGeo";
import { useElectionMetrics } from "./useElectionMetrics";

const INTERACTIVE_LAYERS = [COUNTIES_FILL, COUNTIES_LABEL];

export function CountyMap() {
  const [geoId, setGeoId] = useSelection();
  const { status, geojson, counties, message } = useCountiesGeo();
  const elections = useElectionMetrics();
  const painted = useMemo(
    () => (geojson ? applyChoropleth(geojson, elections.margins) : null),
    [geojson, elections.margins],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const fittedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = new maplibregl.Map({
      container: el,
      style: MAP_STYLE,
      center: [-85.5, 44.35],
      zoom: 5.3,
      attributionControl: {
        compact: true,
        customAttribution: "Counties: U.S. Census cartographic boundaries · Basemap: Esri World Topo",
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    // `load` waits for every source (including remote raster tiles). If those
    // hang, county overlays never appear. Style parse is enough to add GeoJSON.
    const markReady = () => setMapReady(true);
    map.on("style.load", markReady);
    map.on("load", markReady);
    if (map.isStyleLoaded()) markReady();

    map.on("click", (event) => {
      const layers = INTERACTIVE_LAYERS.filter((id) => map.getLayer(id));
      const hits =
        layers.length > 0 ? map.queryRenderedFeatures(event.point, { layers }) : [];
      const fips = hits[0]?.properties?.fips;
      if (typeof fips === "string" && isCountyFips(fips)) {
        setGeoId(fips);
        return;
      }
      setGeoId(MICHIGAN_STATE_GEO_ID);
    });

    return () => {
      map.off("style.load", markReady);
      map.off("load", markReady);
      map.remove();
      mapRef.current = null;
      setMapReady(false);
      fittedRef.current = false;
    };
  }, [setGeoId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !painted) return;

    const source = map.getSource(COUNTIES_SOURCE) as GeoJSONSource | undefined;
    const data = painted as GeoJSON.GeoJSON;
    if (source) {
      source.setData(data);
    } else {
      map.addSource(COUNTIES_SOURCE, { type: "geojson", data });
      map.addLayer({
        id: COUNTIES_FILL,
        type: "fill",
        source: COUNTIES_SOURCE,
        paint: {
          "fill-color": ["coalesce", ["get", "fill"], NO_DATA_FILL],
          "fill-opacity": 0.68,
        },
      });
      map.addLayer({
        id: COUNTIES_LINE,
        type: "line",
        source: COUNTIES_SOURCE,
        paint: {
          "line-color": "#4a5560",
          "line-width": 0.65,
          "line-opacity": 0.7,
        },
      });
      map.addLayer({
        id: COUNTIES_HIGHLIGHT,
        type: "line",
        source: COUNTIES_SOURCE,
        filter: ["==", ["get", "fips"], ""],
        paint: {
          "line-color": "#173a6b",
          "line-width": 2.6,
        },
      });
      map.addLayer({
        id: COUNTIES_LABEL,
        type: "symbol",
        source: COUNTIES_SOURCE,
        layout: {
          "text-field": ["get", "name"],
          "text-font": [...COUNTY_LABEL_FONTS],
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 9, 7.5, 12],
          "text-padding": 2,
          "text-optional": true,
        },
        paint: {
          "text-color": "#1c2430",
          "text-halo-color": "#fffdf8",
          "text-halo-width": 1.15,
        },
      });
      map.on("mouseenter", COUNTIES_FILL, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", COUNTIES_FILL, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    if (!fittedRef.current) {
      const bounds = collectionBounds(painted);
      if (Number.isFinite(bounds[0][0])) {
        map.fitBounds(bounds, { padding: 36, duration: 0, maxZoom: 6.4 });
        fittedRef.current = true;
      }
    }
  }, [mapReady, painted]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer(COUNTIES_HIGHLIGHT)) return;
    const filter =
      geoId === MICHIGAN_STATE_GEO_ID
        ? (["==", ["get", "fips"], ""] as maplibregl.FilterSpecification)
        : (["==", ["get", "fips"], geoId] as maplibregl.FilterSpecification);
    map.setFilter(COUNTIES_HIGHLIGHT, filter);
  }, [geoId, mapReady, painted]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !geojson || !fittedRef.current) return;
    if (geoId === MICHIGAN_STATE_GEO_ID) {
      map.fitBounds(collectionBounds(geojson), { padding: 36, maxZoom: 6.4 });
      return;
    }
    const feature = geojson.features.find((f) => f.properties.fips === geoId);
    if (!feature) return;
    map.fitBounds(featureBounds(feature), { padding: 72, maxZoom: 8 });
  }, [geoId, mapReady, geojson]);

  const selectedName =
    geoId === MICHIGAN_STATE_GEO_ID
      ? "Michigan"
      : (counties.find((c) => c.fips === geoId)?.name ?? geoId);

  return (
    <div className="county-map">
      <div className="county-map__toolbar">
        <CountySearch
          counties={counties}
          disabled={status !== "ready"}
          onSelect={setGeoId}
        />
        {elections.metrics.length > 0 ? (
          <label className="county-map__metric">
            <span>Color</span>
            <select
              value={elections.selected?.id ?? ""}
              onChange={(event) => elections.setMetricId(event.target.value)}
            >
              {elections.metrics.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="county-map__hint muted">
            {elections.status === "loading"
              ? "Checking election metrics…"
              : "Shapes only — election returns not loaded."}
          </p>
        )}
        <p className="county-map__selection">
          {selectedName}
          {geoId !== MICHIGAN_STATE_GEO_ID ? <span className="muted"> · {geoId}</span> : null}
        </p>
      </div>
      <div className="county-map__canvas-wrap">
        <div ref={containerRef} className="county-map__canvas" />
        {status !== "ready" ? (
          <div className="county-map__overlay" role="status">
            <p>{status === "loading" ? "Loading county map…" : message}</p>
          </div>
        ) : null}
      </div>
      <div className="county-map__legend" aria-hidden={elections.metrics.length === 0}>
        {elections.metrics.length > 0 ? (
          <>
            <span className="county-map__swatch county-map__swatch--r">R</span>
            <span className="muted">two-party margin</span>
            <span className="county-map__swatch county-map__swatch--d">D</span>
          </>
        ) : (
          <span className="muted">Click a county to select. Click water or outside Michigan for statewide.</span>
        )}
      </div>
    </div>
  );
}
