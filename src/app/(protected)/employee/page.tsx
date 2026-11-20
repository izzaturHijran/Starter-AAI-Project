import { requireRole, requireUser } from "@/lib/auth";

// Gradient hero in the shared style (02-design.md §4 "Visual design").
export default async function EmployeeHome() {
  const user = await requireUser();
  requireRole(user, "Employee");

  return (
    <section className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 p-8 sm:p-10">
      <h1 className="text-3xl font-light text-white sm:text-4xl">
        Employee <span className="font-bold">home</span>
      </h1>
      <p className="mt-4 max-w-md text-white/80">
        Welcome, {user.name}. Leave request features arrive with the next
        spec section.
      </p>
    </section>
  );
}
