# Budiman HRMS – Requirements (Login)

> **Scope of this file right now:** login only. The leave request stories
> (FR-02 … FR-09 in the HRMS doc) will be added below this point as separate
> sections, per the rules in `docs/templates/README.md` — do not overwrite
> this file, add to it.

## 1. The problem

Budiman Company's 200 staff still run leave on paper, and there is no system
at all today: no accounts, no logins, no screens. Before anyone can submit or
decide a leave request, the system must know who is signed in and what they
are allowed to see — otherwise any visitor could open HR records.

This module provides:

1. Sign in with a work email (`@budiman.com`) and a password stored only as a hash.
2. One home page per role (Employee, Supervisor, HR, Admin), with no way for a
   logged-in person to open another role's pages.
3. A signed session that lasts 30 minutes of inactivity and is re-checked on
   every page and server action.
4. Sign out from any page, leaving nothing recoverable through the Back button.
5. Six demo accounts loaded by a seed script, so everyone tests with the same logins.
6. Secure-by-design handling of passwords and sessions, following the OWASP
   Top 10 and section 7.5 of the HRMS doc.

## 2. Who uses it (roles)

| Role | Home page | What they do |
|------|-----------|--------------|
| **Employee** | `/employee` | Signs in, lands on their home page, signs out. (Submitting leave comes in a later spec section.) |
| **Supervisor** | `/supervisor` | Signs in, lands on their home page, signs out. |
| **HR** | `/hr` | Signs in, lands on their home page, signs out. |
| **Admin** | `/admin` | Signs in, lands on their home page, signs out. View only, in this and every module. |
| **Logged-out visitor** | `/login` | Sees only the login form. Every other address sends them back to it. |

## 3. User stories

- **U1. Sign in** *(High)*. As a Budiman staff member, I can sign in with my `@budiman.com` email and my password so that only staff can use the system.
- **U2. Landing on my home page** *(High)*. As each role, I land on my own home page after signing in so that I go straight to my own work.
- **U3. Nothing is viewable without logging in** *(High)*. As the company, we ensure a logged-out visitor is redirected to `/login` from every address so that staff and leave data are never exposed.
- **U4. Each role sees only its own pages** *(High)*. As a logged-in user, I cannot open another role's pages so that each person only sees what their role may see.
- **U5. Clear message when sign-in fails** *(High)*. As a staff member who mistyped something, I get one generic error so that I can retry without the page revealing whether my account exists.
- **U6. Sign out** *(High)*. As a logged-in user, I can sign out from any page so that the next person at my laptop cannot act as me.
- **U7. Automatic sign-out after 30 minutes of inactivity** *(High)*. As the company, we sign out idle sessions after 30 minutes so that an unattended laptop stays safe, while active users are never cut off mid-task.
- **U8. The server checks every request** *(High)*. As the company, we verify the session signature, role and expiry on the server for every page and action so that a tampered or forged cookie grants nothing.
- **U9. Demo accounts are seeded** *(Medium)*. As a developer, I can load the six demo users from the HRMS doc with one seed command so that everyone tests with the same logins and no plain password is stored.
- **U10. Failed sign-ins are logged** *(Low)*. As the company, we record the email and time of failed sign-in attempts (never the password) so that repeated guessing can be reviewed later.

## 4. Acceptance checklist

All tests use the demo accounts (HRMS doc §7.2), password `password123`, and
`npm run dev` at http://localhost:3000.

| Status | ID | Check | How to test |
|--------|----|-------|-------------|
| To do | AC-01 | Correct email and password sign in and land on the role's home page | • Go to `/login`<br>• Sign in as `employee-1@budiman.com` / `password123`<br>• You should be on `/employee`, with your name, role and a "Sign out" button in the header<br>• Repeat for `supervisor-1@`, `hr-1@`, `admin@budiman.com` → `/supervisor`, `/hr`, `/admin` |
| To do | AC-02 | Wrong password gives one generic message, keeps the email, clears the password | • Go to `/login`<br>• Enter `employee-1@budiman.com` and a wrong password<br>• You should see "Email address or password is incorrect", your email still in the box, the password box empty, and no page change |
| To do | AC-03 | Unknown email gives the exact same message as a wrong password | • At `/login`, enter `nobody@budiman.com` / `password123`<br>• You should see the same "Email address or password is incorrect" — nothing that reveals the account does not exist |
| To do | AC-04 | An email outside `@budiman.com` gives the same message | • At `/login`, enter `someone@gmail.com` / `password123`<br>• You should see the same generic error |
| To do | AC-05 | Logged-out visitors are sent to `/login` from every address | • Sign out or clear cookies<br>• Type `http://localhost:3000/employee`, then `/admin`, then `/` directly<br>• Each should end at `/login` with no data shown first |
| To do | AC-06 | A logged-in user cannot open another role's pages | • Sign in as `employee-1@budiman.com`<br>• Type `/admin`, then `/hr`, then `/supervisor` directly<br>• Each should be refused (redirected to your own home page or an access-denied page) with no other role's data shown |
| To do | AC-07 | A logged-in user who opens `/login` goes to their own home page | • Sign in as `hr-1@budiman.com`<br>• Type `/login` in the address bar<br>• You should land on `/hr`, not on the form |
| To do | AC-08 | Signing out clears the session and shows a confirmation message | • Sign in, then click "Sign out" in the header<br>• You should land on `/login` with "You have been signed out"<br>• Press the browser Back button — you should still be logged out (back at `/login` or redirected there), not viewing cached pages |
| To do | AC-09 | 30 minutes of inactivity signs you out | • Sign in as `employee-1@budiman.com`<br>• Leave the app untouched for 31 minutes<br>• Click any link — you should land on `/login` with the sign-in form |
| To do | AC-10 | Activity keeps the session alive beyond 30 minutes | • Sign in, then click to another page every 20 minutes for an hour<br>• You should never be thrown back to `/login` |
| To do | AC-11 | A tampered session cookie grants nothing | • Sign in as `employee-1@budiman.com`<br>• In browser DevTools → Application → Cookies, change any character of the session cookie's value<br>• Reload any page — you should be treated as logged out and sent to `/login` |
| To do | AC-12 | Passwords are never stored or logged in plain text | • After seeding, inspect the users table (Prisma Studio or a SQLite viewer)<br>• Every password value should be a bcrypt hash (starts with `$2a$`/`$2b$`), never `password123`<br>• Search the SQLite file and the terminal output of a failed sign-in — `password123` should not appear |
| To do | AC-13 | The seed script loads the six demo accounts and can run twice | • Run `npx prisma db seed`<br>• The six users from HRMS doc §7.2 (names, IC numbers, roles, divisions, designations) should exist<br>• Run it again — it should succeed without duplicate errors |
| To do | AC-14 | The signing secret is not committed | • The session secret should live in `.env`, and `.env` should be listed in `.gitignore`<br>• `git status` should never list `.env` as a change to commit |

## 5. Not included (for now)

- Leave request submission, signing, HR decisions and admin views — later
  spec sections (FR-02 … FR-09).
- Password change, password reset, and any screen for managing users.
- Account lockout, rate limiting, or CAPTCHA after failed sign-ins.
- "Remember me" option, multi-factor authentication, and sign-in with any
  outside provider.
- Showing demo account hints on the login page (decided in interview: none).
- Session revocation lists or forcing a sign-out from another device.

---

# Budiman HRMS – Requirements (Leave Request)

> **Scope of this section:** the Leave Request module — FR-02 … FR-09 of the
> HRMS doc plus the decisions agreed in the interview of 2026-11-20 (marked
> *(interview)*). Appended below the login section, which stays as approved.
> All logins are the demo accounts of design Reference B and D, password
> `password123`, app at http://localhost:3000.

## 1. The problem (leave requests)

Paper leave forms get lost or delayed, employees cannot see where their
request is, and HR retypes everything into a spreadsheet with no single list
of requests waiting for a decision. This module puts one request in one
system, visible from submission to decision.

This module provides:

1. Employees submit a leave request (type, dates, and a signer from their own
   division — or an HR officer when the division has no supervisor).
2. Supervisors sign or reject (a rejection needs a remark); the employee then
   sends a signed request to the shared HR queue.
3. HR approves or rejects (a rejection needs a remark); the officer who
   decided is recorded.
4. Every role sees the requests it needs — own list, to-do queue plus
   history — with status and remarks.
5. The admin sees every leave record, view only.
6. Employees can withdraw a request while it has not reached HR; a finished
   request can be copied into a new one. *(interview)*
7. Every action confirms first and shows a success message; the server
   re-checks every rule regardless of the screen.
8. Secure by design across the whole module (doc §6 last row, FR-10, and
   §7.5): like login, every rule above is enforced on the server per the
   OWASP Top 10 — see design §6 for how.

## 2. Who uses it (leave request roles)

| Role | Pages | What they do in this module |
|------|-------|------------------------------|
| **Employee** | `/employee`, `/employee/new`, `/employee/[id]` | Submits a request, tracks its status, withdraws or sends to HR, copies a past request to a new one. Sees only their own requests. |
| **Supervisor** | `/supervisor`, `/supervisor/[id]` | Signs or rejects (remark required) the requests addressed to them. Sees their to-sign queue plus everything ever assigned to them. Decides only. |
| **HR** | `/hr`, `/hr/[id]` | Approves or rejects (remark required) requests in the shared queue; the decider is recorded; an officer who signed via the HR fallback signs it from the `/hr/[id]` page (Sign pill) but cannot decide that same request. Sees the queue plus every request. |
| **Admin** | `/admin`, `/admin/[id]` | Sees every leave record with signer, decider, status and remarks. View only — no button changes anything, now or later. |
| **Logged-out visitor** | `/login` | Nothing here; every leave page still redirects to `/login` (login §2, U3). |

## 3. User stories (leave requests)

Listed High first, as in login §3.

- **U11. Submit a leave request** *(High, FR-02)*. As an Employee, I can
  submit a request choosing a leave type, start and end dates, and a signer
  from my own division, so that my leave is captured in one system instead of
  on paper. • Test: sign in as `employee-1@budiman.com`, New request,
  Annual leave, start today, end two days later, pick Supervisor 1, submit →
  success message and the request sits in my list as "Pending supervisor"
  (AC-15).
- **U12. HR fallback signer** *(High, interview)*. As an Employee whose
  division has no Supervisor account, I can pick an HR officer to sign so
  that I am never blocked from applying. • Test: as `employee-3@budiman.com`
  (Operations, no supervisor), the signer list shows HR officers instead; the
  request submits with the chosen officer recorded as signer (AC-18).
- **U13. Supervisor signs** *(High, FR-03)*. As a Supervisor, I can sign the
  requests sent to me so that the employee can forward them to HR. • Test: as
  `supervisor-1@budiman.com`, open Employee 1's pending request → Sign →
  status becomes "Signed" and the employee sees it (AC-19).
- **U14. Supervisor rejects with a remark** *(High, FR-03)*. As a Supervisor,
  I can reject with a reason so that the employee knows why and nothing gets
  lost. • Test: as `supervisor-1`, reject a request with the remark field
  empty → refused; with a remark → status "Rejected by supervisor", reason
  visible to the employee (AC-20).
- **U15. Send a signed request to HR** *(High, FR-04)*. As an Employee, I can
  send a signed request to the shared HR queue so that it waits for a
  decision in one list. • Test: as `employee-1` on a Signed request → Send to
  HR → status "Pending HR", and it appears on `/hr` (AC-21).
- **U16. HR approves** *(High, FR-05)*. As an HR officer, I can approve a
  queued request so that leave is granted and the record shows who decided. •
  Test: as `hr-2@budiman.com`, approve a Pending HR request → status
  "Approved", record shows hr-2 as the decider (AC-22).
- **U17. HR rejects with a remark** *(High, FR-05)*. As an HR officer, I can
  reject with a reason so that the employee can act on it. • Test: as `hr-1`,
  reject with empty remark → refused; with remark → "Rejected by HR" showing
  the reason and hr-1 as decider (AC-23).
- **U18. No self-deciding** *(High, interview)*. As the company, we stop the
  HR officer who signed a request via the fallback from deciding the same
  request, so that signing and deciding stay separate. • Test: `employee-3`
  submits choosing HR 1 as the fallback signer; HR 1 signs it and it is sent
  to HR; as `hr-1` the request on `/hr` is flagged "you signed this" with no
  decision buttons (AC-24).
- **U19. Each role sees the right list** *(High, FR-06)*. As each role, I see
  my current and past requests with status and remarks so that I always know
  where things stand. • Test: employee list = own only; supervisor queue =
  own-assigned only; HR = queue on top then every request, including
  supervisor rejections (AC-25, AC-26, AC-27).
- **U20. Confirm, then success** *(High, FR-07)*. As any user, every action
  (submit, sign, reject, send to HR, approve, withdraw) asks me to confirm in
  a dialog and then shows a success message, so I never act by accident and
  always know it worked. • Test: click any action → styled modal; Cancel
  changes nothing; Confirm → green success banner (AC-28).
- **U21. Admin sees everything, view only** *(Medium, FR-08)*. As the Admin,
  I see every leave record in a table with status, remarks, signer and
  decider so that I can audit without changing anything. • Test: sign in as
  `admin@budiman.com`, check the table lists all requests newest first and
  the detail page has no action buttons (AC-29).
- **U22. Withdraw a request** *(Medium, interview)*. As an Employee, I can
  withdraw my request while it is Pending supervisor or Signed so that
  mistakes do not have to sit in a queue until someone rejects them. • Test:
  as `employee-1`, withdraw a Pending supervisor request (confirm modal →
  "Withdrawn"); the same button is gone once the request is Pending HR
  (AC-30, AC-31).
- **U23. Copy a request to a new one** *(Low, interview)*. As an Employee, I
  can copy any past request into a new form, prefilled, so that rebooking
  does not mean retyping. • Test: on a Rejected request → Copy to new → form
  opens prefilled → submit → two separate requests, same dates allowed
  (AC-32).

## 4. Acceptance checklist (leave requests)

Numbering continues from login (AC-01 … AC-14). Sign in/out steps use the
login flow; leave steps start from a signed-in role home page. The seed from
design Reference D must be loaded for the fallback and division checks.

| Status | ID | Check | How to test |
|--------|----|-------|-------------|
| To do | AC-15 | An employee submits a request and it lands as Pending supervisor | • Sign in as `employee-1@budiman.com` → `/employee` → New request<br>• Pick Annual leave, start = today, end = two days later (same-day and past dates must also be accepted), Supervisor 1 as signer, submit<br>• Success banner appears; your list shows the request as "Pending supervisor" with its type and dates |
| To do | AC-16 | The form refuses bad input on the server too | • In the form, set end before start → refused with a clear message (not by URL editing; submit normally)<br>• Leave dates blank → refused<br>• Pick type "Other" without writing what it is for → refused; with text → accepted<br>• With DevTools, post the form with an extra field like `status=Approved` → the request is still saved as Pending supervisor |
| To do | AC-17 | Only same-division supervisors are offered, and a forged choice is refused | • As `employee-1` (Finance), the signer list shows exactly Supervisor 1 and Supervisor 2 — no other supervisor, no HR, no employees<br>• Forge a request with `supervisorId` of `supervisor-3` (Marketing) in DevTools → server refuses with an error, nothing is saved |
| To do | AC-18 | Division without a supervisor falls back to HR officers | • Sign in as `employee-3@budiman.com` (Operations — no Supervisor exists)<br>• The form's signer list shows HR 1 and HR 2 with a note that they stand in as signers; submit choosing HR 1<br>• Request saved as Pending supervisor with HR 1 recorded as signer |
| To do | AC-19 | The assigned signer signs; the employee sees Signed | • Sign in as `supervisor-1@budiman.com` → queue shows employee-1's request → open detail → Sign (confirm modal) → success message<br>• Status becomes "Signed"; as `employee-1` the request now shows Signed with a "Send to HR" button |
| To do | AC-20 | A supervisor rejection requires a remark and is final | • As `supervisor-1`, open a Pending supervisor request → Reject → try confirming with the remark empty → refused by the screen AND by the server (post it anyway in DevTools)<br>• Enter a remark → status "Rejected by supervisor", reason shown to `employee-1` in list and detail; no further buttons for anyone |
| To do | AC-21 | Only the owner can send a Signed request to HR | • As `employee-1`, "Send to HR" appears only on Signed requests (not on Pending supervisor, Approved or finished ones)<br>• Confirm → status "Pending HR", success message; the request now appears in `/hr` queue<br>• DevTools-post "send to HR" for a Pending supervisor request → server refuses |
| To do | AC-22 | HR approves and the decider is recorded | • Sign in as `hr-2@budiman.com` → queue shows the Pending HR request → Approve (confirm) → success<br>• Status "Approved"; detail shows HR 2 as the HR officer who decided, with the decided date<br>• As `employee-1`, the same request shows Approved with "decided by HR 2" |
| To do | AC-23 | HR rejection requires a remark | • As `hr-1@budiman.com`, reject a Pending HR request: empty remark → refused by screen and server; with remark → "Rejected by HR", reason and decider visible to the employee and in the list |
| To do | AC-24 | An HR signer cannot decide the request they signed | • `employee-3` submits with HR 1 as fallback signer (AC-18); as `hr-1`, open it at `/hr/[id]` and sign it with the Sign pill (signing stays allowed for the fallback signer); as `employee-3`, send it to HR (AC-21)<br>• As `hr-1`, open it in `/hr` → it shows the flag "you signed this request" and NO approve/reject buttons<br>• Post decide for `hr-1` via DevTools → server refuses<br>• `hr-2` sees normal buttons and can decide |
| To do | AC-25 | The employee sees only their own requests | • Create one request as `employee-1` and one as `employee-2@budiman.com`<br>• Each employee's `/employee` list shows only their own, newest first, with status and any remarks<br>• Copy `employee-2`'s request URL and open it as `employee-1` → page-not-found, nothing of the other request is shown |
| To do | AC-26 | Supervisors see only their assigned queue and history | • `supervisor-1`'s `/supervisor` shows Pending supervisor requests addressed to them on top, then everything ever assigned to them; nothing addressed to Supervisor 2 or 3<br>• Status and any remarks are visible in the list (FR-06)<br>• As `supervisor-3` (Marketing), an employee-1 request is invisible in the list and its detail URL gives page-not-found |
| To do | AC-27 | HR sees the shared queue plus the full record | • `/hr` lists all Pending HR requests on top (any officer, newest first), then every request ever submitted, including ones rejected by supervisors and by HR<br>• Status and remarks are visible in the list |
| To do | AC-28 | Every action confirms first and reports success | • Walk all actions as their roles: submit, sign, supervisor reject, HR reject, send to HR, approve, withdraw<br>• Each opens the styled confirmation modal (lavender overlay, white card, Cancel/confirm pills) BEFORE the action runs; Cancel returns with no change to the list or database<br>• Each confirmed action shows a green success banner naming what happened |
| To do | AC-29 | Admin sees every record, changes nothing | • Sign in as `admin@budiman.com` → `/admin` table lists every request, newest submitted first, with employee, division, type, dates, status, signer, HR officer<br>• Click a row → read-only detail with remarks and dates; no action button anywhere on the page<br>• DevTools-post a sign/approve/withdraw action as admin → refused (role check) |
| To do | AC-30 | Withdrawal works before HR and is final | • As `employee-1`, a "Withdraw" button appears on Pending supervisor and Signed requests only<br>• Confirm in the modal → status "Withdrawn", success message; the request stays visible in history<br>• No withdraw button on Pending HR, Approved or Rejected requests; DevTools-post withdraw for a Pending HR one → server refuses |
| To do | AC-31 | Only the owner can withdraw | • `employee-2` has a Pending supervisor request; as `employee-1` its detail URL → page-not-found; DevTools-post withdraw of employee-2's request id → server refuses |
| To do | AC-32 | Copy to new prefills and creates a separate request | • On any past request (e.g. a Rejected one) as its owner → Copy to new → the form opens with type, dates and signer prefilled (and "Other" text when set)<br>• Submit → a new Pending supervisor request is created; the original is untouched; the same dates are accepted for the copy |
| To do | AC-33 | The status machine is enforced on the server | • With DevTools or a forged fetch, try every illegal action against a real request id: Sign a Signed request; Send to HR a Pending supervisor request; Withdraw an Approved/Rejected/Withdrawn request; Approve a Signed request; decide a Withdrawn one<br>• Every attempt is refused by the server with an error and the record keeps its status |

## 5. Not included (leave requests, for now)

- Leave balances, annual entitlements or day counts deducted on approval
  (decided: none — HR's spreadsheet keeps counting).
- Half-days or hourly leave; dates are whole days only.
- Editing a request after it is submitted — changes mean withdraw and
  re-submit (or Copy to new).
- Duplicate or overlapping-date detection — a person may request the same
  dates twice; the signer judges.
- Email or push notifications; statuses are seen on the pages only.
- Status/division filters on the admin table (kept Low — only if time
  remains, per the doc's priority rule).
- Re-opening, un-rejecting or un-approving a finished request; final means
  final.
- Bulk actions (sign several at once) and any calendar view.
- Users other than the seeded demo accounts (no sign-up, as in login).
