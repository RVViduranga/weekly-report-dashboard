import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";

export async function listProjects(includeInactive: boolean) {
  return prisma.project.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: "asc" },
  });
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

export async function deactivateProject(id: string) {
  await getProjectById(id);
  return prisma.project.update({
    where: { id },
    data: { isActive: false },
  });
}