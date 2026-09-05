"use client";

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
  "w-full rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-300";

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
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase dark:bg-neutral-900">
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
                className="border-t border-neutral-200 align-top dark:border-neutral-800"
              >
                <td className="px-3 py-2 min-w-[200px]">
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
                <td className="px-3 py-2 w-24">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={task.plannedPercent}
                    onChange={(e) =>
                      updateTask(index, { plannedPercent: e.target.value })
                    }
                    className={cellInput}
                  />
                </td>
                <td className="px-3 py-2 w-24">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={task.actualPercent}
                    onChange={(e) =>
                      updateTask(index, { actualPercent: e.target.value })
                    }
                    className={cellInput}
                  />
                </td>
                <td className="px-3 py-2 w-24">
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={task.timePlannedHrs}
                    onChange={(e) =>
                      updateTask(index, { timePlannedHrs: e.target.value })
                    }
                    className={cellInput}
                  />
                </td>
                <td className="px-3 py-2 w-24">
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={task.timeSpentHrs}
                    onChange={(e) =>
                      updateTask(index, { timeSpentHrs: e.target.value })
                    }
                    className={cellInput}
                  />
                </td>
                <td className="px-3 py-2 min-w-[160px]">
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
                    className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
                    aria-label={`Remove task ${index + 1}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => onChange([...tasks, emptyTask()])}
        className="mt-3 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Add task
      </button>
    </div>
  );
}