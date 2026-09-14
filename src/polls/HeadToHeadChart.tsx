import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Poll } from "../types/polls";
import { chartablePolls } from "./filters";

export function HeadToHeadChart({ polls }: { polls: Poll[] }) {
  const rows = chartablePolls(polls)
    .slice()
    .sort((a, b) =>
      a.field_end === b.field_end
        ? a.pollster.localeCompare(b.pollster)
        : a.field_end.localeCompare(b.field_end),
    )
    .map((poll) => ({
      date: poll.field_end,
      pollster: poll.pollster,
      el_sayed: poll.el_sayed,
      rogers: poll.rogers,
    }));

  if (rows.length === 0) {
    return <p className="muted">No verified H2H rows to chart.</p>;
  }

  return (
    <div className="poll-chart" role="img" aria-label="El-Sayed versus Rogers head-to-head trend">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e4ddd0" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[30, 60]} tick={{ fontSize: 12 }} unit="%" width={42} />
          <Tooltip
            formatter={(value, name) => {
              const label = name === "el_sayed" ? "El-Sayed" : "Rogers";
              if (value == null) return ["", label];
              return [`${value}%`, label];
            }}
            labelFormatter={(label, payload) => {
              const pollster = payload[0]?.payload?.pollster;
              return typeof pollster === "string" ? `${label} · ${pollster}` : String(label);
            }}
          />
          <Legend
            formatter={(value) => (value === "el_sayed" ? "El-Sayed (D)" : "Rogers (R)")}
          />
          <Line
            type="monotone"
            dataKey="el_sayed"
            stroke="#1e4b8c"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="rogers"
            stroke="#9b2c2c"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
