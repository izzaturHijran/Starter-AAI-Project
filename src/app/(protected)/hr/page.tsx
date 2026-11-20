import Link from "next/link";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/lib/leave";

// Shared Pending HR queue on top (any officer may decide, newest first),
// then every request ever submitted — the full record like the old
// spreadsheet (02-design.md §4 "/hr", §2 rule 9). Rows the viewer signed
// via the fallback carry the "you signed this request" flag and no link
// into the deciding flow (rule 4).
const fmtDay = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);

type HrRow = {
  id: number;
  status: string;
  supervisorId: number;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  submittedAt: Date;
  supervisorRemark: string | null;
  hrRemark: string | null;
  employee: { name: string; division: string };
};

function RequestTable({ rows, viewerId, emptyText }: { rows: HrRow[]; viewerId: number; emptyText: string }) {
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
          const selfSigned = r.supervisorId === viewerId && r.status === "PendingHR";
          return (
            <tr key={r.id}>
              <td className="py-3 pr-4">
                {selfSigned ? (
                  // Flagged row: no link into the deciding flow (rule 4).
                  <span className="font-semibold text-slate-700">
                    {r.employee.name}
                  </span>
                ) : (
                  <Link
                    href={`/hr/${r.id}`}
                    className="font-semibold text-[#4a0aae] hover:underline"
                  >
                    {r.employee.name}
                  </Link>
                )}
                {selfSigned && (
                  <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                    you signed this request
                  </span>
                )}
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

export default async function HrHome() {
  const user = await requireUser();
  requireRole(user, "HR");

  // The officer's own signed requests are excluded from their queue
  // (canDecide's self-check mirrored in the query); they still appear in
  // the full list below with the flag.
  const queue = await prisma.leaveRequest.findMany({
    where: { status: "PendingHR", supervisorId: { not: user.id } },
    orderBy: { submittedAt: "desc" },
    include: { employee: true },
  });
  const all = await prisma.leaveRequest.findMany({
    orderBy: { submittedAt: "desc" },
    include: { employee: true },
  });

  return (
    <section className="py-2">
      <h1 className="text-2xl font-bold text-[#5146c6]">Requests to decide</h1>
      <RequestTable rows={queue} viewerId={user.id} emptyText="Nothing waiting for you." />

      <h2 className="mt-10 text-xl font-bold text-[#5146c6]">Every request</h2>
      <RequestTable rows={all} viewerId={user.id} emptyText="No requests have been submitted yet." />
    </section>
  );
}
