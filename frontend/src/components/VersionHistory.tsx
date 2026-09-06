"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import type { ReportVersion } from "@/types";

const REVIEW_STYLES = {
  APPROVED: "bg-ok-soft text-ok-ink",
  REQUESTED_CHANGES: "bg-warn-soft text-warn-ink",
};

const REVIEW_LABELS = {
  APPROVED: "Approved",
  REQUESTED_CHANGES: "Changes requested",
};

export default function VersionHistory({
  versions,
}: {
  versions: ReportVersion[];
}) {
  const [openVersion, setOpenVersion] = useState<string | null>(null);

  if (versions.length === 0) {
    return (
      <p className="text-sm text-ink-3">
        This report has not been submitted yet, so there are no past versions.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {versions.map((version) => {
        const open = openVersion === version.id;
        const snapshotTasks = version.contentSnapshot.taskItems ?? [];

        return (
          <li
            key={version.id}
            className="overflow-hidden rounded-lg border border-line"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <span className="rounded-md bg-surface-muted px-2 py-0.5 font-mono text-xs font-medium">
                v{version.versionNumber}
              </span>

              <span className="text-sm text-ink-2">
                submitted {formatDateTime(version.submittedAt)}
              </span>

              {version.reviewAction ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${REVIEW_STYLES[version.reviewAction]}`}
                >
                  {REVIEW_LABELS[version.reviewAction]}
                  {version.reviewer ? ` by ${version.reviewer.name}` : ""}
                </span>
              ) : (
                <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info-ink">
                  Awaiting review
                </span>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOpenVersion(open ? null : version.id)}
                aria-expanded={open}
                className="ml-auto"
              >
                {open ? "Hide content" : "View content"}
              </Button>
            </div>

            {version.reviewComment && (
              <p className="border-t border-line-soft bg-surface-muted px-4 py-3 text-sm text-ink-2">
                <span className="text-ink-3">Comment on this version: </span>
                {version.reviewComment}
              </p>
            )}

            {open && (
              <div className="border-t border-line-soft px-4 py-3">
                {snapshotTasks.length === 0 ? (
                  <p className="text-sm text-ink-3">
                    No tasks were recorded in this version.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs tracking-wide text-ink-3 uppercase">
                      <tr>
                        <th className="py-1.5 font-medium">Task</th>
                        <th className="py-1.5 text-right font-medium">
                          Planned / actual
                        </th>
                        <th className="py-1.5 text-right font-medium">
                          Hrs spent
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshotTasks.map((task, index) => (
                        <tr
                          key={index}
                          className="border-t border-line-soft"
                        >
                          <td className="py-2">{task.taskName}</td>
                          <td className="py-2 text-right tabular-nums">
                            {task.plannedPercent}% / {task.actualPercent}%
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {task.timeSpentHrs}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
