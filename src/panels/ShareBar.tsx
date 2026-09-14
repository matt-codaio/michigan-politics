import { MICHIGAN_STATE_GEO_ID, type GeographyId } from "../types/geography";
import { formatShare } from "./labels";

export function StackBar<K extends string>({
  keys,
  shares,
  colors,
  labels,
}: {
  keys: readonly K[];
  shares: Record<K, number>;
  colors: Record<K, string>;
  labels: Record<K, string>;
}) {
  return (
    <div
      className="stack-bar"
      role="img"
      aria-label={keys.map((key) => `${labels[key]} ${(shares[key] * 100).toFixed(1)}%`).join(", ")}
    >
      {keys.map((key) => {
        const width = Math.max(0, shares[key] * 100);
        if (width < 0.15) return null;
        return (
          <span
            key={key}
            className="stack-bar__seg"
            style={{ width: `${width}%`, background: colors[key] }}
            title={`${labels[key]} ${(shares[key] * 100).toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
}

/** Per-bucket bars, with Michigan ticks when a county is selected. */
export function ShareCompareChart<K extends string>({
  geoId,
  name,
  keys,
  shares,
  stateShares,
  colors,
  labels,
  kickerExtra,
}: {
  geoId: GeographyId;
  name: string;
  keys: readonly K[];
  shares: Record<K, number>;
  stateShares: Record<K, number>;
  colors: Record<K, string>;
  labels: Record<K, string>;
  kickerExtra?: string;
}) {
  const showTicks = geoId !== MICHIGAN_STATE_GEO_ID;
  const maxShare = Math.max(
    ...keys.map((key) => Math.max(shares[key] ?? 0, stateShares[key] ?? 0)),
    0.01,
  );

  return (
    <>
      <p className="demo-card__kicker">
        {name}
        {kickerExtra ? ` · ${kickerExtra}` : " shares"}
        {showTicks ? " · tick = Michigan" : ""}
      </p>
      <ul className="tick-bars">
        {keys.map((key) => (
          <li key={key}>
            <span className="tick-bars__label">{labels[key]}</span>
            <span className="tick-bars__track">
              <span
                className="tick-bars__fill"
                style={{
                  width: `${((shares[key] ?? 0) / maxShare) * 100}%`,
                  background: colors[key],
                }}
              />
              {showTicks ? (
                <span
                  className="tick-bars__mark"
                  style={{ left: `${((stateShares[key] ?? 0) / maxShare) * 100}%` }}
                  title={`Michigan ${formatShare(stateShares[key] ?? 0)}`}
                />
              ) : null}
            </span>
            <span className="tick-bars__value">{formatShare(shares[key] ?? 0)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ShareLegend<K extends string>({
  keys,
  shares,
  colors,
  labels,
}: {
  keys: readonly K[];
  shares: Record<K, number>;
  colors: Record<K, string>;
  labels: Record<K, string>;
}) {
  return (
    <ul className="share-legend">
      {keys.map((key) => (
        <li key={key}>
          <span className="share-legend__swatch" style={{ background: colors[key] }} />
          <span className="share-legend__label">{labels[key]}</span>
          <span className="share-legend__value">{(shares[key] * 100).toFixed(1)}%</span>
        </li>
      ))}
    </ul>
  );
}
