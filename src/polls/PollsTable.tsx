import type { Poll } from "../types/polls";
import { PartisanBadge } from "./PartisanBadge";

function fmtPct(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function fmtMoe(value: number | null): string {
  if (value === null) return "—";
  return `±${value}`;
}

export function PollsTable({
  polls,
  onEdit,
}: {
  polls: Poll[];
  onEdit: (poll: Poll) => void;
}) {
  if (polls.length === 0) {
    return <p className="muted">No polls match the current filters.</p>;
  }

  return (
    <div className="poll-table-wrap">
      <table className="poll-table">
        <thead>
          <tr>
            <th>Pollster</th>
            <th>Sponsor</th>
            <th>Field</th>
            <th>n</th>
            <th>Pop.</th>
            <th>MoE</th>
            <th>El-Sayed</th>
            <th>Rogers</th>
            <th>Und.</th>
            <th>Flag</th>
            <th>Source</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {polls.map((poll) => (
            <tr key={poll.id}>
              <td>
                <div className="poll-table__pollster">{poll.pollster}</div>
                {poll.crosstab_notes ? (
                  <div className="poll-table__notes">{poll.crosstab_notes}</div>
                ) : null}
              </td>
              <td>{poll.sponsor}</td>
              <td>
                {poll.field_start} – {poll.field_end}
              </td>
              <td>{poll.sample_size.toLocaleString()}</td>
              <td>{poll.sample_type}</td>
              <td>{fmtMoe(poll.moe)}</td>
              <td className="poll-table__dem">{fmtPct(poll.el_sayed)}</td>
              <td className="poll-table__gop">{fmtPct(poll.rogers)}</td>
              <td>{fmtPct(poll.undecided)}</td>
              <td>
                <PartisanBadge partisan={poll.partisan} />
              </td>
              <td>
                <a href={poll.source_url} target="_blank" rel="noreferrer">
                  Link
                </a>
              </td>
              <td>
                <button type="button" className="poll-table__edit" onClick={() => onEdit(poll)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
