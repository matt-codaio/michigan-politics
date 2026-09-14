import type { StyleSpecification } from "maplibre-gl";

export const COUNTIES_SOURCE = "counties";
export const COUNTIES_FILL = "counties-fill";
export const COUNTIES_HIGHLIGHT = "counties-highlight";
export const COUNTIES_LINE = "counties-line";
export const COUNTIES_LABEL = "counties-label";

export const COUNTY_LABEL_FONTS = ["Open Sans Regular", "Arial Unicode MS Regular"] as const;

/**
 * Esri World Topo: Great Lakes, terrain, neighboring states, cities, roads.
 * No API key. County choropleth is drawn on top.
 * (CARTO Voyager now watermarks unauthenticated tiles.)
 */
export const MAP_STYLE: StyleSpecification = {
  version: 8,
  name: "mi-explorer",
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    topo: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Esri, TomTom, Garmin, FAO, NOAA, USGS',
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#c5dce8" },
    },
    {
      id: "basemap",
      type: "raster",
      source: "topo",
    },
  ],
};
