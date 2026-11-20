// Loads the six demo users from docs/specs/02-design.md Reference B
// (HRMS doc §7.2) plus the three Reference-D test users (Task 13 /
// interview-approved) so the division rules and the HR fallback can be
// exercised. Safe to run twice: upserts by email.
// The plain password exists only here, in memory, just long enough to be
// hashed — the database stores only the bcrypt hash (02-design.md §2 rule 4).
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

const demoUsers = [
  {
    name: "Employee 1",
    icNumber: "00-148888",
    email: "employee-1@budiman.com",
    role: "Employee",
    division: "Finance",
    designation: "Accounts Clerk",
  },
  {
    name: "Supervisor 1",
    icNumber: "00-157777",
    email: "supervisor-1@budiman.com",
    role: "Supervisor",
    division: "Finance",
    designation: "Finance Manager",
  },
  {
    name: "Supervisor 2",
    icNumber: "00-166666",
    email: "supervisor-2@budiman.com",
    role: "Supervisor",
    division: "Finance",
    designation: "Accountant",
  },
  {
    name: "HR 1",
    icNumber: "00-175555",
    email: "hr-1@budiman.com",
    role: "HR",
    division: "Human Resources",
    designation: "HR Officer",
  },
  {
    name: "HR 2",
    icNumber: "00-184444",
    email: "hr-2@budiman.com",
    role: "HR",
    division: "Human Resources",
    designation: "HR Officer",
  },
  {
    name: "Admin",
    icNumber: "00-193333",
    email: "admin@budiman.com",
    role: "Admin",
    division: "Admin",
    designation: "Admin Manager",
  },
  // Reference D — test users (02-design.md, Leave Request section)
  {
    name: "Employee 2",
    icNumber: "00-200101",
    email: "employee-2@budiman.com",
    role: "Employee",
    division: "Marketing",
    designation: "Marketing Assistant",
  },
  {
    name: "Supervisor 3",
    icNumber: "00-200202",
    email: "supervisor-3@budiman.com",
    role: "Supervisor",
    division: "Marketing",
    designation: "Marketing Manager",
  },
  {
    name: "Employee 3",
    icNumber: "00-200303",
    email: "employee-3@budiman.com",
    role: "Employee",
    division: "Operations",
    designation: "Operations Executive",
  },
];

async function main() {
  // bcryptjs 3.x requires the cost argument; 10 is its default
  // (02-design.md Reference A: "bcrypt cost as bcryptjs default").
  const passwordHash = await hash(DEMO_PASSWORD, 10);
  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash },
      create: { ...user, passwordHash },
    });
  }
  const count = await prisma.user.count();
  console.log(`Seeded ${demoUsers.length} demo users (users in db: ${count})`);
}

main().finally(() => prisma.$disconnect());
