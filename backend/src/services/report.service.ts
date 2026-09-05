import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { Prisma, Role } from "../generated/prisma/client";

const reportInclude = {
  user: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true } },
  taskItems: true,
  plannedTasks: true,
  blockers: true,
  achievements: true,
  hoursByType: true,
};

const reportListInclude = {
  user: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true } },
  hoursByType: { select: { taskType: true, hours: true } },
  _count: { select: { taskItems: true, blockers: true } },
};

type Requester = { userId: string; role: Role };

type ReportContent = {
  projectId: string;
  notes?: string;
  taskItems: unknown[];
  plannedTasks: unknown[];
  blockers: unknown[];
  achievements: unknown[];
  hoursByType: unknown[];
};

async function findOwnEditableReport(reportId: string, userId: string) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });

  if (!report || report.userId !== userId) {
    throw new AppError(404, "Report not found");
  }

  if (report.status !== "DRAFT" && report.status !== "NEEDS_CORRECTION") {
    throw new AppError(
      409,
      "This report can only be edited while it is a draft or needs correction",
    );
  }

  return report;
}

export async function createReport(
  userId: string,
  input: ReportContent & { weekStart: Date; weekEnd: Date },
) {
  const existing = await prisma.report.findUnique({
    where: { userId_weekStart: { userId, weekStart: input.weekStart } },
  });

  if (existing) {
    throw new AppError(409, "You already have a report for this week");
  }

  return prisma.report.create({
    data: {
      userId,
      projectId: input.projectId,
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      notes: input.notes,
      taskItems: { create: input.taskItems as never },
      plannedTasks: { create: input.plannedTasks as never },
      blockers: { create: input.blockers as never },
      achievements: { create: input.achievements as never },
      hoursByType: { create: input.hoursByType as never },
    },
    include: reportInclude,
  });
}

export async function getReport(reportId: string, requester: Requester) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: reportInclude,
  });

  if (!report) {
    throw new AppError(404, "Report not found");
  }

  if (requester.role !== "MANAGER" && report.userId !== requester.userId) {
    throw new AppError(404, "Report not found");
  }

  return report;
}

export async function updateReport(
  reportId: string,
  userId: string,
  input: ReportContent,
) {
  await findOwnEditableReport(reportId, userId);

  return prisma.report.update({
    where: { id: reportId },
    data: {
      projectId: input.projectId,
      notes: input.notes,
      taskItems: { deleteMany: {}, create: input.taskItems as never },
      plannedTasks: { deleteMany: {}, create: input.plannedTasks as never },
      blockers: { deleteMany: {}, create: input.blockers as never },
      achievements: { deleteMany: {}, create: input.achievements as never },
      hoursByType: { deleteMany: {}, create: input.hoursByType as never },
    },
    include: reportInclude,
  });
}

export async function submitReport(reportId: string, userId: string) {
  await findOwnEditableReport(reportId, userId);

  const report = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    include: reportInclude,
  });

  if (report.taskItems.length === 0) {
    throw new AppError(
      400,
      "Add at least one completed task before submitting",
    );
  }

  const nextVersion = report.currentVersionNumber + 1;

  return prisma.$transaction(
    async (tx) => {
      await tx.reportVersion.create({
        data: {
          reportId: report.id,
          versionNumber: nextVersion,
          contentSnapshot: {
            projectId: report.projectId,
            projectName: report.project.name,
            notes: report.notes,
            taskItems: report.taskItems,
            plannedTasks: report.plannedTasks,
            blockers: report.blockers,
            achievements: report.achievements,
            hoursByType: report.hoursByType,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return tx.report.update({
        where: { id: report.id },
        data: { status: "SUBMITTED", currentVersionNumber: nextVersion },
        include: reportInclude,
      });
    },
    { timeout: 20000 },
  );
}

export async function reviewReport(
  reportId: string,
  reviewerId: string,
  input: { action: "APPROVED" | "REQUESTED_CHANGES"; comment?: string },
) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });

  if (!report) {
    throw new AppError(404, "Report not found");
  }

  if (report.status !== "SUBMITTED") {
    throw new AppError(409, "Only submitted reports can be reviewed");
  }

  const newStatus =
    input.action === "APPROVED" ? "APPROVED" : "NEEDS_CORRECTION";

  return prisma.$transaction(
    async (tx) => {
      await tx.reportVersion.update({
        where: {
          reportId_versionNumber: {
            reportId: report.id,
            versionNumber: report.currentVersionNumber,
          },
        },
        data: {
          reviewAction: input.action,
          reviewComment: input.comment ?? null,
          reviewedAt: new Date(),
          reviewerId,
        },
      });

      return tx.report.update({
        where: { id: report.id },
        data: { status: newStatus },
        include: reportInclude,
      });
    },
    { timeout: 20000 },
  );
}

export async function listReports(
  query: {
    page: number;
    pageSize: number;
    userId?: string;
    projectId?: string;
    status?: "DRAFT" | "SUBMITTED" | "NEEDS_CORRECTION" | "APPROVED";
    weekStart?: Date;
    from?: Date;
    to?: Date;
  },
  forceUserId?: string,
) {
  const where: Prisma.ReportWhereInput = {};

  where.userId = forceUserId ?? query.userId;
  if (query.projectId) where.projectId = query.projectId;
  if (query.status) where.status = query.status;

  if (query.weekStart) {
    where.weekStart = query.weekStart;
  } else if (query.from || query.to) {
    where.weekStart = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }

  const [total, reports] = await prisma.$transaction([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      include: reportListInclude,
      orderBy: [{ weekStart: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    reports,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function getReportVersions(
  reportId: string,
  requester: Requester,
) {
  await getReport(reportId, requester);

  return prisma.reportVersion.findMany({
    where: { reportId },
    orderBy: { versionNumber: "desc" },
    include: {
      reviewer: { select: { id: true, name: true } },
    },
  });
}