# Budiman HRMS – Design (Login)

> **Scope of this file right now:** login only, matching
> `docs/specs/01-requirements.md`. The leave request design comes later and
> is appended below, not written over. If this file and the requirements
> disagree, fix the requirements first, then this file.

## 1. Tables

### `User` – one row per person who can log in

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the row |
| `name` | text | yes | Full name, e.g. "Supervisor 1" |
| `icNumber` | text | yes | Identity card number, format `xx-xxxxxx` (two digits, hyphen, six digits) |
| `email` | text | yes | Work email, always ends `@budiman.com`. **Unique** — it is the login name |
| `passwordHash` | text | yes | bcrypt hash of the password (starts `$2a$`/`$2b$`). The plain password is never stored in this column, in any other column, or in logs |
| `role` | text (enum) | yes | Exactly one of `Employee`, `Supervisor`, `HR`, `Admin` (Reference A) |
| `division` | text | yes | One of the fixed divisions (Reference A). `Admin` is also a value, used only by the Admin account |
| `designation` | text | yes | Job title, one of the titles for that division (Reference A) |
| `createdAt` | date | yes | Set automatically when the account is created |

No other tables exist yet. `LeaveRequest` and its fields arrive with the
leave module; they will be added in a new section below this point.

## 2. Business rules

1. **Login before anything.** Only `/login` responds to a logged-out visitor.
   Every other route, and every server action, requires a valid session
   first; anonymous requests are redirected to `/login`.
2. **One role, one home.** Each user has exactly one role, and the role
   decides which pages they can open: Employee → `/employee`, Supervisor →
   `/supervisor`, HR → `/hr`, Admin → `/admin`. Opening another role's page
   is refused **on the server**, not just by hiding links.
3. **Email is the login name.** `email` is unique and must end
   `@budiman.com`. The domain and format are re-checked on the server, never
   trusted from the form alone.
4. **Passwords are only ever a bcrypt hash.** The hash is created with
   bcryptjs; the plain password never reaches the database, the logs, the
   URL, or an error message.
5. **The session is a signed cookie, and it is small.** It holds only
   `userId`, `role`, and an expiry time, signed with HMAC-SHA256 using a
   secret from `.env` (never committed). Any edit to the cookie breaks the
   signature and counts as logged out.
6. **30 minutes of inactivity, refreshed by activity.** Each request whose
   session checks out re-issues the cookie with an expiry 30 minutes ahead.
   An idle user's next click sends them to `/login`; an active user is never
   cut off.
7. **Sign-in failures never talk.** Unknown email, wrong password and a
   non-`@budiman.com` email all produce the exact same message:
   *"Email address or password is incorrect."* The email stays filled in,
   the password field clears. The password is bcrypt-compared even when the
   email is unknown (against a fixed dummy hash), so response times do not
   reveal whether an account exists.
8. **Sign out clears everything client-side.** Signing out deletes the
   cookie and returns to `/login` with "You have been signed out". Signed-in
   pages are sent with no-store cache headers, so the Back button cannot
   recover them.
9. **The server always has the last word.** The session's signature,
   expiry and role are verified in the protected layout (every page) *and*
   again inside every server action. A middleware redirect is only a quick
   first line for user experience — it is never the check anything depends
   on.
10. **Seeding is safe to repeat.** `npx prisma db seed` upserts the six
    demo users by email and hashes `password123` at write time. The app has
    no sign-up screen; only the seed creates accounts at this stage.
11. **Failed sign-ins are recorded, carefully.** A failed attempt logs the
    email and time only — never the password, never a session token.

## 3. Technology

Only what the HRMS doc §7.3 pins; versions come from `package.json` and are
not changed.

| Part | Choice | In plain words |
|------|--------|----------------|
| Web framework | Next.js 16 (TypeScript, App Router) | Screens and server logic live in one project; forms post to server actions |
| Database | SQLite through Prisma 6 | No database server to install; the data is one file |
| Styling | Tailwind CSS 4 | Styles sit next to each screen |
| Login | Signed session cookie (HMAC-SHA256), passwords hashed with bcryptjs | Simple and safe, with no extra accounts or auth library |
| Forms and buttons | Server actions | No separate API to design |
| Session secret | `SESSION_SECRET` in `.env`, gitignored | The key that signs the cookie; random, never committed |

## 4. Screens (routes)

| Route | Who | What it shows | Status |
|-------|-----|---------------|--------|
| `/` | Anyone | No screen of its own: logged out → redirect to `/login`; logged in → redirect to the role's home page | To do |
| `/login` | Logged-out visitors | Email box, password box, "Sign in" button. Generic error on failure ("Email address or password is incorrect", email kept, password cleared); "You have been signed out" after signing out. A logged-in user who opens it is redirected to their home page. No demo-account hints | To do |
| `/employee` | Employee | Home page placeholder for now, with the shared header: name, role, and "Sign out". Leave features arrive in the next spec section | To do |
| `/supervisor` | Supervisor | Same shape as `/employee`, for the Supervisor role | To do |
| `/hr` | HR | Same shape as `/employee`, for the HR role | To do |
| `/admin` | Admin | Same shape as `/employee`, for the Admin role. View only, now and always | To do |

Wrong-role access (e.g. an Employee typing `/admin`) is refused server-side
by redirecting to the user's own home page — the other role's page is never
rendered first.

### Visual design (shared by `/login` and the home pages)

Based on the mockup supplied by the user (a split white card on a lavender
page). Look only — behaviour, text and checks from §2 stay exactly as they
are.

- **Page:** light lavender background (≈ `#C9BCEA`); one white card,
  rounded 24 px corners, soft shadow, centred on the screen.
- **Login card:** two columns — white form panel (left, ~4/9) and a purple→
  blue gradient hero (right, ~5/9); stacked on small screens.
  - Form panel: brand top-left (small solid deep-purple circle with "B" +
    "Budiman HRMS"); centred indigo (≈ `#5146C6`) "Login" heading; Email
    and Password are underline-only inputs (no box border, grey
    placeholders, labels kept for screen readers); the submit button is a
    deep-purple (≈ `#4A0AAE`) full-width **pill** with white uppercase
    text ("SIGN IN"). The error ("…is incorrect") and signed-out messages
    keep their text and `role="alert"`/`role="status"`, restyled as
    rounded strips.
  - Hero panel: diagonal gradient (violet-600 → blue-500), large white
    "Welcome to **Budiman HRMS**" (light weight, last words bold), one
    muted-white subtitle line, and three static decorative dots at the
    bottom-left.
- **Home card:** white card on lavender; inside it a slim header bar
  (brand left; right: user name, purple role-badge pill, deep-purple pill
  "SIGN OUT" button) and a body holding the same gradient hero panel with
  the "{Role} home" heading and the welcome line.
- **Not copied from the mockup, on purpose:** "Don't have an account? Sign
  Up", "Forgot Your Password?" and the live carousel dots. The HRMS has no
  sign-up or password-reset feature (§2 rule 10), so those would be dead
  links — links that *do something* (nothing), which changes what the
  screens do. The mockup's photograph is replaced by the CSS gradient: no
  image asset to licence and nothing to load.

## 5. Where the code lives

| Folder / file | What's in it |
|---------------|--------------|
| `prisma/schema.prisma` | The `User` model from §1 |
| `prisma/seed.ts` | The six demo users from Reference B, password hashed at write time, upsert-by-email so it can run twice |
| `src/lib/db.ts` | One shared Prisma client |
| `src/lib/session.ts` | Create, verify and refresh the signed session cookie (HMAC-SHA256 sign/verify, 30-minute expiry); sign out = delete cookie |
| `src/lib/auth.ts` | `signIn` logic (find user, bcrypt compare — dummy compare for unknown emails) and `requireUser()` / `requireRole(role)` helpers every protected page and action calls |
| `src/app/login/page.tsx` | The login form screen |
| `src/app/login/actions.ts` | Server actions: `signIn` (sets the cookie, redirects to the role's home) and `signOut` (deletes the cookie, back to `/login`) |
| `src/app/(protected)/layout.tsx` | Layout wrapping all signed-in pages: calls `requireUser()`, renders the lavender page, white card and header (brand, name, role badge, "Sign out") in the shared visual style (§4) |
| `src/app/(protected)/employee/page.tsx` | Employee home placeholder |
| `src/app/(protected)/supervisor/page.tsx` | Supervisor home placeholder |
| `src/app/(protected)/hr/page.tsx` | HR home placeholder |
| `src/app/(protected)/admin/page.tsx` | Admin home placeholder |
| `src/app/page.tsx` | The redirect-only root page (`/`) |
| `src/proxy.ts` | Next 16 renamed middleware to `proxy.ts` (verified in `node_modules/next/dist/docs/`): quick redirect of logged-out requests on protected paths to `/login` (experience only — §2 rule 9) and the sliding 30-minute cookie refresh (§2 rule 6) |
| `next.config.ts` | `headers()`: `no-store, must-revalidate` on `/employee|supervisor|hr|admin` (Server Components cannot set headers, so cache policy lives here) |
| `.env` (gitignored), `.env.example` | `SESSION_SECRET` — real value in `.env`, a placeholder in `.env.example` so the repo explains itself |

## 6. Security (in plain words)

- **Every page checks:** the protected layout verifies the cookie's
  signature, expiry and role before rendering, and shows only that role's
  page.
- **Every action checks again on the server:** each server action calls
  `requireUser()` / `requireRole()` itself — a forged fetch to an action is
  refused even if the page check were skipped.
- **The cookie** is `httpOnly` (JavaScript can't read it), `sameSite=Lax`
  (cross-site requests don't carry it), and `secure` when served over
  HTTPS. It carries only id, role and expiry — never name, IC number or
  password.
- **The secret** lives only in `.env`, which `.gitignore` keeps out of
  commits. Without a valid secret nothing can forge a session.
- **Passwords** exist in plain text only in the form, in memory briefly for
  the bcrypt check, then nowhere. Logs get email + time for failures, never
  passwords or tokens.
- **Input on the login form is validated on the server** (email shape,
  `@budiman.com` domain), and all messages shown back are generic — the
  screen never echoes anything the server did not confirm.

## 7. Commands

| Command | What it does |
|---------|--------------|
| `npm install` | Install the pinned dependencies |
| `npx prisma migrate dev` | Create/update the SQLite database from the schema |
| `npx prisma db seed` | Load the six demo users (safe to re-run) |
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run lint` | Check the code before finishing any piece of work |

---

# Reference

## Reference A. Fixed lists

- **Roles:** `Employee`, `Supervisor`, `HR`, `Admin`
- **Divisions:** `Finance`, `Human Resources`, `Information Technology`,
  `Operations`, `Marketing` — plus `Admin` for the Admin account only
- **Designations by division:**
  - Finance: Finance Manager, Accountant, Accounts Clerk
  - Human Resources: HR Manager, HR Officer, HR Assistant
  - Information Technology: IT Manager, Software Developer, IT Support Officer
  - Operations: Operations Manager, Operations Supervisor, Operations Executive
  - Marketing: Marketing Manager, Marketing Executive, Marketing Assistant
  - Admin: Admin Manager
- **Login rules:** email must end `@budiman.com`; IC number format
  `xx-xxxxxx`; session expiry 30 minutes after the last activity; bcrypt
  cost as bcryptjs default

## Reference B. Demo data (loaded by `prisma/seed.ts`, all with password `password123`)

| Email | Name | IC No. | Role | Division | Designation |
|-------|------|--------|------|----------|-------------|
| `employee-1@budiman.com` | Employee 1 | 00-148888 | Employee | Finance | Accounts Clerk |
| `supervisor-1@budiman.com` | Supervisor 1 | 00-157777 | Supervisor | Finance | Finance Manager |
| `supervisor-2@budiman.com` | Supervisor 2 | 00-166666 | Supervisor | Finance | Accountant |
| `hr-1@budiman.com` | HR 1 | 00-175555 | HR | Human Resources | HR Officer |
| `hr-2@budiman.com` | HR 2 | 00-184444 | HR | Human Resources | HR Officer |
| `admin@budiman.com` | Admin | 00-193333 | Admin | Admin | Admin Manager |

The employee and both supervisors share the Finance division, so the
employee can pick either supervisor in the leave module later.
