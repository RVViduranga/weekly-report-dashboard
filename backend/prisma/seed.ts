import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { ReportStatus, Prisma } from "../src/generated/prisma/client";

// Most recent Monday used as week 0; earlier weeks count backwards from here.
const ANCHOR_MONDAY = new Date(Date.UTC(2026, 7, 31));

function weekStartFor(index: number): Date {
  const d = new Date(ANCHOR_MONDAY);
  d.setUTCDate(d.getUTCDate() - index * 7);
  return d;
}

function weekEndFor(index: number): Date {
  const d = weekStartFor(index);
  d.setUTCDate(d.getUTCDate() + 6);
  return d;
}

// Deterministic pseudo-random so every seed run produces the same data.
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const MANAGERS = [
  { name: "Sarah Fernando", email: "manager@example.com" },
  { name: "Nimali Perera", email: "nimali@example.com" },
];

const TEAM_MEMBERS = [
  { name: "Alex Silva", email: "alex@example.com" },
  { name: "Dinusha Jayawardena", email: "dinusha@example.com" },
  { name: "Kavindu Rathnayake", email: "kavindu@example.com" },
  { name: "Priya Menon", email: "priya@example.com" },
  { name: "Tharindu Bandara", email: "tharindu@example.com" },
];

const PROJECTS = [
  { name: "Client A Portal", description: "Customer-facing dashboard for Client A", isActive: true },
  { name: "Internal Tooling", description: "Admin tools and internal automation", isActive: true },
  { name: "R&D - Mobile App", description: "Experimental React Native client", isActive: true },
  { name: "Marketing Site", description: "Public website and landing pages", isActive: true },
  { name: "Legacy Migration", description: "Retired - kept for historical reports", isActive: false },
];

// null means the member never started a report that week.
const WEEK_PLAN: Record<string, (ReportStatus | null)[]> = {
  "alex@example.com": ["SUBMITTED", "APPROVED", "APPROVED", "APPROVED", "APPROVED", "APPROVED"],
  "dinusha@example.com": ["NEEDS_CORRECTION", "APPROVED", "APPROVED", "APPROVED", "APPROVED", "APPROVED"],
  "kavindu@example.com": ["DRAFT", "APPROVED", "NEEDS_CORRECTION", "APPROVED", "APPROVED", "APPROVED"],
  "priya@example.com": [null, "SUBMITTED", "APPROVED", "APPROVED", "APPROVED", "APPROVED"],
  "tharindu@example.com": ["SUBMITTED", "APPROVED", "APPROVED", null, "APPROVED", "APPROVED"],
};

const TASK_POOL: Record<string, string[]> = {
  "Client A Portal": [
    "Build invoice export screen",
    "Fix checkout validation errors",
    "Add pagination to orders table",
    "Refactor customer search query",
  ],
  "Internal Tooling": [
    "Automate weekly usage report",
    "Add role management to admin panel",
    "Migrate cron jobs to new scheduler",
    "Write runbook for on-call rotation",
  ],
  "R&D - Mobile App": [
    "Prototype offline sync",
    "Benchmark list rendering performance",
    "Spike on push notification provider",
    "Build shared component library",
  ],
  "Marketing Site": [
    "Rebuild pricing page",
    "Improve Lighthouse score",
    "Add blog CMS integration",
    "Localise landing page copy",
  ],
};

const BLOCKERS = [
  "Waiting on design assets from the design team",
  "Staging environment was down for two days",
  "Blocked on API access from the client",
  "Unclear acceptance criteria on two tickets",
  "Dependency upgrade broke the test suite",
];

const ACHIEVEMENTS = [
  "Cut page load time by 40%",
  "Closed the last three P1 bugs from the backlog",
  "Shipped the feature two days ahead of schedule",
  "Onboarded a new teammate to the codebase",
  "Reduced flaky tests from 12 to 2",
];

const REVIEW_COMMENTS = [
  "Please add the actual hours for the testing work.",
  "The blockers section is empty - add what slowed you down.",
  "Split the last task into two, it covers two deliverables.",
  "Percentages do not add up. Please double-check the numbers.",
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const TASK_STATUSES = ["COMPLETED", "IN_PROGRESS", "BLOCKED"] as const;
const TASK_TYPES = ["DEVELOPMENT", "TESTING", "MEETINGS", "DOCUMENTATION"] as const;

async function wipe() {
  // Order matters: rows that point at others must go first.
  await prisma.reportVersion.deleteMany();
  await prisma.taskItem.deleteMany();
  await prisma.plannedTask.deleteMany();
  await prisma.blocker.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.hoursByType.deleteMany();
  await prisma.report.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("Clearing existing data...");
  await wipe();

  console.log("Creating users...");
  const passwordHash = await hashPassword("password123");

  const managers = [];
  for (const m of MANAGERS) {
    managers.push(
      await prisma.user.create({
        data: { name: m.name, email: m.email, passwordHash, role: "MANAGER" },
      })
    );
  }

  const members = [];
  for (const t of TEAM_MEMBERS) {
    members.push(
      await prisma.user.create({
        data: { name: t.name, email: t.email, passwordHash, role: "TEAM_MEMBER" },
      })
    );
  }

  console.log("Creating projects...");
  const projects = [];
  for (const p of PROJECTS) {
    projects.push(await prisma.project.create({ data: p }));
  }

  const activeProjects = projects.filter((p) => p.isActive);

  console.log("Assigning members to projects...");
  for (let i = 0; i < members.length; i++) {
    for (let j = 0; j < 2; j++) {
      const project = activeProjects[(i + j) % activeProjects.length];
      await prisma.projectMember.create({
        data: { userId: members[i].id, projectId: project.id },
      });
    }
  }

  console.log("Creating reports...");
  const versionRows: Prisma.ReportVersionCreateManyInput[] = [];
  let reportCount = 0;

  for (let m = 0; m < members.length; m++) {
    const member = members[m];
    const plan = WEEK_PLAN[member.email];

    for (let w = 0; w < plan.length; w++) {
      const status = plan[w];
      if (status === null) continue;

      const rand = makeRng((m + 1) * 1000 + w * 37);
      const project = activeProjects[(m + w) % activeProjects.length];
      const pool = TASK_POOL[project.name];

      const taskCount = 2 + Math.floor(rand() * 3);
      const taskItems = [];
      for (let t = 0; t < taskCount; t++) {
        const planned = 100;
        const actual = 60 + Math.floor(rand() * 41);
        const timePlanned = 4 + Math.floor(rand() * 9);
        taskItems.push({
          taskName: pool[t % pool.length],
          priority: PRIORITIES[Math.floor(rand() * PRIORITIES.length)],
          plannedPercent: planned,
          actualPercent: actual,
          status:
            actual === 100
              ? ("COMPLETED" as const)
              : TASK_STATUSES[Math.floor(rand() * TASK_STATUSES.length)],
          timePlannedHrs: timePlanned,
          timeSpentHrs: timePlanned + Math.floor(rand() * 5) - 1,
          output: `PR #${100 + m * 20 + w * 3 + t}`,
        });
      }

      const hoursByType = TASK_TYPES.map((taskType, i) => ({
        taskType,
        hours:
          i === 0
            ? 16 + Math.floor(rand() * 12)
            : 2 + Math.floor(rand() * 7),
      }));

      // How many review rounds this report went through.
      const versionCount =
        status === "DRAFT" ? 0 : status === "APPROVED" && w % 3 === 0 ? 2 : 1;

      const report = await prisma.report.create({
        data: {
          userId: member.id,
          projectId: project.id,
          weekStart: weekStartFor(w),
          weekEnd: weekEndFor(w),
          status,
          currentVersionNumber: versionCount,
          notes: `Week ${w + 1} summary for ${project.name}`,
          taskItems: { create: taskItems },
          plannedTasks: {
            create: [
              { description: pool[(taskCount + 1) % pool.length] },
              { description: "Clear remaining review comments" },
            ],
          },
          blockers: {
            create: [
              {
                description: BLOCKERS[(m + w) % BLOCKERS.length],
                isKey: true,
              },
            ],
          },
          achievements: {
            create: [
              {
                description: ACHIEVEMENTS[(m + w) % ACHIEVEMENTS.length],
                isKey: true,
              },
            ],
          },
          hoursByType: { create: hoursByType },
        },
      });

      reportCount++;

      const snapshot = {
        projectId: project.id,
        projectName: project.name,
        notes: `Week ${w + 1} summary for ${project.name}`,
        taskItems,
        hoursByType,
      } as unknown as Prisma.InputJsonValue;

      const submittedAt = weekEndFor(w);
      const reviewer = managers[m % managers.length];

      for (let v = 1; v <= versionCount; v++) {
        const isLast = v === versionCount;
        versionRows.push({
          reportId: report.id,
          versionNumber: v,
          contentSnapshot: snapshot,
          submittedAt,
          // Only the final version carries the outcome that matches the
          // report's current status; earlier versions were sent back.
          reviewAction: isLast
            ? status === "APPROVED"
              ? "APPROVED"
              : status === "NEEDS_CORRECTION"
                ? "REQUESTED_CHANGES"
                : null
            : "REQUESTED_CHANGES",
          reviewComment:
            isLast && status === "APPROVED"
              ? null
              : isLast && status === "SUBMITTED"
                ? null
                : REVIEW_COMMENTS[(m + w + v) % REVIEW_COMMENTS.length],
          reviewedAt: isLast && status === "SUBMITTED" ? null : submittedAt,
          reviewerId: isLast && status === "SUBMITTED" ? null : reviewer.id,
        });
      }
    }
  }

  console.log("Creating report versions...");
  await prisma.reportVersion.createMany({ data: versionRows });

  console.log("");
  console.log("Seed complete:");
  console.log(`  ${managers.length} managers, ${members.length} team members`);
  console.log(`  ${projects.length} projects (${activeProjects.length} active)`);
  console.log(`  ${reportCount} reports, ${versionRows.length} report versions`);
  console.log("");
  console.log("Login with any of these (password: password123):");
  for (const u of [...managers, ...members]) {
    console.log(`  ${u.role.padEnd(12)} ${u.email}`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});