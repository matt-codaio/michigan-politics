import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GeoCardProps } from "../layout/CardContent";
import { DemoGate, VintageNote } from "./DemoGate";
import { formatCount } from "./labels";

function countDomain(points: { count: number }[]): [number, number] | ["auto", "auto"] {
  const values = points.map((point) => point.count).filter((n) => Number.isFinite(n));
  if (values.length === 0) return ["auto", "auto"];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.02, 1);
    return [min - pad, max + pad];
  }
  const pad = (max - min) * 0.08;
  return [min - pad, max + pad];
}

export function PopulationCard({ geoId }: GeoCardProps) {
  return (
    <DemoGate geoId={geoId}>
      {(bundle) => {
        const latest = bundle.population.at(-1);
        const first = bundle.population[0];
        return (
          <div className="demo-card">
            <p className="demo-card__kicker">{bundle.name}</p>
            {latest ? (
              <p className="demo-card__stat">
                {formatCount(latest.count)}
                <span className="muted"> July 1, {latest.year}</span>
              </p>
            ) : null}
            {first && latest && first.year !== latest.year ? (
              <p className="muted demo-card__delta">
                {first.year}: {formatCount(first.count)}
              </p>
            ) : null}
            <div className="demo-chart">
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={bundle.population} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={4} />
                  <YAxis
                    domain={countDomain(bundle.population)}
                    allowDataOverflow
                    tick={{ fontSize: 11 }}
                    width={48}
                    tickFormatter={(v: number) =>
                      v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`
                    }
                  />
                  <Tooltip
                    formatter={(value) => formatCount(Number(value))}
                    labelFormatter={(year) => `July 1, ${String(year)}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#1e4b8c"
                    strokeWidth={2}
                    dot={false}
                    name="Population"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <VintageNote bundle={bundle} series="population" />
          </div>
        );
      }}
    </DemoGate>
  );
}
