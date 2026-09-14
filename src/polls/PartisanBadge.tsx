import type { PartisanFlag } from "../types/polls";

const LABELS: Record<PartisanFlag, string> = {
  none: "Nonpartisan",
  D: "D",
  R: "R",
  media: "Media",
};

export function PartisanBadge({ partisan }: { partisan: PartisanFlag }) {
  return (
    <span className={`partisan-badge partisan-badge--${partisan}`}>
      {LABELS[partisan]}
    </span>
  );
}
