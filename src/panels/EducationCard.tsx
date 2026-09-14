import { EDUCATION_KEYS } from "../types/demographics";
import type { GeoCardProps } from "../layout/CardContent";
import { DemoGate, VintageNote } from "./DemoGate";
import { EDUCATION_COLORS, EDUCATION_LABELS } from "./labels";
import { ShareCompareChart } from "./ShareBar";

export function EducationCard({ geoId }: GeoCardProps) {
  return (
    <DemoGate geoId={geoId}>
      {(bundle, state) => (
        <div className="demo-card">
          <ShareCompareChart
            geoId={geoId}
            name={bundle.name}
            keys={EDUCATION_KEYS}
            shares={bundle.educationShares}
            stateShares={state.educationShares}
            colors={EDUCATION_COLORS}
            labels={EDUCATION_LABELS}
            kickerExtra="population 25+"
          />
          <VintageNote bundle={bundle} series="acs" />
        </div>
      )}
    </DemoGate>
  );
}
