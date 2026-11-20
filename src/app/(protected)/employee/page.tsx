import Link from "next/link";
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
import { sendToHr, withdraw } from "./actions";

// Own requests, newest first (02-design.md §4 "/employee"). Buttons follow
// the status machine (§2 rule 1), each opening the confirmation modal
// first (rule 10). They only ever appear where the machine allows (AC-33:
// the server checks again anyway).
const fmtDay = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);

const pill =
  "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide shadow transition";

export default async function EmployeeHome(props: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const user = await requireUser();
  requireRole(user, "Employee");

  const requests = await prisma.leaveRequest.findMany({
    where: { employeeId: user.id },
    orderBy: { submittedAt: "desc" },
  });

  const { msg } = await props.searchParams;

  return (
    <section className="py-2">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#5146c6]">My leave requests</h1>
        <Link
          href="/employee/new"
          className={`${pill} bg-[#4a0aae] text-white hover:bg-[#3a0890]`}
        >
          New request
        </Link>
      </div>

      <SuccessBanner msg={msg} />

      {requests.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          No requests yet — press New request.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-slate-100">
          {requests.map((r) => {
            const remark = r.hrRemark ?? r.supervisorRemark;
            const title = `${LEAVE_TYPE_LABELS[r.leaveType as LeaveType]}${
              r.leaveType === "Other" && r.otherLeaveType
                ? ` — ${r.otherLeaveType}`
                : ""
            }`;
            // Copy to new (rule 8): prefill type, dates, signer and the
            // Other text — never a remark; the server re-validates the
            // signer on submit like any other request.
            const copyHref = `/employee/new?${new URLSearchParams({
              leaveType: r.leaveType,
              startDate: r.startDate.toISOString().slice(0, 10),
              endDate: r.endDate.toISOString().slice(0, 10),
              supervisorId: String(r.supervisorId),
              ...(r.otherLeaveType ? { otherLeaveType: r.otherLeaveType } : {}),
            }).toString()}`;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/employee/${r.id}`}
                      className="truncate font-semibold text-[#4a0aae] hover:underline"
                    >
                      {title}
                    </Link>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {fmtDay(r.startDate)} – {fmtDay(r.endDate)}
                    {remark && (
                      <span className="text-slate-500"> · Remark: {remark}</span>
                    )}
                  </p>
                </div>
                {/* Row actions per the machine, each behind the modal. */}
                {canSend(r, user) && (
                  <ConfirmModal
                    action={sendToHr}
                    trigger="Send to HR"
                    triggerClassName={`${pill} bg-[#4a0aae] text-white hover:bg-[#3a0890]`}
                    question="Send this request to HR?"
                  >
                    <input type="hidden" name="id" value={r.id} />
                  </ConfirmModal>
                )}
                {canWithdraw(r, user) && (
                  <ConfirmModal
                    action={withdraw}
                    trigger="Withdraw"
                    triggerClassName={`${pill} bg-white text-[#4a0aae] ring-1 ring-inset ring-[#4a0aae]/30 hover:bg-violet-50`}
                    question="Withdraw this request? This cannot be undone."
                  >
                    <input type="hidden" name="id" value={r.id} />
                  </ConfirmModal>
                )}
                <Link
                  href={copyHref}
                  className={`${pill} bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50`}
                >
                  Copy to new
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
