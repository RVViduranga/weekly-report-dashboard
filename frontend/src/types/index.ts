export type Role = "TEAM_MEMBER" | "MANAGER";

export type ReportStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "NEEDS_CORRECTION"
  | "APPROVED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type TaskStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BLOCKED";

export type TaskType =
  | "DEVELOPMENT"
  | "TESTING"
  | "MEETINGS"
  | "DOCUMENTATION"
  | "OTHER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  taskName: string;
  priority: TaskPriority;
  plannedPercent: number;
  actualPercent: number;
  status: TaskStatus;
  timePlannedHrs: number;
  timeSpentHrs: number;
  output: string | null;
}

export interface PlannedTask {
  id: string;
  description: string;
}

export interface Flaggable {
  id: string;
  description: string;
  isKey: boolean;
}

export interface HoursByType {
  id: string;
  taskType: TaskType;
  hours: number;
}

export interface Report {
  id: string;
  userId: string;
  projectId: string;
  weekStart: string;
  weekEnd: string;
  status: ReportStatus;
  currentVersionNumber: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, "id" | "name" | "email">;
  project: Pick<Project, "id" | "name">;
  taskItems: TaskItem[];
  plannedTasks: PlannedTask[];
  blockers: Flaggable[];
  achievements: Flaggable[];
  hoursByType: HoursByType[];
}

export interface ReportVersion {
  id: string;
  versionNumber: number;
  submittedAt: string;
  contentSnapshot: {
    projectName?: string;
    notes?: string | null;
    taskItems?: TaskItem[];
    hoursByType?: HoursByType[];
  };
  reviewAction: "APPROVED" | "REQUESTED_CHANGES" | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  reviewer: { id: string; name: string } | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}