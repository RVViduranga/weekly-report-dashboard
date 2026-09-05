import type { Report, TaskPriority, TaskStatus, TaskType } from "@/types";

export const TASK_TYPES: TaskType[] = [
  "DEVELOPMENT",
  "TESTING",
  "MEETINGS",
  "DOCUMENTATION",
  "OTHER",
];

export const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export const TASK_STATUSES: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "BLOCKED",
];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  MEETINGS: "Meetings",
  DOCUMENTATION: "Documentation",
  OTHER: "Other",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

/**
 * Numeric fields are held as strings while editing so the input can be
 * cleared without becoming NaN. They are converted on submit.
 */
export interface TaskDraft {
  taskName: string;
  priority: TaskPriority;
  plannedPercent: string;
  actualPercent: string;
  status: TaskStatus;
  timePlannedHrs: string;
  timeSpentHrs: string;
  output: string;
}

export interface FlaggableDraft {
  description: string;
  isKey: boolean;
}

export interface ReportFormValues {
  projectId: string;
  weekStart: string;
  notes: string;
  taskItems: TaskDraft[];
  plannedTasks: string[];
  blockers: FlaggableDraft[];
  achievements: FlaggableDraft[];
  hours: Record<TaskType, string>;
}

export function emptyTask(): TaskDraft {
  return {
    taskName: "",
    priority: "MEDIUM",
    plannedPercent: "100",
    actualPercent: "0",
    status: "NOT_STARTED",
    timePlannedHrs: "0",
    timeSpentHrs: "0",
    output: "",
  };
}

export function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Snaps any date to the Monday of that week, so weeks line up across the team. */
export function mondayOf(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  const weekday = date.getUTCDay();
  const shift = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + shift);
  return date.toISOString().slice(0, 10);
}

export function emptyFormValues(): ReportFormValues {
  const today = new Date().toISOString().slice(0, 10);

  return {
    projectId: "",
    weekStart: mondayOf(today),
    notes: "",
    taskItems: [emptyTask()],
    plannedTasks: [""],
    blockers: [{ description: "", isKey: false }],
    achievements: [{ description: "", isKey: false }],
    hours: {
      DEVELOPMENT: "0",
      TESTING: "0",
      MEETINGS: "0",
      DOCUMENTATION: "0",
      OTHER: "0",
    },
  };
}

export function formValuesFromReport(report: Report): ReportFormValues {
  const hours = { ...emptyFormValues().hours };
  for (const entry of report.hoursByType) {
    hours[entry.taskType] = String(entry.hours);
  }

  return {
    projectId: report.projectId,
    weekStart: report.weekStart.slice(0, 10),
    notes: report.notes ?? "",
    taskItems:
      report.taskItems.length > 0
        ? report.taskItems.map((task) => ({
            taskName: task.taskName,
            priority: task.priority,
            plannedPercent: String(task.plannedPercent),
            actualPercent: String(task.actualPercent),
            status: task.status,
            timePlannedHrs: String(task.timePlannedHrs),
            timeSpentHrs: String(task.timeSpentHrs),
            output: task.output ?? "",
          }))
        : [emptyTask()],
    plannedTasks:
      report.plannedTasks.length > 0
        ? report.plannedTasks.map((item) => item.description)
        : [""],
    blockers:
      report.blockers.length > 0
        ? report.blockers.map((item) => ({
            description: item.description,
            isKey: item.isKey,
          }))
        : [{ description: "", isKey: false }],
    achievements:
      report.achievements.length > 0
        ? report.achievements.map((item) => ({
            description: item.description,
            isKey: item.isKey,
          }))
        : [{ description: "", isKey: false }],
    hours,
  };
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toUpdatePayload(values: ReportFormValues) {
  return {
    projectId: values.projectId,
    notes: values.notes.trim() === "" ? undefined : values.notes.trim(),
    taskItems: values.taskItems
      .filter((task) => task.taskName.trim() !== "")
      .map((task) => ({
        taskName: task.taskName.trim(),
        priority: task.priority,
        plannedPercent: toNumber(task.plannedPercent),
        actualPercent: toNumber(task.actualPercent),
        status: task.status,
        timePlannedHrs: toNumber(task.timePlannedHrs),
        timeSpentHrs: toNumber(task.timeSpentHrs),
        output: task.output.trim() === "" ? undefined : task.output.trim(),
      })),
    plannedTasks: values.plannedTasks
      .filter((description) => description.trim() !== "")
      .map((description) => ({ description: description.trim() })),
    blockers: values.blockers
      .filter((item) => item.description.trim() !== "")
      .map((item) => ({
        description: item.description.trim(),
        isKey: item.isKey,
      })),
    achievements: values.achievements
      .filter((item) => item.description.trim() !== "")
      .map((item) => ({
        description: item.description.trim(),
        isKey: item.isKey,
      })),
    hoursByType: TASK_TYPES.filter(
      (taskType) => toNumber(values.hours[taskType]) > 0
    ).map((taskType) => ({
      taskType,
      hours: toNumber(values.hours[taskType]),
    })),
  };
}

export function toCreatePayload(values: ReportFormValues) {
  return {
    ...toUpdatePayload(values),
    weekStart: values.weekStart,
    weekEnd: addDays(values.weekStart, 6),
  };
}

export function validate(values: ReportFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.projectId) errors.projectId = "Choose a project";
  if (!values.weekStart) errors.weekStart = "Choose the week";

  const namedTasks = values.taskItems.filter(
    (task) => task.taskName.trim() !== ""
  );

  for (const task of namedTasks) {
    const planned = toNumber(task.plannedPercent);
    const actual = toNumber(task.actualPercent);

    if (planned < 0 || planned > 100 || actual < 0 || actual > 100) {
      errors.taskItems = "Percentages must be between 0 and 100";
      break;
    }

    if (toNumber(task.timePlannedHrs) < 0 || toNumber(task.timeSpentHrs) < 0) {
      errors.taskItems = "Hours cannot be negative";
      break;
    }
  }

  return errors;
}