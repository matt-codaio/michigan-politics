import { INCOME_BRACKET_KEYS } from "../types/demographics";
import type { GeoCardProps } from "../layout/CardContent";
import { DemoGate, VintageNote } from "./DemoGate";
import { INCOME_COLORS, INCOME_LABELS } from "./labels";
import { ShareCompareChart } from "./ShareBar";

export function IncomeCard({ geoId }: GeoCardProps) {
  return (
    <DemoGate geoId={geoId}>
      {(bundle, state) => (
        <div className="demo-card">
          <ShareCompareChart
            geoId={geoId}
            name={bundle.name}
            keys={INCOME_BRACKET_KEYS}
            shares={bundle.incomeShares}
            stateShares={state.incomeShares}
            colors={INCOME_COLORS}
            labels={INCOME_LABELS}
            kickerExtra="household income"
          />
          <VintageNote bundle={bundle} series="acs" />
        </div>
      )}
    </DemoGate>
  );
}
