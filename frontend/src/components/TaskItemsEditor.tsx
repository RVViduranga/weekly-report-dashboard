"use client";

import Button from "@/components/ui/Button";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  emptyTask,
  type TaskDraft,
} from "@/lib/reportForm";

interface Props {
  tasks: TaskDraft[];
  onChange: (tasks: TaskDraft[]) => void;
}

const cellInput =
  "h-8 w-full rounded-md border border-line bg-surface px-2 text-sm text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus:border-accent";

export default function TaskItemsEditor({ tasks, onChange }: Props) {
  function updateTask(index: number, patch: Partial<TaskDraft>) {
    onChange(tasks.map((task, i) => (i === index ? { ...task, ...patch } : task)));
  }

  function removeTask(index: number) {
    const next = tasks.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptyTask()]);
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[940px] text-sm">
          <thead className="border-b border-line bg-surface-muted text-left text-xs tracking-wide text-ink-3 uppercase">
            <tr>
              <th className="px-3 py-2.5 font-medium">Task</th>
              <th className="px-3 py-2.5 font-medium">Priority</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Planned %</th>
              <th className="px-3 py-2.5 font-medium">Actual %</th>
              <th className="px-3 py-2.5 font-medium">Hrs planned</th>
              <th className="px-3 py-2.5 font-medium">Hrs spent</th>
              <th className="px-3 py-2.5 font-medium">Output</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr
                key={index}
                className="border-b border-line-soft align-top last:border-0"
              >
                <td className="min-w-[210px] px-3 py-2">
                  <input
                    value={task.taskName}
                    onChange={(e) =>
                      updateTask(index, { taskName: e.target.value })
                    }
                    placeholder="What did you work on?"
                    className={cellInput}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={task.priority}
                    onChange={(e) =>
                      updateTask(index, {
                        priority: e.target.value as TaskDraft["priority"],
                      })
                    }
                    className={cellInput}
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {PRIORITY_LABELS[priority]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateTask(index, {
                        status: e.target.value as TaskDraft["status"],
                      })
                    }
                    className={cellInput}
                  >
                    {TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {TASK_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="w-24 px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={task.plannedPercent}
                    onChange={(e) =>
                      updateTask(index, { plannedPercent: e.target.value })
                    }
                    className={`${cellInput} tabular-nums`}
                  />
                </td>
                <td className="w-24 px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={task.actualPercent}
                    onChange={(e) =>
                      updateTask(index, { actualPercent: e.target.value })
                    }
                    className={`${cellInput} tabular-nums`}
                  />
                </td>
                <td className="w-24 px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={task.timePlannedHrs}
                    onChange={(e) =>
                      updateTask(index, { timePlannedHrs: e.target.value })
                    }
                    className={`${cellInput} tabular-nums`}
                  />
                </td>
                <td className="w-24 px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={task.timeSpentHrs}
                    onChange={(e) =>
                      updateTask(index, { timeSpentHrs: e.target.value })
                    }
                    className={`${cellInput} tabular-nums`}
                  />
                </td>
                <td className="min-w-[170px] px-3 py-2">
                  <input
                    value={task.output}
                    onChange={(e) =>
                      updateTask(index, { output: e.target.value })
                    }
                    placeholder="PR link, doc, demo..."
                    className={cellInput}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeTask(index)}
                    aria-label={`Remove task ${index + 1}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger-ink"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 4l8 8M12 4l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange([...tasks, emptyTask()])}
        className="mt-3"
      >
        Add task
      </Button>
    </div>
  );
}
