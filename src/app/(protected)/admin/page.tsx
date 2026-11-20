import { requireRole, requireUser } from "@/lib/auth";

// Gradient hero in the shared style (02-design.md §4 "Visual design").
export default async function AdminHome() {
  const user = await requireUser();
  requireRole(user, "Admin");

  return (
    <section className="flex h-full flex-col rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 p-8 sm:p-10">
      <h1 className="text-3xl font-light text-white sm:text-4xl">
        Admin <span className="font-bold">home</span>
      </h1>
      <p className="mt-4 max-w-md text-white/80">
        Welcome, {user.name}. The admin view of every leave record comes with
        the next spec section (view only).
      </p>
    </section>
  );
}
