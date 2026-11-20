import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmModal } from "@/components/confirm-modal";
import { SuccessBanner } from "@/components/success-banner";
import {
  canSend,
  canWithdraw,
  LEAVE_TYPE_LABELS,
  type LeaveType,
} from "@/lib/leave";
import { sendToHr, withdraw } from "../actions";

// Owner-only full record (02-design.md §4 "/employee/[id]"). Anyone else —
// other employees included — gets the same page-not-found as a missing id,
// so nothing about someone else's request is ever rendered or confirmed
// (design §2 rule 11 / security §6).
const fmtDay = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);

const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);

const pill =
  "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide shadow transition";

export default async function RequestDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const user = await requireUser();
  requireRole(user, "Employee");

  const { id } = await props.params;
  const rowId = Number.parseInt(id, 10);
  if (!Number.isInteger(rowId)) notFound();

  const request = await prisma.leaveRequest.findUnique({
    where: { id: rowId },
    include: { supervisor: true, hrOfficer: true },
  });
  // Non-owners and missing ids are indistinguishable: one quiet 404.
  if (!request || request.employeeId !== user.id) notFound();

  const { msg } = await props.searchParams;

  const trail: Array<[string, Date | null]> = [
    ["Submitted", request.submittedAt],
    ["Signed", request.signedAt],
    ["Sent to HR", request.sentToHrAt],
    ["Decided", request.decidedAt],
  ];

  return (
    <section className="mx-auto max-w-xl py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#5146c6]">Leave request</h1>
        <Link
          href="/employee"
          className="text-sm font-medium text-[#4a0aae] hover:underline"
        >
          ← Back to my requests
        </Link>
      </div>

      <SuccessBanner msg={msg} />

      <div className="mt-6 space-y-4 text-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-900">
            {LEAVE_TYPE_LABELS[request.leaveType as LeaveType]}
            {request.leaveType === "Other" && request.otherLeaveType
              ? ` — ${request.otherLeaveType}`
              : ""}
          </span>
          <StatusBadge status={request.status} />
        </div>

        <p className="text-slate-600">
          {fmtDay(request.startDate)} – {fmtDay(request.endDate)}
        </p>

        <dl className="space-y-2">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 font-medium text-slate-500">Signer</dt>
            <dd>{request.supervisor.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 font-medium text-slate-500">Decider</dt>
            <dd>{request.hrOfficer?.name ?? "—"}</dd>
          </div>
          {request.supervisorRemark && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-medium text-slate-500">
                Supervisor remark
              </dt>
              <dd>{request.supervisorRemark}</dd>
            </div>
          )}
          {request.hrRemark && (
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 font-medium text-slate-500">
                HR remark
              </dt>
              <dd>{request.hrRemark}</dd>
            </div>
          )}
        </dl>

        {/* Dates trail: only the steps already taken. */}
        <dl className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {trail
            .filter(([, when]) => when !== null)
            .map(([label, when]) => (
              <div key={label} className="flex gap-2">
                <dt className="w-28 shrink-0">{label}</dt>
                <dd>{when ? fmtDateTime(when) : ""}</dd>
              </div>
            ))}
        </dl>

        {/* Buttons only where this owner's machine row allows; Copy to new
            is available on any own request (rule 8): it prefills a blank
            form via fixed params — type, dates, signer, Other text. */}
        <div className="flex flex-wrap gap-3 pt-2">
          {canSend(request, user) && (
            <ConfirmModal
              action={sendToHr}
              trigger="Send to HR"
              triggerClassName={`${pill} bg-[#4a0aae] text-white hover:bg-[#3a0890]`}
              question="Send this request to HR?"
            >
              <input type="hidden" name="id" value={request.id} />
            </ConfirmModal>
          )}
          {canWithdraw(request, user) && (
            <ConfirmModal
              action={withdraw}
              trigger="Withdraw"
              triggerClassName={`${pill} bg-white text-[#4a0aae] ring-1 ring-inset ring-[#4a0aae]/30 hover:bg-violet-50`}
              question="Withdraw this request? This cannot be undone."
            >
              <input type="hidden" name="id" value={request.id} />
            </ConfirmModal>
          )}
          <Link
            href={`/employee/new?${new URLSearchParams({
              leaveType: request.leaveType,
              startDate: request.startDate.toISOString().slice(0, 10),
              endDate: request.endDate.toISOString().slice(0, 10),
              supervisorId: String(request.supervisorId),
              ...(request.otherLeaveType
                ? { otherLeaveType: request.otherLeaveType }
                : {}),
            }).toString()}`}
            className={`${pill} bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50`}
          >
            Copy to new
          </Link>
        </div>
      </div>
    </section>
  );
}
