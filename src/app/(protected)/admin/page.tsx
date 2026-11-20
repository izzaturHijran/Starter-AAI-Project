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
      <div aria-hidden className="mt-auto flex gap-2 pt-16">
        <span className="h-1.5 w-6 rounded-full bg-white" />
        <span className="h-1.5 w-6 rounded-full bg-white/40" />
        <span className="h-1.5 w-6 rounded-full bg-white/40" />
      </div>
    </section>
  );
}
