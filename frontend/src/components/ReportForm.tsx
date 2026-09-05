"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import TaskItemsEditor from "@/components/TaskItemsEditor";
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

const inputClass =
  "rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-300";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 mb-3 text-sm text-neutral-500">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
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
            className={`${inputClass} min-w-0 flex-1`}
          />
          <label className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
            <input
              type="radio"
              name={radioName}
              checked={item.isKey}
              onChange={() => setKey(index)}
              disabled={item.description.trim() === ""}
            />
            {keyLabel}
          </label>
          <button
            type="button"
            onClick={() => remove(index)}
            className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...items, { description: "", isKey: false }])}
        className="mt-1 self-start rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Add another
      </button>
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
    <form onSubmit={(e) => handleSave(e, false)} className="flex flex-col gap-6">
      {managerComment && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
          <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase dark:text-amber-300">
            Changes requested
            {managerComment.reviewerName
              ? ` by ${managerComment.reviewerName}`
              : ""}
          </p>
          <p className="mt-1.5 text-sm text-amber-900 dark:text-amber-200">
            {managerComment.comment}
          </p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Project</span>
          <select
            value={values.projectId}
            onChange={(e) => set("projectId", e.target.value)}
            className={inputClass}
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {errors.projectId && (
            <span className="text-xs text-red-600 dark:text-red-400">
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
            className={`${inputClass} disabled:opacity-60`}
          />
          <span className="text-xs text-neutral-500">
            {values.weekStart
              ? formatWeekRange(values.weekStart, addDays(values.weekStart, 6))
              : "Pick any day in the week"}
            {mode === "edit" && " - the week cannot be changed"}
          </span>
          {errors.weekStart && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {errors.weekStart}
            </span>
          )}
        </label>
      </section>

      <Section
        title="Tasks completed"
        hint="One row per task you worked on this week."
      >
        <TaskItemsEditor
          tasks={values.taskItems}
          onChange={(tasks) => set("taskItems", tasks)}
        />
        {errors.taskItems && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {errors.taskItems}
          </p>
        )}
      </Section>

      <Section
        title="Planned for next week"
        hint="What you intend to pick up next."
      >
        <div className="flex flex-col gap-2">
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
                className={`${inputClass} min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={() => {
                  const next = values.plannedTasks.filter(
                    (_, i) => i !== index
                  );
                  set("plannedTasks", next.length > 0 ? next : [""]);
                }}
                className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("plannedTasks", [...values.plannedTasks, ""])}
            className="mt-1 self-start rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Add another
          </button>
        </div>
      </Section>

      <Section
        title="Blockers and challenges"
        hint="Flag the one that held you back the most."
      >
        <FlaggableList
          items={values.blockers}
          onChange={(items) => set("blockers", items)}
          radioName="keyBlocker"
          placeholder="What slowed you down?"
          keyLabel="Key issue"
        />
      </Section>

      <Section
        title="Achievements and highlights"
        hint="Flag the one you are most proud of."
      >
        <FlaggableList
          items={values.achievements}
          onChange={(items) => set("achievements", items)}
          radioName="keyAchievement"
          placeholder="What went well?"
          keyLabel="Key achievement"
        />
      </Section>

      <Section title="Hours by task type" hint="Optional, but useful for the team dashboard.">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TASK_TYPES.map((taskType) => (
            <label key={taskType} className="flex flex-col gap-1.5">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
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
                className={inputClass}
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title="Notes or links" hint="Anything else worth recording.">
        <textarea
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Links, context, anything the reviewer should know"
          className={`${inputClass} w-full`}
        />
      </Section>

      {formError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <button
          type="submit"
          disabled={busy !== null}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
        >
          {busy === "draft" ? "Saving..." : "Save draft"}
        </button>

        <button
          type="button"
          onClick={(e) => handleSave(e, true)}
          disabled={busy !== null}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {busy === "submit" ? "Submitting..." : "Submit for review"}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}