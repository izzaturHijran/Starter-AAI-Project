import Link from "next/link";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/lib/leave";

// To-sign queue (oldest first so nothing waits unfairly) then every request
// ever addressed to me (02-design.md §4 "/supervisor", §2 rule 9).
// Requests addressed to another signer are never listed here.
const fmtDay = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);

function RequestTable({
  rows,
  emptyText,
}: {
  rows: Array<{
    id: number;
    status: string;
    leaveType: string;
    startDate: Date;
    endDate: Date;
    submittedAt: Date;
    supervisorRemark: string | null;
    hrRemark: string | null;
    employee: { name: string; division: string };
  }>;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">{emptyText}</p>;
  }
  return (
    <table className="mt-4 w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <th className="py-2 pr-4">Employee</th>
          <th className="py-2 pr-4">Division</th>
          <th className="py-2 pr-4">Type</th>
          <th className="py-2 pr-4">Dates</th>
          <th className="py-2 pr-4">Status</th>
          <th className="py-2 pr-4">Remark</th>
          <th className="py-2 pr-4">Submitted</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => {
          const remark = r.hrRemark ?? r.supervisorRemark;
          return (
            <tr key={r.id}>
              <td className="py-3 pr-4">
                <Link
                  href={`/supervisor/${r.id}`}
                  className="font-semibold text-[#4a0aae] hover:underline"
                >
                  {r.employee.name}
                </Link>
              </td>
              <td className="py-3 pr-4 text-slate-600">{r.employee.division}</td>
              <td className="py-3 pr-4">
                {LEAVE_TYPE_LABELS[r.leaveType as LeaveType]}
              </td>
              <td className="py-3 pr-4 text-slate-600">
                {fmtDay(r.startDate)} – {fmtDay(r.endDate)}
              </td>
              <td className="py-3 pr-4">
                <StatusBadge status={r.status} />
              </td>
              <td className="max-w-40 truncate py-3 pr-4 text-slate-500">
                {remark ?? ""}
              </td>
              <td className="py-3 pr-4 text-slate-600">{fmtDay(r.submittedAt)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default async function SupervisorHome() {
  const user = await requireUser();
  requireRole(user, "Supervisor");

  const queue = await prisma.leaveRequest.findMany({
    where: { supervisorId: user.id, status: "PendingSupervisor" },
    orderBy: { submittedAt: "asc" },
    include: { employee: true },
  });
  const all = await prisma.leaveRequest.findMany({
    where: { supervisorId: user.id },
    orderBy: { submittedAt: "desc" },
    include: { employee: true },
  });

  return (
    <section className="py-2">
      <h1 className="text-2xl font-bold text-[#5146c6]">Requests to sign</h1>
      <RequestTable rows={queue} emptyText="Nothing waiting for you." />

      <h2 className="mt-10 text-xl font-bold text-[#5146c6]">All my requests</h2>
      <RequestTable rows={all} emptyText="No requests have come to you yet." />
    </section>
  );
}
