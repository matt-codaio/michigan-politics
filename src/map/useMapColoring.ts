import { useEffect, useMemo, useState } from "react";
import {
  AGE_BUCKETS,
  DATA_PATHS,
  EDUCATION_KEYS,
  INCOME_BRACKET_KEYS,
  RACE_KEYS,
  isCountyFips,
  type DemographicsFile,
  type ElectionsFile,
} from "../types";
import {
  AGE_LABELS,
  EDUCATION_LABELS,
  INCOME_LABELS,
  RACE_LABELS,
} from "../panels/labels";
import {
  DEFAULT_CHOROPLETH_METRIC_ID,
  colorCounties,
  countyMargins,
  metricsFromElections,
  type ColorKind,
  type ColorLegend,
  type ValueFormat,
} from "./choropleth";

export const COLOR_CATEGORIES = [
  { id: "population", label: "Population" },
  { id: "age", label: "Age" },
  { id: "race", label: "Race" },
  { id: "education", label: "Education" },
  { id: "income", label: "Income" },
  { id: "cvap", label: "CVAP" },
  { id: "elections", label: "Prior elections" },
] as const;

export type ColorCategoryId = (typeof COLOR_CATEGORIES)[number]["id"];

export interface MapColorMetric {
  id: string;
  category: ColorCategoryId;
  label: string;
  kind: ColorKind;
  format: ValueFormat;
}

const DEFAULT_METRIC_BY_CATEGORY: Record<ColorCategoryId, string> = {
  population: "population-latest",
  age: "age-age65plus",
  race: "race-nhWhite",
  education: "education-bachelors",
  income: "income-from100to150k",
  cvap: "cvap-total",
  elections: DEFAULT_CHOROPLETH_METRIC_ID,
};

function isElectionsFile(data: unknown): data is ElectionsFile {
  if (!data || typeof data !== "object") return false;
  const geos = (data as { geos?: unknown }).geos;
  return geos !== null && typeof geos === "object";
}

function isDemographicsFile(data: unknown): data is DemographicsFile {
  if (!data || typeof data !== "object") return false;
  const geos = (data as { geos?: unknown }).geos;
  return geos !== null && typeof geos === "object";
}

function countyEntries(file: DemographicsFile) {
  return Object.entries(file.geos).filter(([geoId]) => isCountyFips(geoId));
}

function shareMetric<K extends string>(
  category: ColorCategoryId,
  key: K,
  label: string,
): MapColorMetric {
  return {
    id: `${category}-${key}`,
    category,
    label,
    kind: "sequential",
    format: "share",
  };
}

function demoMetrics(file: DemographicsFile | null): MapColorMetric[] {
  if (!file || countyEntries(file).length === 0) return [];
  return [
    {
      id: "population-latest",
      category: "population",
      label: "Latest population",
      kind: "sequential",
      format: "count",
    },
    ...AGE_BUCKETS.map((key) => shareMetric("age", key, AGE_LABELS[key])),
    ...RACE_KEYS.map((key) => shareMetric("race", key, RACE_LABELS[key])),
    ...EDUCATION_KEYS.map((key) => shareMetric("education", key, EDUCATION_LABELS[key])),
    ...INCOME_BRACKET_KEYS.map((key) => shareMetric("income", key, INCOME_LABELS[key])),
    {
      id: "cvap-total",
      category: "cvap",
      label: "Total CVAP",
      kind: "sequential",
      format: "count",
    },
    ...RACE_KEYS.map((key) => shareMetric("cvap", key, RACE_LABELS[key])),
  ];
}

function electionMetrics(file: ElectionsFile | null): MapColorMetric[] {
  if (!file) return [];
  return metricsFromElections(file).map((metric) => ({
    id: metric.id,
    category: "elections" as const,
    label: metric.label,
    kind: "margin" as const,
    format: "margin" as const,
  }));
}

function pickMetric(
  metrics: MapColorMetric[],
  category: ColorCategoryId,
  metricId: string | null,
): MapColorMetric | null {
  const inCategory = metrics.filter((metric) => metric.category === category);
  if (inCategory.length === 0) return null;
  return (
    inCategory.find((metric) => metric.id === metricId) ??
    inCategory.find((metric) => metric.id === DEFAULT_METRIC_BY_CATEGORY[category]) ??
    inCategory[0] ??
    null
  );
}

function valuesForMetric(
  metric: MapColorMetric | null,
  demographics: DemographicsFile | null,
  elections: ElectionsFile | null,
): Record<string, number> | null {
  if (!metric) return null;

  if (metric.category === "elections") {
    if (!elections) return null;
    const election = metricsFromElections(elections).find((item) => item.id === metric.id);
    if (!election) return null;
    const all = countyMargins(elections, election);
    const counties: Record<string, number> = {};
    for (const [geoId, value] of Object.entries(all)) {
      if (isCountyFips(geoId)) counties[geoId] = value;
    }
    return counties;
  }

  if (!demographics) return null;
  const out: Record<string, number> = {};

  for (const [geoId, bundle] of countyEntries(demographics)) {
    if (metric.id === "population-latest") {
      const latest = bundle.population.at(-1)?.count;
      if (latest != null) out[geoId] = latest;
      continue;
    }
    if (metric.id === "cvap-total") {
      if (bundle.cvapTotal > 0) out[geoId] = bundle.cvapTotal;
      continue;
    }
    const key = metric.id.slice(`${metric.category}-`.length);
    if (metric.category === "age" && key in bundle.ageShares) {
      out[geoId] = bundle.ageShares[key as keyof typeof bundle.ageShares];
    } else if (metric.category === "race" && key in bundle.raceShares) {
      out[geoId] = bundle.raceShares[key as keyof typeof bundle.raceShares];
    } else if (metric.category === "education" && key in bundle.educationShares) {
      out[geoId] = bundle.educationShares[key as keyof typeof bundle.educationShares];
    } else if (metric.category === "income" && key in bundle.incomeShares) {
      out[geoId] = bundle.incomeShares[key as keyof typeof bundle.incomeShares];
    } else if (metric.category === "cvap" && key in bundle.cvapByRace && bundle.cvapTotal > 0) {
      out[geoId] = bundle.cvapByRace[key as keyof typeof bundle.cvapByRace] / bundle.cvapTotal;
    }
  }

  return out;
}

export function useMapColoring(): {
  status: "loading" | "ready";
  categories: typeof COLOR_CATEGORIES;
  availableCategories: ColorCategoryId[];
  category: ColorCategoryId;
  setCategory: (id: ColorCategoryId) => void;
  metrics: MapColorMetric[];
  selected: MapColorMetric | null;
  setMetricId: (id: string) => void;
  values: Record<string, number> | null;
  fills: Record<string, string>;
  legend: ColorLegend;
  hint: string | null;
} {
  const [elections, setElections] = useState<ElectionsFile | null>(null);
  const [demographics, setDemographics] = useState<DemographicsFile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState<ColorCategoryId>("elections");
  const [metricId, setMetricId] = useState<string | null>(DEFAULT_CHOROPLETH_METRIC_ID);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      const [electionRes, demoRes] = await Promise.all([
        fetch(DATA_PATHS.elections, { signal: ac.signal }).catch(() => null),
        fetch(DATA_PATHS.demographics, { signal: ac.signal }).catch(() => null),
      ]);
      if (ac.signal.aborted) return;
      if (electionRes?.ok) {
        const data: unknown = await electionRes.json().catch(() => null);
        if (isElectionsFile(data) && Object.keys(data.geos).length > 0) setElections(data);
      }
      if (demoRes?.ok) {
        const data: unknown = await demoRes.json().catch(() => null);
        if (isDemographicsFile(data) && Object.keys(data.geos).length > 0) {
          setDemographics(data);
        }
      }
      if (!ac.signal.aborted) setLoaded(true);
    })();
    return () => ac.abort();
  }, []);

  const allMetrics = useMemo(
    () => [...demoMetrics(demographics), ...electionMetrics(elections)],
    [demographics, elections],
  );

  const availableCategories = useMemo(() => {
    const present = new Set(allMetrics.map((metric) => metric.category));
    return COLOR_CATEGORIES.map((item) => item.id).filter((id) => present.has(id));
  }, [allMetrics]);

  useEffect(() => {
    if (!loaded || availableCategories.length === 0) return;
    if (!availableCategories.includes(category)) {
      const fallback = availableCategories.includes("elections")
        ? "elections"
        : availableCategories[0];
      if (fallback) setCategory(fallback);
    }
  }, [availableCategories, category, loaded]);

  const metrics = useMemo(
    () => allMetrics.filter((metric) => metric.category === category),
    [allMetrics, category],
  );

  const selected = useMemo(
    () => pickMetric(allMetrics, category, metricId),
    [allMetrics, category, metricId],
  );

  const values = useMemo(
    () => valuesForMetric(selected, demographics, elections),
    [selected, demographics, elections],
  );

  const painted = useMemo(
    () => colorCounties(values, selected?.kind ?? "sequential", selected?.format ?? "share"),
    [values, selected],
  );

  let hint: string | null = null;
  if (loaded && allMetrics.length === 0) {
    hint = "Shapes only — Census and election files not loaded.";
  } else if (loaded && metrics.length === 0) {
    hint =
      category === "elections"
        ? "Election returns not loaded."
        : "Census file not loaded. Run npm run ingest:census.";
  }

  return {
    status: loaded ? "ready" : "loading",
    categories: COLOR_CATEGORIES,
    availableCategories,
    category,
    setCategory: (id) => {
      setCategory(id);
      setMetricId(DEFAULT_METRIC_BY_CATEGORY[id]);
    },
    metrics,
    selected,
    setMetricId,
    values,
    fills: painted.fills,
    legend: painted.legend,
    hint,
  };
}

export function isColorCategoryId(value: string): value is ColorCategoryId {
  return COLOR_CATEGORIES.some((item) => item.id === value);
}
