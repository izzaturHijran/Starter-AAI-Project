import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ConfirmSubmit } from "@/components/confirm-modal";
import { LEAVE_TYPES, LEAVE_TYPE_LABELS } from "@/lib/leave";
import { createRequest } from "../actions";

export const metadata = { title: "New leave request — Budiman HRMS" };

// Errors arrive as fixed keys only; the messages are ours, never user text.
const ERROR_MESSAGES: Record<string, string> = {
  request:
    "Please check the details — the leave type, the dates and the 'what is it for' text must be valid.",
  signer:
    "That signer is not allowed for your division. Pick one from the list, then submit again.",
};

// The request form (02-design.md §4 "/employee/new"). The Other-leave box
// stays visible with a hint (server enforces "required when Other") — see
// the ledger ruling for Task 15; Task 20 brings the client-side modals.
export default async function NewRequestPage(props: {
  searchParams: Promise<{
    error?: string;
    leaveType?: string;
    otherLeaveType?: string;
    startDate?: string;
    endDate?: string;
    supervisorId?: string;
  }>;
}) {
  const user = await requireUser();
  requireRole(user, "Employee");

  const staff = await prisma.user.findUnique({ where: { id: user.id } });
  if (!staff) redirect("/login");

  // Rule 3 (AC-17/AC-18): same-division Supervisors by name; when the
  // division has none, HR officers stand in and the form says so.
  let signers = await prisma.user.findMany({
    where: { role: "Supervisor", division: staff.division },
    orderBy: { name: "asc" },
  });
  const fallbackToHr = signers.length === 0;
  if (fallbackToHr) {
    signers = await prisma.user.findMany({
      where: { role: "HR" },
      orderBy: { name: "asc" },
    });
  }

  const sp = await props.searchParams;
  const errorMessage = sp.error
    ? ERROR_MESSAGES[sp.error] ?? ERROR_MESSAGES.request
    : null;

  return (
    <section className="mx-auto max-w-xl py-6">
      <h1 className="text-2xl font-bold text-[#5146c6]">New leave request</h1>
      <p className="mt-1 text-sm text-slate-500">
        Fill in the details and pick your signer. Everything is checked again
        on the server.
      </p>

      {errorMessage && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      <form action={createRequest} className="mt-6 space-y-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Leave type</span>
          <select
            name="leaveType"
            defaultValue={sp.leaveType ?? "Annual"}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-[#5146c6] focus:outline-none"
          >
            {LEAVE_TYPES.map((type) => (
              <option key={type} value={type}>
                {LEAVE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            What is it for?{" "}
            <span className="font-normal text-slate-500">
              (only needed when the type is Other)
            </span>
          </span>
          <input
            type="text"
            name="otherLeaveType"
            defaultValue={sp.otherLeaveType ?? ""}
            maxLength={200}
            placeholder="Describe the Other leave"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 placeholder:text-slate-400 focus:border-[#5146c6] focus:outline-none"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Start date</span>
            <input
              type="date"
              name="startDate"
              defaultValue={sp.startDate ?? ""}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-[#5146c6] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">End date</span>
            <input
              type="date"
              name="endDate"
              defaultValue={sp.endDate ?? ""}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-[#5146c6] focus:outline-none"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Signer</span>
          <select
            name="supervisorId"
            defaultValue={sp.supervisorId ?? ""}
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-[#5146c6] focus:outline-none"
          >
            {signers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {fallbackToHr && (
            <span className="mt-1 block text-xs text-slate-500">
              Your division has no supervisor yet, so these HR officers stand
              in as signers.
            </span>
          )}
        </label>

        {/* The same confirmation modal as every other action (design §2
            rule 10); CONFIRM submits this very form, native validation
            included. */}
        <ConfirmSubmit
          trigger="Submit request"
          triggerClassName="w-full rounded-full bg-[#4a0aae] px-6 py-3 font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#3a0890] sm:w-auto"
          question="Submit this leave request?"
        />
      </form>
    </section>
  );
}
