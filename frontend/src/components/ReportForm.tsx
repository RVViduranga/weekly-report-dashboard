"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import TaskItemsEditor from "@/components/TaskItemsEditor";
import ReviewComment from "@/components/ReviewComment";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  controlClass,
  invalidClass,
  Notice,
  textareaClass,
} from "@/components/ui/Field";
import {
  TASK_TYPES,
  TASK_TYPE_LABELS,
  addDays,
  mondayOf,
  toCreatePayload,
  toUpdatePayload,
  validate,
  type FlaggableDraft,
  type ReportFormValues,
} from "@/lib/reportForm";
import { formatWeekRange } from "@/lib/format";
import type { Project, Report } from "@/types";

interface Props {
  mode: "create" | "edit";
  initialValues: ReportFormValues;
  reportId?: string;
  managerComment?: { comment: string; reviewerName: string | null } | null;
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove this row"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger-ink"
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M4 4l8 8M12 4l-8 8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

function FlaggableList({
  items,
  onChange,
  radioName,
  placeholder,
  keyLabel,
}: {
  items: FlaggableDraft[];
  onChange: (items: FlaggableDraft[]) => void;
  radioName: string;
  placeholder: string;
  keyLabel: string;
}) {
  function update(index: number, patch: Partial<FlaggableDraft>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function setKey(index: number) {
    onChange(items.map((item, i) => ({ ...item, isKey: i === index })));
  }

  function remove(index: number) {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [{ description: "", isKey: false }]);
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex flex-wrap items-center gap-3">
          <input
            value={item.description}
            onChange={(e) => update(index, { description: e.target.value })}
            placeholder={placeholder}
            className={`${controlClass} min-w-0 flex-1`}
          />
          <label className="flex items-center gap-1.5 text-sm text-ink-2">
            <input
              type="radio"
              name={radioName}
              checked={item.isKey}
              onChange={() => setKey(index)}
              disabled={item.description.trim() === ""}
              className="accent-accent"
            />
            {keyLabel}
          </label>
          <RemoveButton onClick={() => remove(index)} />
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...items, { description: "", isKey: false }])}
        className="mt-1 self-start"
      >
        Add another
      </Button>
    </div>
  );
}

export default function ReportForm({
  mode,
  initialValues,
  reportId,
  managerComment,
}: Props) {
  const router = useRouter();

  const [values, setValues] = useState<ReportFormValues>(initialValues);
  const [projects, setProjects] = useState<Project[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "draft" | "submit">(null);

  useEffect(() => {
    api
      .get<{ projects: Project[] }>("/projects")
      .then((data) => setProjects(data.projects))
      .catch(() => setFormError("Could not load the project list"));
  }, []);

  function set<K extends keyof ReportFormValues>(
    field: K,
    value: ReportFormValues[K]
  ) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  /** Saves the report and returns its id. */
  async function persist(): Promise<string> {
    if (mode === "create") {
      const data = await api.post<{ report: Report }>(
        "/reports",
        toCreatePayload(values)
      );
      return data.report.id;
    }

    await api.patch(`/reports/${reportId}`, toUpdatePayload(values));
    return reportId as string;
  }

  async function handleSave(event: FormEvent, alsoSubmit: boolean) {
    event.preventDefault();
    setFormError(null);

    const found = validate(values);

    if (alsoSubmit && toUpdatePayload(values).taskItems.length === 0) {
      found.taskItems = "Add at least one completed task before submitting";
    }

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(alsoSubmit ? "submit" : "draft");

    try {
      const id = await persist();

      if (alsoSubmit) {
        await api.post(`/reports/${id}/submit`);
      }

      router.push(`/reports/${id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        setErrors(
          Object.fromEntries(err.fieldErrors.map((f) => [f.field, f.message]))
        );
      } else {
        setFormError("Could not reach the server");
      }
      setBusy(null);
    }
  }

  return (
    <form onSubmit={(e) => handleSave(e, false)} className="flex flex-col gap-4">
      {managerComment && (
        <ReviewComment
          comment={managerComment.comment}
          reviewerName={managerComment.reviewerName}
        />
      )}

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Project</span>
            <select
              value={values.projectId}
              onChange={(e) => set("projectId", e.target.value)}
              className={`${controlClass} ${errors.projectId ? invalidClass : ""}`}
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <span role="alert" className="text-xs text-danger-ink">
                {errors.projectId}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Week starting (Monday)</span>
            <input
              type="date"
              value={values.weekStart}
              disabled={mode === "edit"}
              onChange={(e) =>
                set("weekStart", e.target.value ? mondayOf(e.target.value) : "")
              }
              className={`${controlClass} disabled:opacity-60 ${
                errors.weekStart ? invalidClass : ""
              }`}
            />
            <span className="text-xs text-ink-3">
              {values.weekStart
                ? formatWeekRange(values.weekStart, addDays(values.weekStart, 6))
                : "Pick any day in the week"}
              {mode === "edit" && " - the week cannot be changed"}
            </span>
            {errors.weekStart && (
              <span role="alert" className="text-xs text-danger-ink">
                {errors.weekStart}
              </span>
            )}
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Tasks completed"
          description="One row per task you worked on this week."
        />
        <div className="px-5 pb-5">
          <TaskItemsEditor
            tasks={values.taskItems}
            onChange={(tasks) => set("taskItems", tasks)}
          />
          {errors.taskItems && (
            <p role="alert" className="mt-2 text-xs text-danger-ink">
              {errors.taskItems}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Planned for next week"
          description="What you intend to pick up next."
        />
        <div className="flex flex-col gap-2 px-5 pb-5">
          {values.plannedTasks.map((description, index) => (
            <div key={index} className="flex items-center gap-3">
              <input
                value={description}
                onChange={(e) =>
                  set(
                    "plannedTasks",
                    values.plannedTasks.map((item, i) =>
                      i === index ? e.target.value : item
                    )
                  )
                }
                placeholder="Next week's task"
                className={`${controlClass} min-w-0 flex-1`}
              />
              <RemoveButton
                onClick={() => {
                  const next = values.plannedTasks.filter((_, i) => i !== index);
                  set("plannedTasks", next.length > 0 ? next : [""]);
                }}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => set("plannedTasks", [...values.plannedTasks, ""])}
            className="mt-1 self-start"
          >
            Add another
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Blockers and challenges"
            description="Flag the one that held you back the most."
          />
          <div className="px-5 pb-5">
            <FlaggableList
              items={values.blockers}
              onChange={(items) => set("blockers", items)}
              radioName="keyBlocker"
              placeholder="What slowed you down?"
              keyLabel="Key issue"
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Achievements and highlights"
            description="Flag the one you are most proud of."
          />
          <div className="px-5 pb-5">
            <FlaggableList
              items={values.achievements}
              onChange={(items) => set("achievements", items)}
              radioName="keyAchievement"
              placeholder="What went well?"
              keyLabel="Key achievement"
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Hours by task type"
          description="Optional, but useful for the team dashboard."
        />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3 lg:grid-cols-5">
          {TASK_TYPES.map((taskType) => (
            <label key={taskType} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-3">
                {TASK_TYPE_LABELS[taskType]}
              </span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={values.hours[taskType]}
                onChange={(e) =>
                  set("hours", { ...values.hours, [taskType]: e.target.value })
                }
                className={`${controlClass} tabular-nums`}
              />
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Notes or links"
          description="Anything else worth recording."
        />
        <div className="px-5 pb-5">
          <textarea
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Links, context, anything the reviewer should know"
            className={textareaClass}
          />
        </div>
      </Card>

      {formError && <Notice>{formError}</Notice>}

      {/* The form is long, so its actions follow you down the page. */}
      <div className="sticky bottom-4 z-10 mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface/90 px-4 py-3 shadow-raised backdrop-blur-md">
        <Button type="submit" variant="secondary" busy={busy === "draft"}>
          {busy === "draft" ? "Saving" : "Save draft"}
        </Button>

        <Button
          type="button"
          onClick={(e) => handleSave(e, true)}
          busy={busy === "submit"}
          disabled={busy !== null}
        >
          {busy === "submit" ? "Submitting" : "Submit for review"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="ml-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
