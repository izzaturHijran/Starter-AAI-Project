import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

// Wraps every signed-in page: refuses logged-out visitors and renders the
// shared header (02-design.md §5). Cache headers for these routes come from
// next.config.ts (no-store, decided with the user) — cookies/headers cannot
// be written from a Server Component.
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-[#c9bcea] p-4 text-slate-900 sm:p-8">
      {/* Same white-card-on-lavender shell as the login screen
          (02-design.md §4 "Visual design"). */}
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:min-h-[calc(100vh-4rem)]">
        <header className="flex items-center justify-between px-6 py-5 sm:px-8">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4a0aae] text-sm font-bold text-white"
            >
              B
            </span>
            <span className="font-semibold text-[#4a0aae]">Budiman HRMS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
              {user.role}
            </span>
            {/* Sign out is a server action — clears the cookie server-side. */}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full bg-[#4a0aae] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#3a0890]"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-6 pb-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
