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
