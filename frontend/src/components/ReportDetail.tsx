import StatusBadge from "@/components/StatusBadge";
import { formatWeekRange } from "@/lib/format";
import {
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "@/lib/reportForm";
import type { Report } from "@/types";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-neutral-200 pt-5 dark:border-neutral-800">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-500 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function KeyChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-neutral-100 dark:text-neutral-900">
      {label}
    </span>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-neutral-500">{children}</p>;
}

export default function ReportDetail({ report }: { report: Report }) {
  const totalHours = report.hoursByType.reduce(
    (sum, entry) => sum + entry.hours,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {formatWeekRange(report.weekStart, report.weekEnd)}
            </h1>
            <StatusBadge status={report.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {report.user.name} &middot; {report.project.name}
            {report.currentVersionNumber > 0 &&
              ` · version ${report.currentVersionNumber}`}
          </p>
        </div>
      </header>

      <Section title="Tasks completed">
        {report.taskItems.length === 0 ? (
          <EmptyNote>No tasks were recorded.</EmptyNote>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase dark:bg-neutral-900">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Task</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Planned / actual
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Hrs planned / spent
                  </th>
                  <th className="px-3 py-2.5 font-medium">Output</th>
                </tr>
              </thead>
              <tbody>
                {report.taskItems.map((task) => (
                  <tr
                    key={task.id}
                    className="border-t border-neutral-200 dark:border-neutral-800"
                  >
                    <td className="px-3 py-2.5">{task.taskName}</td>
                    <td className="px-3 py-2.5 text-neutral-600 dark:text-neutral-400">
                      {PRIORITY_LABELS[task.priority]}
                    </td>
                    <td className="px-3 py-2.5 text-neutral-600 dark:text-neutral-400">
                      {TASK_STATUS_LABELS[task.status]}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {task.plannedPercent}% / {task.actualPercent}%
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {task.timePlannedHrs} / {task.timeSpentHrs}
                    </td>
                    <td className="px-3 py-2.5 text-neutral-600 dark:text-neutral-400">
                      {task.output ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Planned for next week">
        {report.plannedTasks.length === 0 ? (
          <EmptyNote>Nothing recorded for next week.</EmptyNote>
        ) : (
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
            {report.plannedTasks.map((item) => (
              <li key={item.id}>{item.description}</li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Blockers and challenges">
          {report.blockers.length === 0 ? (
            <EmptyNote>No blockers reported.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {report.blockers.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2">
                  <span>{item.description}</span>
                  {item.isKey && <KeyChip label="Key issue" />}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Achievements and highlights">
          {report.achievements.length === 0 ? (
            <EmptyNote>No achievements recorded.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {report.achievements.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2">
                  <span>{item.description}</span>
                  {item.isKey && <KeyChip label="Key achievement" />}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title={`Hours by task type (${totalHours} total)`}>
        {report.hoursByType.length === 0 ? (
          <EmptyNote>No hours recorded.</EmptyNote>
        ) : (
          <div className="flex flex-wrap gap-3">
            {report.hoursByType.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-neutral-200 px-4 py-2.5 dark:border-neutral-800"
              >
                <p className="text-xs text-neutral-500">
                  {TASK_TYPE_LABELS[entry.taskType]}
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {entry.hours}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {report.notes && (
        <Section title="Notes">
          <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
        </Section>
      )}
    </div>
  );
}