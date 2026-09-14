import { RACE_KEYS } from "../types/demographics";
import type { GeoCardProps } from "../layout/CardContent";
import { DemoGate, VintageNote } from "./DemoGate";
import { RACE_COLORS, RACE_LABELS } from "./labels";
import { ShareCompareChart } from "./ShareBar";

export function RaceCard({ geoId }: GeoCardProps) {
  return (
    <DemoGate geoId={geoId}>
      {(bundle, state) => (
        <div className="demo-card">
          <ShareCompareChart
            geoId={geoId}
            name={bundle.name}
            keys={RACE_KEYS}
            shares={bundle.raceShares}
            stateShares={state.raceShares}
            colors={RACE_COLORS}
            labels={RACE_LABELS}
            kickerExtra="Hispanic (any race) + not Hispanic"
          />
          <VintageNote bundle={bundle} series="acs" />
        </div>
      )}
    </DemoGate>
  );
}
