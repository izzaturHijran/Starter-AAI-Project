import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmModal } from "@/components/confirm-modal";
import { SuccessBanner } from "@/components/success-banner";
import {
  canDecide,
  canSign,
  LEAVE_TYPE_LABELS,
  type LeaveType,
} from "@/lib/leave";
import { approve, rejectByHr, sign } from "../actions";

// Full record for any HR officer (02-design.md §4 "/hr/[id]"): Approve /
// Reject while Pending HR unless this officer signed it (rule 4 flag, no
// buttons — the actions re-check on the server anyway). The fallback
// signer signs here while Pending supervisor.
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

export default async function HrRequestPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const user = await requireUser();
  requireRole(user, "HR");

  const { id } = await props.params;
  const rowId = Number.parseInt(id, 10);
  if (!Number.isInteger(rowId)) notFound();

  const request = await prisma.leaveRequest.findUnique({
    where: { id: rowId },
    include: { employee: true, supervisor: true, hrOfficer: true },
  });
  if (!request) notFound();

  const { msg, error } = await props.searchParams;
  const maySign = canSign(request, user);
  const mayDecide = canDecide(request, user);
  const selfSigned =
    request.supervisorId === user.id && request.status === "PendingHR";

  const trail: Array<[string, Date | null]> = [
    ["Submitted", request.submittedAt],
    ["Signed", request.signedAt],
    ["Sent to HR", request.sentToHrAt],
    ["Decided", request.decidedAt],
  ];

  return (
    <section className="mx-auto max-w-xl py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#5146c6]">
          Request from {request.employee.name}
        </h1>
        <Link
          href="/hr"
          className="text-sm font-medium text-[#4a0aae] hover:underline"
        >
          ← Back to HR
        </Link>
      </div>

      <SuccessBanner msg={msg} />

      {error === "remark" && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          A remark is required when rejecting (200 characters or fewer).
        </p>
      )}

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
            <dt className="w-28 shrink-0 font-medium text-slate-500">Division</dt>
            <dd>{request.employee.division}</dd>
          </div>
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

        {maySign && (
          // Fallback signer (HR officer standing in as signer) signs here.
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs text-slate-500">
              You are the assigned signer for this division.
            </p>
            <ConfirmModal
              action={sign}
              trigger="Sign"
              triggerClassName={`${pill} bg-[#4a0aae] text-white hover:bg-[#3a0890]`}
              question={`Sign this request from ${request.employee.name}?`}
            >
              <input type="hidden" name="id" value={request.id} />
            </ConfirmModal>
          </div>
        )}

        {selfSigned && (
          <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-800">
            you signed this request — another HR officer must decide it.
          </p>
        )}

        {/* Every action confirms first in the modal (design §2 rule 10);
            the server repeats every check regardless. */}
        {mayDecide && (
          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
            <ConfirmModal
              action={approve}
              trigger="Approve"
              triggerClassName={`${pill} bg-green-600 text-white hover:bg-green-700`}
              question={`Approve this request from ${request.employee.name}?`}
            >
              <input type="hidden" name="id" value={request.id} />
            </ConfirmModal>
            <ConfirmModal
              action={rejectByHr}
              trigger="Reject"
              triggerClassName={`${pill} bg-white text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-50`}
              question={`Reject this request from ${request.employee.name}?`}
              tone="danger"
              remark="Reason for rejection (required)"
            >
              <input type="hidden" name="id" value={request.id} />
            </ConfirmModal>
          </div>
        )}
      </div>
    </section>
  );
}
