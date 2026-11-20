"use server";

// HR decisions (02-design.md §2 rules 1 & 4). The decider is recorded from
// the session, never the form. The no-self-deciding check (rule 4) runs on
// the stored row, so a DevTools-posted approve of a request the officer
// signed via the fallback is refused even though the button was hidden.
import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canDecide, canSign, validateRemark } from "@/lib/leave";

function readRowId(formData: FormData): number {
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isInteger(id)) redirect("/hr");
  return id;
}

// The fallback signer (an HR officer standing in for a division without a
// Supervisor) signs from /hr/[id] — the only place an HR user may sign
// (design §4, rule 4). Rule 4 keeps them out of the decision itself.
export async function sign(formData: FormData) {
  const user = await requireUser();
  requireRole(user, "HR");
  const id = readRowId(formData);

  const row = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!row || !canSign(row, user)) redirect("/hr");

  const rawRemark = String(formData.get("remark") ?? "");
  const remarkError = validateRemark(rawRemark, false);
  if (remarkError) redirect(`/hr/${id}?error=remark`);
  const trimmed = rawRemark.trim();

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: "Signed",
      signedAt: new Date(),
      supervisorRemark: trimmed === "" ? null : trimmed,
    },
  });
  redirect(`/hr/${id}?msg=request-signed`);
}

export async function approve(formData: FormData) {
  const user = await requireUser();
  requireRole(user, "HR");
  const id = readRowId(formData);

  const row = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!row || !canDecide(row, user)) redirect("/hr");

  await prisma.leaveRequest.update({
    where: { id },
    data: { status: "Approved", hrOfficerId: user.id, decidedAt: new Date() },
  });
  redirect(`/hr/${id}?msg=request-approved`);
}

export async function rejectByHr(formData: FormData) {
  const user = await requireUser();
  requireRole(user, "HR");
  const id = readRowId(formData);

  const row = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!row || !canDecide(row, user)) redirect("/hr");

  const rawRemark = String(formData.get("remark") ?? "");
  if (validateRemark(rawRemark, true)) redirect(`/hr/${id}?error=remark`);

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: "RejectedByHR",
      hrRemark: rawRemark.trim(),
      hrOfficerId: user.id,
      decidedAt: new Date(),
    },
  });
  redirect(`/hr/${id}?msg=request-rejected-hr`);
}
