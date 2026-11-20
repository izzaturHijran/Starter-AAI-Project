// Status pill (02-design.md §4 "Visual design"): one colour map used by
// every list and detail page, so a status never shows two faces.
import { STATUSES, STATUS_LABELS, type LeaveStatus } from "@/lib/leave";

const BADGE_STYLES: Record<LeaveStatus, string> = {
  PendingSupervisor: "bg-amber-100 text-amber-800",
  Signed: "bg-indigo-100 text-indigo-800",
  PendingHR: "bg-violet-100 text-violet-800",
  Approved: "bg-green-100 text-green-800",
  RejectedBySupervisor: "bg-red-100 text-red-800",
  RejectedByHR: "bg-red-100 text-red-800",
  Withdrawn: "bg-gray-100 text-gray-600",
};

const FALLBACK_STYLE = "bg-gray-100 text-gray-600";

export function StatusBadge({ status }: { status: string }) {
  // Status values are constrained on every write path; an unexpected one
  // still renders readably instead of crashing the page.
  const known = (STATUSES as readonly string[]).includes(status)
    ? (status as LeaveStatus)
    : null;
  const label = known ? STATUS_LABELS[known] : status;
  const style = known ? BADGE_STYLES[known] : FALLBACK_STYLE;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {label}
    </span>
  );
}
