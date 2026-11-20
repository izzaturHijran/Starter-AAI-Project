// The one source of truth for every leave rule (02-design.md §5, Leave
// Request): the status machine of §2 rule 1, the input validators, and the
// permission helpers (owner / assigned signer / HR officer / no-self-
// deciding, plus the fallback-signer validation of rule 3). No screen
// invents its own rules: every server action re-reads the stored row from
// the database and asks this module before touching anything (AC-33).
import { prisma } from "./db";

// Reference C fixed lists. SQLite has no enum type (prisma/schema.prisma),
// so these are the authoritative value lists validated in code — same
// pattern as User.role/division.
export const LEAVE_TYPES = [
  "Annual",
  "Maternity",
  "Unpaid",
  "Compassionate",
  "Other",
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

// Human-readable names (Reference C) — pages must not invent their own.
export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  Annual: "Annual leave",
  Maternity: "Maternity leave",
  Unpaid: "Unpaid leave",
  Compassionate: "Compassionate leave",
  Other: "Other",
};

export const STATUSES = [
  "PendingSupervisor",
  "Signed",
  "PendingHR",
  "Approved",
  "RejectedBySupervisor",
  "RejectedByHR",
  "Withdrawn",
] as const;
export type LeaveStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<LeaveStatus, string> = {
  PendingSupervisor: "Pending supervisor",
  Signed: "Signed",
  PendingHR: "Pending HR",
  Approved: "Approved",
  RejectedBySupervisor: "Rejected by supervisor",
  RejectedByHR: "Rejected by HR",
  Withdrawn: "Withdrawn",
};

export const MAX_TEXT_LENGTH = 200; // remarks and Other-leave text (§2 rule 5)

export type LeaveActor = { id: number; role: string };
export type LeaveRowLite = {
  employeeId: number;
  supervisorId: number;
  status: string;
};

// ---------- permission helpers (design §2 rules 1, 4, 6) ----------
// Pure: pass the row READ FROM THE DATABASE (never a client-supplied
// status) and the signed-in session user.

// Only the assigned signer, and only while Pending supervisor. The signer
// was validated at submit time, so id equality is enough — no self-check
// needed here (an Employee can never be a signer, validateSigner refuses).
export function canSign(row: LeaveRowLite, actor: LeaveActor): boolean {
  return row.status === "PendingSupervisor" && row.supervisorId === actor.id;
}

// Owner only, and only before HR (requirements U22 / AC-30).
export function canWithdraw(row: LeaveRowLite, actor: LeaveActor): boolean {
  return (
    row.employeeId === actor.id &&
    (row.status === "PendingSupervisor" || row.status === "Signed")
  );
}

// Owner only, and only while Signed (requirements U15 / AC-21).
export function canSend(row: LeaveRowLite, actor: LeaveActor): boolean {
  return row.employeeId === actor.id && row.status === "Signed";
}

// Any HR officer may decide a Pending HR request — except the officer who
// signed it via the fallback (§2 rule 4, requirements U18 / AC-24).
export function canDecide(row: LeaveRowLite, actor: LeaveActor): boolean {
  return (
    actor.role === "HR" &&
    row.status === "PendingHR" &&
    row.supervisorId !== actor.id
  );
}

// ---------- validators (design §2 rules 5, 7; AC-16) ----------

export function validateRemark(
  text: string | null | undefined,
  required: boolean
): string | null {
  const trimmed = (text ?? "").trim();
  if (required && trimmed === "") return "A remark is required when rejecting.";
  if (trimmed.length > MAX_TEXT_LENGTH)
    return `The remark must be ${MAX_TEXT_LENGTH} characters or fewer.`;
  return null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// A real calendar day in yyyy-mm-dd; Feb 30 and friends are rejected
// (round-trip check guards any engine leniency).
function parseDateInput(value: string | null | undefined): Date | null {
  if (!value || !DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export type RequestInput = {
  leaveType: string;
  otherLeaveType?: string | null;
  startDate: string;
  endDate: string;
};

// Returns null when the request is valid, otherwise the message to show.
// Loose dates by decision (interview): same-day and past dates fine, no
// maximum span; only "end not before start" is enforced.
export function validateRequest(input: RequestInput): string | null {
  if (!LEAVE_TYPES.includes(input.leaveType as LeaveType))
    return "Choose a valid leave type.";

  const start = parseDateInput(input.startDate);
  const end = parseDateInput(input.endDate);
  if (!start || !end) return "Both a start date and an end date are required (yyyy-mm-dd).";
  if (end.getTime() < start.getTime())
    return "The end date cannot be before the start date.";

  if (input.leaveType === "Other") {
    const other = (input.otherLeaveType ?? "").trim();
    if (other === "") return "Write what the Other leave is for.";
    if (other.length > MAX_TEXT_LENGTH)
      return `The "what is it for" text must be ${MAX_TEXT_LENGTH} characters or fewer.`;
  }
  return null;
}

// ---------- signer validation (design §2 rule 3; AC-17/AC-18) ----------
// The chosen signer must be a Supervisor in the submitter's division, or —
// only when that division has no Supervisor at all — an HR officer
// (fallback). Anything else (other division, wrong role, unknown id, the
// submitter themself) is refused. Returns the signer's user row when valid.
export async function validateSigner(
  submitter: { id: number; division: string },
  supervisorId: number
) {
  if (!Number.isInteger(supervisorId)) return null;
  const candidate = await prisma.user.findUnique({
    where: { id: supervisorId },
  });
  if (!candidate || candidate.id === submitter.id) return null;

  if (candidate.role === "Supervisor" && candidate.division === submitter.division) {
    return candidate;
  }
  if (candidate.role === "HR") {
    const supervisors = await prisma.user.count({
      where: { role: "Supervisor", division: submitter.division },
    });
    if (supervisors === 0) return candidate;
  }
  return null;
}
