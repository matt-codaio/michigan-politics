import { AGE_BUCKETS } from "../types/demographics";
import type { GeoCardProps } from "../layout/CardContent";
import { DemoGate, VintageNote } from "./DemoGate";
import { AGE_COLORS, AGE_LABELS } from "./labels";
import { ShareCompareChart } from "./ShareBar";

export function AgeCard({ geoId }: GeoCardProps) {
  return (
    <DemoGate geoId={geoId}>
      {(bundle, state) => (
        <div className="demo-card">
          <ShareCompareChart
            geoId={geoId}
            name={bundle.name}
            keys={AGE_BUCKETS}
            shares={bundle.ageShares}
            stateShares={state.ageShares}
            colors={AGE_COLORS}
            labels={AGE_LABELS}
          />
          <VintageNote bundle={bundle} series="acs" />
        </div>
      )}
    </DemoGate>
  );
}
