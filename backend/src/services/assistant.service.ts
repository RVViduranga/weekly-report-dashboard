import { prisma } from "../lib/prisma";
import { chat, ChatMessage } from "../lib/openrouter";

/** How many earlier turns are replayed so follow-up questions make sense. */
const HISTORY_LIMIT = 6;

const SYSTEM_PROMPT = [
  "You are an assistant inside a weekly reporting tool, answering a manager's",
  "questions about their own team. Answer only from the report data you are",
  "given - it is the complete dataset for that week, so anything absent from it",
  "genuinely did not happen. If the data does not answer the question, say so",
  "plainly instead of guessing. Never invent a person, project, task or number.",
  "Keep answers short and factual, and use a short list when naming several people.",
].join(" ");

/** The Monday of the week that `date` falls in, at UTC midnight. */
function mondayOf(date: Date): Date {
  const result = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const weekday = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() + (weekday === 0 ? -6 : 1 - weekday));
  return result;
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Turns one week of reports into plain text for the model.
 *
 * The `select` blocks below are the privacy boundary. Names are needed for the
 * answers to mean anything, but email addresses, database ids and password
 * hashes are never selected - so they cannot reach a third-party API even by
 * mistake. The query enforces that, not the wording of the prompt.
 */
async function buildWeekContext(weekStart: Date): Promise<string> {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

  const [teamMembers, reports] = await Promise.all([
    prisma.user.findMany({
      where: { role: "TEAM_MEMBER" },
      select: { name: true },
      orderBy: { name: "asc" },
    }),

    prisma.report.findMany({
      where: { weekStart },
      select: {
        status: true,
        notes: true,
        user: { select: { name: true } },
        project: { select: { name: true } },
        taskItems: {
          select: {
            taskName: true,
            status: true,
            priority: true,
            actualPercent: true,
            timeSpentHrs: true,
          },
        },
        plannedTasks: { select: { description: true } },
        blockers: { select: { description: true, isKey: true } },
        achievements: { select: { description: true, isKey: true } },
        hoursByType: { select: { taskType: true, hours: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const lines: string[] = [
    `Week ${formatDay(weekStart)} to ${formatDay(weekEnd)}.`,
    `The team has ${teamMembers.length} members.`,
    "",
  ];

  for (const report of reports) {
    lines.push(
      `${report.user.name} - project ${report.project.name} - status ${report.status}`
    );

    for (const task of report.taskItems) {
      lines.push(
        `  task: ${task.taskName} [${task.priority} priority, ${task.status}, ` +
          `${task.actualPercent}% done, ${task.timeSpentHrs}h spent]`
      );
    }

    for (const planned of report.plannedTasks) {
      lines.push(`  planned next week: ${planned.description}`);
    }

    for (const blocker of report.blockers) {
      lines.push(`  blocker${blocker.isKey ? " (key)" : ""}: ${blocker.description}`);
    }

    for (const achievement of report.achievements) {
      lines.push(
        `  achievement${achievement.isKey ? " (key)" : ""}: ${achievement.description}`
      );
    }

    if (report.hoursByType.length > 0) {
      const hours = report.hoursByType
        .map((entry) => `${entry.taskType} ${entry.hours}h`)
        .join(", ");
      lines.push(`  hours: ${hours}`);
    }

    if (report.notes) {
      lines.push(`  notes: ${report.notes}`);
    }

    lines.push("");
  }

  // "Nobody filed" is the absence of a row, so it has to be worked out from the
  // member list rather than read off the reports.
  const filed = new Set(reports.map((report) => report.user.name));
  const missing = teamMembers
    .filter((member) => !filed.has(member.name))
    .map((member) => member.name);

  lines.push(
    missing.length > 0
      ? `Has not filed a report this week: ${missing.join(", ")}.`
      : "Everyone on the team has filed a report this week."
  );

  return lines.join("\n");
}

export async function askAssistant(
  question: string,
  history: { role: "user" | "assistant"; content: string }[],
  weekStartInput?: Date
): Promise<{ answer: string }> {
  const weekStart = weekStartInput
    ? mondayOf(weekStartInput)
    : mondayOf(new Date());

  const context = await buildWeekContext(weekStart);

  // Two system messages: the rules, which never change, and the data, which
  // changes every week. Keeping them apart makes both easier to read in a log.
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `Report data for the week under discussion:\n\n${context}`,
    },
    ...history.slice(-HISTORY_LIMIT),
    { role: "user", content: question },
  ];

  return { answer: await chat(messages) };
}
