"use server";

import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canSend, canWithdraw, validateRequest, validateSigner } from "@/lib/leave";

// Create a request (requirements U11/U12; AC-15 … AC-18). Every value is
// re-validated on the server through src/lib/leave.ts (AC-16): status,
// employeeId and hrOfficerId are NEVER read from the form — a posted
// status=Approved changes nothing. Failures redirect back to the form with
// the typed values kept and a red-strip error keyed to a fixed code.
export async function createRequest(formData: FormData): Promise<void> {
  const user = await requireUser();
  requireRole(user, "Employee");

  const leaveType = String(formData.get("leaveType") ?? "");
  const otherLeaveType = String(formData.get("otherLeaveType") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const supervisorId = Number(formData.get("supervisorId"));

  // Values are echoed back only through these query params; React escapes
  // them on render, and the form re-checks everything on submit anyway.
  const keep = new URLSearchParams({
    leaveType,
    startDate,
    endDate,
    supervisorId: String(supervisorId),
  });
  if (leaveType === "Other") keep.set("otherLeaveType", otherLeaveType.slice(0, 200));

  const error = validateRequest({ leaveType, otherLeaveType, startDate, endDate });
  if (error) redirect(`/employee/new?error=request&${keep.toString()}`);

  // The cookie carries only id + role: the division is read from the DB
  // so a tampered cookie can never widen who may sign (02-design.md §6).
  const staff = await prisma.user.findUnique({ where: { id: user.id } });
  if (!staff) redirect("/login");

  // Rule 3: same-division Supervisor, or an HR officer only when the
  // division has no Supervisor at all. A forged id falls here (AC-17).
  const signer = await validateSigner(
    { id: staff.id, division: staff.division },
    supervisorId
  );
  if (!signer) redirect(`/employee/new?error=signer&${keep.toString()}`);

  await prisma.leaveRequest.create({
    data: {
      employeeId: staff.id,
      supervisorId: signer.id,
      leaveType,
      otherLeaveType: leaveType === "Other" ? otherLeaveType.trim() : null,
      startDate: new Date(`${startDate}T00:00:00.000Z`),
      endDate: new Date(`${endDate}T00:00:00.000Z`),
      status: "PendingSupervisor",
    },
  });

  // Green success banner from the fixed whitelisted key (design §2 rule 10).
  redirect("/employee?msg=request-submitted");
}

// Send a Signed request to the shared HR queue (requirements U15; AC-21).
// Owner only, and only while Signed — the stored row decides, never the
// form. A posted id for someone else's request or a request in any other
// status leaves no trace (rule 11: refused like absence).
export async function sendToHr(formData: FormData): Promise<void> {
  const user = await requireUser();
  requireRole(user, "Employee");

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isInteger(id)) redirect("/employee");

  const row = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!row || !canSend(row, user)) redirect("/employee");

  await prisma.leaveRequest.update({
    where: { id },
    data: { status: "PendingHR", sentToHrAt: new Date() },
  });
  redirect("/employee?msg=request-sent");
}

// Withdraw the owner's own request while Pending supervisor or Signed
// (requirements U15; AC-30/AC-31). Final status → decidedAt is set, the row
// stays in history, and nothing else on the row is touched. Foreign ids and
// any other status are refused exactly like absence (rule 11): no message,
// no change, silent redirect back to the list.
export async function withdraw(formData: FormData): Promise<void> {
  const user = await requireUser();
  requireRole(user, "Employee");

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isInteger(id)) redirect("/employee");

  const row = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!row || !canWithdraw(row, user)) redirect("/employee");

  await prisma.leaveRequest.update({
    where: { id },
    data: { status: "Withdrawn", decidedAt: new Date() },
  });
  redirect("/employee?msg=request-withdrawn");
}
