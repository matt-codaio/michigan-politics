import { RACE_KEYS, type DemographicsBundle, type RaceKey } from "../types/demographics";
import type { GeoCardProps } from "../layout/CardContent";
import { DemoGate, VintageNote } from "./DemoGate";
import { formatCount, RACE_COLORS, RACE_LABELS } from "./labels";
import { ShareCompareChart } from "./ShareBar";

function cvapShares(bundle: DemographicsBundle): Record<RaceKey, number> {
  const total = bundle.cvapTotal;
  return Object.fromEntries(
    RACE_KEYS.map((key) => [key, total > 0 ? bundle.cvapByRace[key] / total : 0]),
  ) as Record<RaceKey, number>;
}

export function CvapCard({ geoId }: GeoCardProps) {
  return (
    <DemoGate geoId={geoId}>
      {(bundle, state) => (
        <div className="demo-card">
          <p className="demo-card__stat">{formatCount(bundle.cvapTotal)}</p>
          <ShareCompareChart
            geoId={geoId}
            name={bundle.name}
            keys={RACE_KEYS}
            shares={cvapShares(bundle)}
            stateShares={cvapShares(state)}
            colors={RACE_COLORS}
            labels={RACE_LABELS}
            kickerExtra="citizen voting-age (not registered voters)"
          />
          <VintageNote bundle={bundle} series="cvap" />
        </div>
      )}
    </DemoGate>
  );
}
