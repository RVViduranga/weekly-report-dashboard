import { z } from "zod";

const taskItemSchema = z.object({
  taskName: z.string().min(1, "Task name is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  plannedPercent: z.number().int().min(0).max(100),
  actualPercent: z.number().int().min(0).max(100),
  status: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "BLOCKED"])
    .default("NOT_STARTED"),
  timePlannedHrs: z.number().min(0),
  timeSpentHrs: z.number().min(0),
  output: z.string().max(500).optional(),
});

const plannedTaskSchema = z.object({
  description: z.string().min(1, "Description is required"),
});

const flaggableSchema = z.object({
  description: z.string().min(1, "Description is required"),
  isKey: z.boolean().default(false),
});

const hoursSchema = z.object({
  taskType: z.enum([
    "DEVELOPMENT",
    "TESTING",
    "MEETINGS",
    "DOCUMENTATION",
    "OTHER",
  ]),
  hours: z.number().min(0),
});

const contentShape = {
  projectId: z.uuid("A valid project must be selected"),
  notes: z.string().max(2000).optional(),
  taskItems: z.array(taskItemSchema).default([]),
  plannedTasks: z.array(plannedTaskSchema).default([]),
  blockers: z.array(flaggableSchema).default([]),
  achievements: z.array(flaggableSchema).default([]),
  hoursByType: z.array(hoursSchema).default([]),
};

const onlyOneKeyBlocker = (data: { blockers: { isKey: boolean }[] }) =>
  data.blockers.filter((b) => b.isKey).length <= 1;

const onlyOneKeyAchievement = (data: { achievements: { isKey: boolean }[] }) =>
  data.achievements.filter((a) => a.isKey).length <= 1;

export const createReportSchema = z
  .object({
    ...contentShape,
    weekStart: z.coerce.date(),
    weekEnd: z.coerce.date(),
  })
  .refine((d) => d.weekEnd > d.weekStart, {
    message: "Week end must be after week start",
    path: ["weekEnd"],
  })
  .refine(onlyOneKeyBlocker, {
    message: "Only one blocker can be flagged as the key issue",
    path: ["blockers"],
  })
  .refine(onlyOneKeyAchievement, {
    message: "Only one achievement can be flagged as the key achievement",
    path: ["achievements"],
  });

export const updateReportSchema = z
  .object(contentShape)
  .refine(onlyOneKeyBlocker, {
    message: "Only one blocker can be flagged as the key issue",
    path: ["blockers"],
  })
  .refine(onlyOneKeyAchievement, {
    message: "Only one achievement can be flagged as the key achievement",
    path: ["achievements"],
  });

export const reviewReportSchema = z
  .object({
    action: z.enum(["APPROVED", "REQUESTED_CHANGES"]),
    comment: z.string().max(2000).optional(),
  })
  .refine(
    (d) =>
      d.action === "APPROVED" ||
      (d.comment !== undefined && d.comment.trim().length > 0),
    {
      message: "A comment is required when requesting changes",
      path: ["comment"],
    }
  );

export const listReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  status: z
    .enum(["DRAFT", "SUBMITTED", "NEEDS_CORRECTION", "APPROVED"])
    .optional(),
  weekStart: z.coerce.date().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});