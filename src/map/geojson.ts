import { isCountyFips, type CountyFeature } from "../types";

export interface CountyGeoProperties extends CountyFeature {
  /** Hex fill from the active choropleth metric; optional until painted. */
  fill?: string;
}

export interface CountyPolygonGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: unknown;
}

export interface CountyGeoFeature {
  type: "Feature";
  properties: CountyGeoProperties;
  geometry: CountyPolygonGeometry;
}

export interface CountyFeatureCollection {
  type: "FeatureCollection";
  bbox?: [number, number, number, number];
  features: CountyGeoFeature[];
  generatedAt?: string;
  sourceUrl?: string;
}

function isPositionPair(node: unknown): node is [number, number] {
  return (
    Array.isArray(node) &&
    node.length >= 2 &&
    typeof node[0] === "number" &&
    typeof node[1] === "number"
  );
}

function walkPositions(
  geom: CountyGeoFeature["geometry"],
  visit: (x: number, y: number) => void,
): void {
  const walk = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (isPositionPair(node)) {
      visit(node[0], node[1]);
      return;
    }
    for (const child of node) walk(child);
  };
  walk(geom.coordinates);
}

export function featureBounds(
  feature: CountyGeoFeature,
): [[number, number], [number, number]] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  walkPositions(feature.geometry, (x, y) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

export function collectionBounds(
  fc: CountyFeatureCollection,
): [[number, number], [number, number]] {
  if (fc.bbox && fc.bbox.length >= 4) {
    return [
      [fc.bbox[0], fc.bbox[1]],
      [fc.bbox[2], fc.bbox[3]],
    ];
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const feature of fc.features) {
    walkPositions(feature.geometry, (x, y) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

function readCountyProps(props: Record<string, unknown>): CountyFeature | null {
  const rawFips = props.fips ?? props.GEOID ?? props.geoid;
  const fips =
    typeof rawFips === "number"
      ? String(rawFips).padStart(5, "0")
      : typeof rawFips === "string"
        ? rawFips.trim()
        : "";
  const rawName = props.name ?? props.BASENAME ?? props.NAME;
  const name =
    typeof rawName === "string"
      ? rawName.replace(/\s+County$/i, "").trim()
      : "";
  if (!isCountyFips(fips) || !name) return null;
  return { fips, name };
}

function isPolygonGeom(geom: unknown): geom is CountyPolygonGeometry {
  if (!geom || typeof geom !== "object") return false;
  const type = (geom as { type?: unknown }).type;
  return type === "Polygon" || type === "MultiPolygon";
}

export function parseCountyGeojson(data: unknown): CountyFeatureCollection | null {
  if (!data || typeof data !== "object") return null;
  const fc = data as {
    type?: unknown;
    features?: unknown;
    bbox?: unknown;
    generatedAt?: unknown;
    sourceUrl?: unknown;
  };
  if (fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) return null;

  const features: CountyGeoFeature[] = [];
  for (const raw of fc.features) {
    if (!raw || typeof raw !== "object") continue;
    const feature = raw as {
      type?: unknown;
      properties?: unknown;
      geometry?: unknown;
    };
    if (feature.type !== "Feature" || !isPolygonGeom(feature.geometry)) continue;
    if (!feature.properties || typeof feature.properties !== "object") continue;
    const county = readCountyProps(feature.properties as Record<string, unknown>);
    if (!county) continue;
    features.push({
      type: "Feature",
      properties: county,
      geometry: feature.geometry,
    });
  }
  if (features.length === 0) return null;

  const bbox = Array.isArray(fc.bbox) && fc.bbox.length >= 4
    ? ([
        Number(fc.bbox[0]),
        Number(fc.bbox[1]),
        Number(fc.bbox[2]),
        Number(fc.bbox[3]),
      ] as [number, number, number, number])
    : undefined;

  return {
    type: "FeatureCollection",
    bbox: bbox && bbox.every((n) => Number.isFinite(n)) ? bbox : undefined,
    features,
    generatedAt: typeof fc.generatedAt === "string" ? fc.generatedAt : undefined,
    sourceUrl: typeof fc.sourceUrl === "string" ? fc.sourceUrl : undefined,
  };
}
