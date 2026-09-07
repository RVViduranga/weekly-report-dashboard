import StatusBadge from "@/components/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import Card, { CardHeader } from "@/components/ui/Card";
import { formatWeekRange } from "@/lib/format";
import {
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "@/lib/reportForm";
import type { Report, TaskStatus } from "@/types";

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  COMPLETED: "bg-ok-soft text-ok-ink",
  IN_PROGRESS: "bg-info-soft text-info-ink",
  BLOCKED: "bg-warn-soft text-warn-ink",
  NOT_STARTED: "bg-idle-soft text-idle-ink",
};

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="px-5 pb-5 text-sm text-ink-3">{children}</p>;
}

function KeyChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-ink">
      {label}
    </span>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wider text-ink-3 uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}

/** Actual against planned, as a bar - easier to scan than two percentages. */
function ProgressCell({
  planned,
  actual,
}: {
  planned: number;
  actual: number;
}) {
  const width = Math.min(100, Math.max(0, actual));
  const met = actual >= planned;

  return (
    <div className="flex items-center justify-end gap-2.5">
      <span className="tabular-nums">
        {planned}% / {actual}%
      </span>
      <span
        aria-hidden="true"
        className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-line"
      >
        <span
          className={`block h-full rounded-full ${met ? "bg-ok-ink" : "bg-accent"}`}
          style={{ width: `${width}%` }}
        />
      </span>
    </div>
  );
}

export default function ReportDetail({ report }: { report: Report }) {
  const totalHours = report.hoursByType.reduce(
    (sum, entry) => sum + entry.hours,
    0
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wider text-ink-3 uppercase">
              Weekly report
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {formatWeekRange(report.weekStart, report.weekEnd)}
            </h1>
          </div>

          <StatusBadge status={report.status} />
        </div>

        <div className="mt-5 grid gap-4 border-t border-line-soft pt-4 sm:grid-cols-3">
          <Meta label="Employee">
            <span className="flex items-center gap-2">
              <Avatar name={report.user.name} size="sm" />
              {report.user.name}
            </span>
          </Meta>

          <Meta label="Project">{report.project.name}</Meta>

          <Meta label="Version">
            {report.currentVersionNumber > 0
              ? `Version ${report.currentVersionNumber}`
              : "Not submitted yet"}
          </Meta>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Tasks completed"
          description="What was picked up this week, and how far it got"
        />
        {report.taskItems.length === 0 ? (
          <EmptyNote>No tasks were recorded.</EmptyNote>
        ) : (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="border-b border-line bg-surface-muted text-left text-xs tracking-wide text-ink-3 uppercase">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Task</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Planned / actual
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Hrs planned / spent
                  </th>
                  <th className="px-5 py-2.5 font-medium">Deliverable</th>
                </tr>
              </thead>
              <tbody>
                {report.taskItems.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-line-soft last:border-0"
                  >
                    <td className="px-5 py-3 font-medium">{task.taskName}</td>
                    <td className="px-3 py-3 text-ink-2">
                      {PRIORITY_LABELS[task.priority]}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TASK_STATUS_STYLES[task.status]}`}
                      >
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ProgressCell
                        planned={task.plannedPercent}
                        actual={task.actualPercent}
                      />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {task.timePlannedHrs} / {task.timeSpentHrs}
                    </td>
                    <td className="px-5 py-3 text-ink-2">
                      {task.output ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Blockers and challenges"
            description="What slowed the week down"
          />
          {report.blockers.length === 0 ? (
            <EmptyNote>No blockers reported.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2.5 px-5 pb-5 text-sm">
              {report.blockers.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn-ink"
                  />
                  <span className="flex-1">{item.description}</span>
                  {item.isKey && <KeyChip label="Key issue" />}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Achievements and highlights"
            description="What went well"
          />
          {report.achievements.length === 0 ? (
            <EmptyNote>No achievements recorded.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2.5 px-5 pb-5 text-sm">
              {report.achievements.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-ok-ink"
                  />
                  <span className="flex-1">{item.description}</span>
                  {item.isKey && <KeyChip label="Key achievement" />}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Planned for next week"
            description="What they intend to pick up"
          />
          {report.plannedTasks.length === 0 ? (
            <EmptyNote>Nothing recorded for next week.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2.5 px-5 pb-5 text-sm">
              {report.plannedTasks.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-line"
                  />
                  {item.description}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Hours by task type"
            description={`${totalHours} hours in total`}
          />
          {report.hoursByType.length === 0 ? (
            <EmptyNote>No hours recorded.</EmptyNote>
          ) : (
            <div className="grid grid-cols-2 gap-2 px-5 pb-5 sm:grid-cols-4">
              {report.hoursByType.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg bg-surface-muted px-3 py-2.5"
                >
                  <p className="text-xs text-ink-3">
                    {TASK_TYPE_LABELS[entry.taskType]}
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {entry.hours}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {report.notes && (
        <Card>
          <CardHeader title="Notes" />
          <p className="px-5 pb-5 text-sm whitespace-pre-wrap text-ink-2">
            {report.notes}
          </p>
        </Card>
      )}
    </div>
  );
}
