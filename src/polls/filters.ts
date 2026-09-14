import type { Poll } from "../types/polls";

export interface PollFilters {
  from: string;
  to: string;
  lvOnly: boolean;
  hidePartisan: boolean;
}

export const EMPTY_POLL_FILTERS: PollFilters = {
  from: "",
  to: "",
  lvOnly: false,
  hidePartisan: false,
};

export function filterPolls(polls: Poll[], filters: PollFilters): Poll[] {
  return polls.filter((poll) => {
    if (filters.from && poll.field_end < filters.from) return false;
    if (filters.to && poll.field_end > filters.to) return false;
    if (filters.lvOnly && poll.sample_type !== "LV") return false;
    if (filters.hidePartisan && (poll.partisan === "D" || poll.partisan === "R")) {
      return false;
    }
    return true;
  });
}

export function sortPollsNewestFirst(polls: Poll[]): Poll[] {
  return [...polls].sort((a, b) => {
    if (a.field_end !== b.field_end) return b.field_end.localeCompare(a.field_end);
    return a.pollster.localeCompare(b.pollster);
  });
}

export function chartablePolls(polls: Poll[]): Poll[] {
  return polls.filter(
    (poll) => Number.isFinite(poll.el_sayed) && Number.isFinite(poll.rogers),
  );
}
