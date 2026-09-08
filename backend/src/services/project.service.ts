import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";

export async function listProjects(includeInactive: boolean) {
  const projects = await prisma.project.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { reports: true } } },
  });

  // The count travels with the row so the interface can say what removing this
  // project will actually do before the manager commits to it.
  return projects.map(({ _count, ...project }) => ({
    ...project,
    reportCount: _count.reports,
  }));
}

export async function getProjectById(id: string) {
  const project = await prisma.project.findUnique({ where: { id } });

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  return project;
}

export async function createProject(input: {
  name: string;
  description?: string;
}) {
  return prisma.project.create({ data: input });
}

export async function updateProject(
  id: string,
  input: { name?: string; description?: string; isActive?: boolean }
) {
  await getProjectById(id);
  return prisma.project.update({ where: { id }, data: input });
}

/**
 * Deletes the project when nothing points at it, and archives it when
 * something does.
 *
 * `Report.projectId` is not nullable and that relation carries no cascade, so a
 * project with reports cannot be removed without taking months of history with
 * it - Postgres refuses the delete outright. Archiving keeps the row: it stops
 * appearing in new reports, and every old report that references it still
 * reads correctly.
 */
export async function removeProject(id: string) {
  await getProjectById(id);

  const reportCount = await prisma.report.count({ where: { projectId: id } });

  if (reportCount > 0) {
    const project = await prisma.project.update({
      where: { id },
      data: { isActive: false },
    });

    return { deleted: false, reportCount, project };
  }

  // Memberships have no cascade either, so they go first - and in one
  // transaction, so a project is never left without them.
  await prisma.$transaction([
    prisma.projectMember.deleteMany({ where: { projectId: id } }),
    prisma.project.delete({ where: { id } }),
  ]);

  return { deleted: true, reportCount: 0 };
}