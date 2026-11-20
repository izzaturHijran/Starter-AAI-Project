# Project rules — Budiman HRMS (Leave Request module)

## What it is
A web app replacing Budiman Company's paper leave process. Four roles: Employee
(submits a request, picks a supervisor from their own division, sends it to HR),
Supervisor (signs or rejects with a reason), HR (approves or rejects from a shared
queue; the decider is recorded), Admin (view only). Statuses: Pending supervisor →
Signed → Pending HR → Approved / Rejected by supervisor / Rejected by HR.
Source of truth: `docs/Agentic AI - HRMS Doc.pdf` and the specs in `docs/specs/`.

## Built with (fixed — do not add other tools)
Next.js (TypeScript, App Router, server actions), SQLite through Prisma, Tailwind
CSS, login by signed session cookie, passwords hashed with bcryptjs. Versions are
pinned in `package.json`; Prisma is listed but not set up yet.

## How to run
- `npm install`, then `npm run dev` → http://localhost:3000 (needs Node 20.9+).
- `npm run lint` before finishing any piece of work.
- Demo logins are the `@budiman.com` accounts from the HRMS doc, password `password123`.

## Where things live
- `docs/` — the HRMS doc, `templates/` (blank specs) and `specs/` (your filled specs).
- `src/app/` — every screen and its server logic (Next.js App Router).

## How to work
- Spec-driven: write/approve `docs/specs/01-requirements.md`, `02-design.md` and
  `03-tasks.md` before building. If behaviour must change, fix the spec first, then
  the code. The AI drafts specs; a human approves them.
- Build one task at a time from `03-tasks.md`, High priority first; login comes first.
- Follow the doc's rules: log in before anything; each role sees only its own pages;
  rejections need a reason; every action confirms first and shows a success message.
- Secure by design (OWASP Top 10): check login and role on every page, and check
  again on the server; never store or log plain-text passwords.
- Every commit message uses Conventional Commits, e.g. `feat: add login page`,
  `fix: show remark on rejected requests`, `docs: update design spec`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
