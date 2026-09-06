"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import type { ReportVersion } from "@/types";

const REVIEW_STYLES = {
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  REQUESTED_CHANGES:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
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
      <p className="text-sm text-neutral-500">
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
            className="rounded-lg border border-neutral-200 dark:border-neutral-800"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <span className="text-sm font-medium">
                Version {version.versionNumber}
              </span>

              <span className="text-sm text-neutral-500">
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
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Awaiting review
                </span>
              )}

              <button
                type="button"
                onClick={() => setOpenVersion(open ? null : version.id)}
                className="ml-auto rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {open ? "Hide content" : "View content"}
              </button>
            </div>

            {version.reviewComment && (
              <p className="border-t border-neutral-200 px-4 py-3 text-sm text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
                <span className="text-neutral-500">Comment on this version: </span>
                {version.reviewComment}
              </p>
            )}

            {open && (
              <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
                {snapshotTasks.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    No tasks were recorded in this version.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs tracking-wide text-neutral-500 uppercase">
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
                          className="border-t border-neutral-200 dark:border-neutral-800"
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