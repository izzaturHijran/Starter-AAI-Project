import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/lib/leave";

// Read-only audit detail (02-design.md §4 "/admin/[id]"): the same full
// record as /employee/[id], but this file imports NO actions module and
// renders no button at all — an Admin never mutates anything (§2 rule 2,
// design §6). A missing id gets the usual quiet 404.
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

export default async function AdminRequestPage(props: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  requireRole(user, "Admin");

  const { id } = await props.params;
  const rowId = Number.parseInt(id, 10);
  if (!Number.isInteger(rowId)) notFound();

  const request = await prisma.leaveRequest.findUnique({
    where: { id: rowId },
    include: { employee: true, supervisor: true, hrOfficer: true },
  });
  if (!request) notFound();

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
          href="/admin"
          className="text-sm font-medium text-[#4a0aae] hover:underline"
        >
          ← Back to all records
        </Link>
      </div>

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
            <dt className="w-28 shrink-0 font-medium text-slate-500">Employee</dt>
            <dd>
              {request.employee.name}{" "}
              <span className="text-slate-400">({request.employee.division})</span>
            </dd>
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
              <dt className="w-28 shrink-0 font-medium text-slate-500">HR remark</dt>
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
      </div>
    </section>
  );
}
