import Link from "next/link";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/lib/leave";

// Every request, newest submitted first (02-design.md §4 "/admin") — the
// full audit table: employee, division, type, dates, badge, signer, HR
// officer, submitted/decided. View only: the only interactive element is
// the row link to the read-only detail.
const fmtDay = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);

export default async function AdminHome() {
  const user = await requireUser();
  requireRole(user, "Admin");

  const requests = await prisma.leaveRequest.findMany({
    orderBy: { submittedAt: "desc" },
    include: { employee: true, supervisor: true, hrOfficer: true },
  });

  return (
    <section className="py-2">
      <h1 className="text-2xl font-bold text-[#5146c6]">All leave records</h1>

      {requests.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No requests yet.</p>
      ) : (
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">Employee</th>
              <th className="py-2 pr-4">Division</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Dates</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Signer</th>
              <th className="py-2 pr-4">HR officer</th>
              <th className="py-2 pr-4">Submitted</th>
              <th className="py-2 pr-4">Decided</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="py-3 pr-4">
                  <Link
                    href={`/admin/${r.id}`}
                    className="font-semibold text-[#4a0aae] hover:underline"
                  >
                    {r.employee.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-slate-600">{r.employee.division}</td>
                <td className="py-3 pr-4">
                  {LEAVE_TYPE_LABELS[r.leaveType as LeaveType]}
                  {r.leaveType === "Other" && r.otherLeaveType
                    ? ` — ${r.otherLeaveType}`
                    : ""}
                </td>
                <td className="py-3 pr-4 text-slate-600">
                  {fmtDay(r.startDate)} – {fmtDay(r.endDate)}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="py-3 pr-4 text-slate-600">{r.supervisor.name}</td>
                <td className="py-3 pr-4 text-slate-600">
                  {r.hrOfficer?.name ?? "—"}
                </td>
                <td className="py-3 pr-4 text-slate-600">{fmtDay(r.submittedAt)}</td>
                <td className="py-3 pr-4 text-slate-600">
                  {r.decidedAt ? fmtDay(r.decidedAt) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
