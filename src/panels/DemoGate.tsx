import type { ReactNode } from "react";
import type { DemographicsBundle } from "../types/demographics";
import { missingCensusMessage, useDemographics } from "./useDemographics";
import type { GeographyId } from "../types/geography";

export function DemoGate({
  geoId,
  children,
}: {
  geoId: GeographyId;
  children: (bundle: DemographicsBundle, state: DemographicsBundle) => ReactNode;
}) {
  const demo = useDemographics(geoId);
  if (demo.status === "loading") {
    return <p className="muted">Loading Census figures…</p>;
  }
  if (demo.status === "missing") {
    return <p className="empty-card">{missingCensusMessage()}</p>;
  }
  if (demo.status === "error") {
    return <p className="empty-card">{demo.message}</p>;
  }
  if (!demo.bundle) {
    return (
      <p className="empty-card">
        No Census row for <code>{geoId}</code>. Select a county or view Michigan.
      </p>
    );
  }
  if (!demo.state) {
    return <p className="empty-card">Statewide Michigan row (geoId 26) is missing from demographics.json.</p>;
  }
  return children(demo.bundle, demo.state);
}

export function VintageNote({
  bundle,
  series,
}: {
  bundle: DemographicsBundle;
  series: "population" | "acs" | "cvap";
}) {
  const vintage = bundle.vintages?.[series];
  const label = vintage?.vintageLabel ?? bundle.asOf;
  const url = vintage?.sourceUrl ?? bundle.sourceUrl;
  return (
    <p className="demo-vintage">
      <a href={url} target="_blank" rel="noreferrer">
        {label}
      </a>
    </p>
  );
}
