"use server";

// Supervisor decisions (02-design.md §2 rule 1). Both actions re-check
// login, role and the stored row on the server — a direct POST with a
// forged id or an already-decided request is refused like a page-not-found
// would be (rule 11), and the remark rules are enforced again after the
// screen (rule 5 / AC-20).
import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canSign, validateRemark } from "@/lib/leave";

function readRowId(formData: FormData): number {
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isInteger(id)) redirect("/supervisor");
  return id;
}

export async function sign(formData: FormData) {
  const user = await requireUser();
  requireRole(user, "Supervisor");
  const id = readRowId(formData);

  const row = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!row || !canSign(row, user)) redirect("/supervisor");

  // Remark is optional when signing (machine table §2 rule 1); if present
  // it still has to pass the shared validator.
  const rawRemark = String(formData.get("remark") ?? "");
  const remarkError = validateRemark(rawRemark, false);
  if (remarkError) redirect(`/supervisor/${id}?error=remark`);
  const trimmed = rawRemark.trim();

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: "Signed",
      signedAt: new Date(),
      supervisorRemark: trimmed === "" ? null : trimmed,
    },
  });
  redirect(`/supervisor/${id}?msg=request-signed`);
}

export async function rejectBySupervisor(formData: FormData) {
  const user = await requireUser();
  requireRole(user, "Supervisor");
  const id = readRowId(formData);

  const row = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!row || !canSign(row, user)) redirect("/supervisor");

  const rawRemark = String(formData.get("remark") ?? "");
  if (validateRemark(rawRemark, true)) redirect(`/supervisor/${id}?error=remark`);

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: "RejectedBySupervisor",
      supervisorRemark: rawRemark.trim(),
      decidedAt: new Date(),
    },
  });
  redirect(`/supervisor/${id}?msg=request-rejected`);
}
