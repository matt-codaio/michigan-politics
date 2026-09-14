import { useMemo, useState } from "react";
import { MarketsPanel } from "../markets/MarketsPanel";
import { AddPollForm } from "../polls/AddPollForm";
import { EMPTY_POLL_FILTERS, filterPolls, sortPollsNewestFirst } from "../polls/filters";
import { HeadToHeadChart } from "../polls/HeadToHeadChart";
import { PollsTable } from "../polls/PollsTable";
import { usePolls } from "../polls/usePolls";
import type { Poll } from "../types/polls";

export function PollsPage() {
  const { polls, loading, error, reload } = usePolls();
  const [filters, setFilters] = useState(EMPTY_POLL_FILTERS);
  const [editing, setEditing] = useState<Poll | null>(null);

  const visible = useMemo(
    () => sortPollsNewestFirst(filterPolls(polls, filters)),
    [polls, filters],
  );

  return (
    <main className="page poll-desk">
      <h1>Poll desk</h1>
      <p className="muted">
        Statewide H2H only (El-Sayed vs Rogers). County geography is on the map, not here.
        Markets are not mixed into this table.
      </p>

      <section className="poll-filters" aria-label="Poll filters">
        <label>
          From
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </label>
        <label className="poll-filters__check">
          <input
            type="checkbox"
            checked={filters.lvOnly}
            onChange={(e) => setFilters((f) => ({ ...f, lvOnly: e.target.checked }))}
          />
          LV only
        </label>
        <label className="poll-filters__check">
          <input
            type="checkbox"
            checked={filters.hidePartisan}
            onChange={(e) => setFilters((f) => ({ ...f, hidePartisan: e.target.checked }))}
          />
          Hide partisan (D/R)
        </label>
      </section>

      {loading ? <p className="muted">Loading polls…</p> : null}
      {error ? <p className="poll-form__errors">{error}</p> : null}

      <section>
        <h2>Head-to-head</h2>
        <HeadToHeadChart polls={visible} />
      </section>

      <section>
        <h2>Polls ({visible.length})</h2>
        <PollsTable
          polls={visible}
          onEdit={(poll) => {
            setEditing(poll);
            document.getElementById("add-poll")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </section>

      <section id="add-poll">
        <AddPollForm
          editing={editing}
          existing={polls}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onCancelEdit={() => setEditing(null)}
        />
      </section>

      <section className="poll-desk__markets" aria-label="Prediction markets">
        <MarketsPanel />
      </section>
    </main>
  );
}
