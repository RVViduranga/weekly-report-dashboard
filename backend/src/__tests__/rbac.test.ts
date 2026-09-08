import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

const app = createApp();
const PASSWORD = "password123";

async function login(email: string): Promise<string> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: PASSWORD });

  if (res.status !== 200) {
    throw new Error(`Could not log in as ${email}. Run "npm run seed" first.`);
  }

  const setCookie = res.headers["set-cookie"] as unknown as string[];
  return setCookie[0].split(";")[0];
}

let managerCookie: string;
let memberCookie: string;
let memberReportId: string;
let otherMemberReportId: string;
let projectId: string;

beforeAll(async () => {
  managerCookie = await login("manager@example.com");
  memberCookie = await login("alex@example.com");

  const alex = await prisma.user.findUniqueOrThrow({
    where: { email: "alex@example.com" },
  });
  const dinusha = await prisma.user.findUniqueOrThrow({
    where: { email: "dinusha@example.com" },
  });

  memberReportId = (
    await prisma.report.findFirstOrThrow({ where: { userId: alex.id } })
  ).id;
  otherMemberReportId = (
    await prisma.report.findFirstOrThrow({ where: { userId: dinusha.id } })
  ).id;
  projectId = (
    await prisma.project.findFirstOrThrow({ where: { isActive: true } })
  ).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Unauthenticated requests are rejected", () => {
  it("blocks GET /api/reports/mine", async () => {
    const res = await request(app).get("/api/reports/mine");
    expect(res.status).toBe(401);
  });

  it("blocks POST /api/assistant", async () => {
    const res = await request(app)
      .post("/api/assistant")
      .send({ question: "Who is blocked this week?" });
    expect(res.status).toBe(401);
  });

  it("blocks GET /api/projects", async () => {
    const res = await request(app).get("/api/projects");
    expect(res.status).toBe(401);
  });

  it("blocks POST /api/projects", async () => {
    const res = await request(app)
      .post("/api/projects")
      .send({ name: "Should not exist" });
    expect(res.status).toBe(401);
  });
});

describe("Team members cannot use manager-only endpoints", () => {
  it("blocks listing every report (403, not 401)", async () => {
    const res = await request(app).get("/api/reports").set("Cookie", memberCookie);
    expect(res.status).toBe(403);
  });

  it("blocks creating a project", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Cookie", memberCookie)
      .send({ name: "Sneaky Project" });
    expect(res.status).toBe(403);
  });

  it("blocks editing a project", async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}`)
      .set("Cookie", memberCookie)
      .send({ name: "Renamed by a team member" });
    expect(res.status).toBe(403);
  });

  it("blocks deleting a project", async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set("Cookie", memberCookie);
    expect(res.status).toBe(403);
  });

  it("blocks reviewing a report", async () => {
    const res = await request(app)
      .post(`/api/reports/${memberReportId}/review`)
      .set("Cookie", memberCookie)
      .send({ action: "APPROVED" });
    expect(res.status).toBe(403);
  });

  // The assistant answers across the whole team, so it is refused here for the
  // same reason the dashboard is. The request never reaches the model.
  it("blocks POST /api/assistant", async () => {
    const res = await request(app)
      .post("/api/assistant")
      .set("Cookie", memberCookie)
      .send({ question: "Who is blocked this week?" });
    expect(res.status).toBe(403);
  });
});

describe("Team members only reach their own reports", () => {
  it("can open its own report", async () => {
    const res = await request(app)
      .get(`/api/reports/${memberReportId}`)
      .set("Cookie", memberCookie);
    expect(res.status).toBe(200);
  });

  it("gets 404 (not 403) for another member's report", async () => {
    const res = await request(app)
      .get(`/api/reports/${otherMemberReportId}`)
      .set("Cookie", memberCookie);
    expect(res.status).toBe(404);
  });

  it("cannot edit another member's report", async () => {
    const res = await request(app)
      .patch(`/api/reports/${otherMemberReportId}`)
      .set("Cookie", memberCookie)
      .send({
        projectId,
        taskItems: [],
        plannedTasks: [],
        blockers: [],
        achievements: [],
        hoursByType: [],
      });
    expect(res.status).toBe(404);
  });
});

describe("Managers have the access team members do not", () => {
  it("can list every report, with pagination", async () => {
    const res = await request(app)
      .get("/api/reports?page=1&pageSize=5")
      .set("Cookie", managerCookie);
    expect(res.status).toBe(200);
    expect(res.body.pagination.totalPages).toBeGreaterThan(0);
  });

  it("can open any team member's report", async () => {
    const res = await request(app)
      .get(`/api/reports/${otherMemberReportId}`)
      .set("Cookie", managerCookie);
    expect(res.status).toBe(200);
  });

  it("can create a project", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Cookie", managerCookie)
      .send({ name: "RBAC test project" });
    expect(res.status).toBe(201);

    await prisma.project.delete({ where: { id: res.body.project.id } });
  });

  it("still cannot rewrite a team member's report content", async () => {
    const res = await request(app)
      .patch(`/api/reports/${memberReportId}`)
      .set("Cookie", managerCookie)
      .send({
        projectId,
        taskItems: [],
        plannedTasks: [],
        blockers: [],
        achievements: [],
        hoursByType: [],
      });
    expect(res.status).toBe(404);
  });
});