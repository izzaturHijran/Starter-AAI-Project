import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth";
import { signIn } from "./actions";

export const metadata = { title: "Sign in — Budiman HRMS" };

// Visual reference (user-supplied mockup): split white card on a lavender
// page — underline inputs + purple pill button on the left, purple→blue
// gradient hero on the right. See 02-design.md §4 "Visual design".
export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  // AC-07: someone already signed in never sees the form.
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));

  const { error, email, signedOut } = await props.searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#c9bcea] p-4 text-slate-900 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-9">
        {/* Left: the form panel */}
        <div className="flex flex-col px-8 py-10 sm:px-12 md:col-span-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4a0aae] text-sm font-bold text-white"
            >
              B
            </span>
            <span className="font-semibold text-[#4a0aae]">Budiman HRMS</span>
          </div>

          <div className="mx-auto mt-16 w-full max-w-xs">
            <h1 className="text-center text-3xl font-bold text-[#5146c6]">Login</h1>
            <p className="mt-2 text-center text-sm text-slate-500">
              Sign in with your work email.
            </p>

            {signedOut === "1" && (
              <p
                role="status"
                className="mt-6 rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-700"
              >
                You have been signed out.
              </p>
            )}

            {/* AC-02/03/04: one generic message for every failure; the typed
                email stays, the password box starts empty. No demo hints. */}
            {error === "invalid" && (
              <p
                role="alert"
                className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700"
              >
                Email address or password is incorrect.
              </p>
            )}

            <form action={signIn} className="mt-10 space-y-7">
              <label className="block">
                <span className="sr-only">Email</span>
                <input
                  type="email"
                  name="email"
                  defaultValue={email ?? ""}
                  placeholder="Email"
                  autoComplete="username"
                  required
                  className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 placeholder:text-slate-400 focus:border-[#5146c6] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="sr-only">Password</span>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 placeholder:text-slate-400 focus:border-[#5146c6] focus:outline-none"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-full bg-[#4a0aae] px-6 py-3 font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#3a0890]"
              >
                Sign in
              </button>
            </form>
          </div>
        </div>

        {/* Right: the gradient hero */}
        <div className="relative flex min-h-56 flex-col bg-gradient-to-br from-violet-600 to-blue-500 p-10 md:col-span-5">
          <h2 className="mt-10 text-4xl font-light text-white sm:text-5xl md:mt-24">
            Welcome to <span className="font-bold">Budiman HRMS</span>
          </h2>
          <p className="mt-4 max-w-sm text-white/80">
            The simple way to submit, sign and approve leave requests at
            Budiman Company.
          </p>
          <div aria-hidden className="absolute bottom-8 left-10 flex gap-2">
            <span className="h-1.5 w-6 rounded-full bg-white" />
            <span className="h-1.5 w-6 rounded-full bg-white/40" />
            <span className="h-1.5 w-6 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    </main>
  );
}
