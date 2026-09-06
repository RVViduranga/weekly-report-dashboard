/**
 * The reviewer's note, shown to the person who has to act on it - on the
 * report and again at the top of the edit form.
 */
export default function ReviewComment({
  comment,
  reviewerName,
}: {
  comment: string;
  reviewerName?: string | null;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-warn-ink/25 bg-warn-soft p-4">
      <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-warn-ink"
      >
        <path
          d="M10 6.5v4m0 2.6v.1M10 2.5 2.5 16.5h15z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div>
        <p className="text-xs font-semibold tracking-wide text-warn-ink uppercase">
          Changes requested{reviewerName ? ` by ${reviewerName}` : ""}
        </p>
        <p className="mt-1.5 text-sm text-warn-ink">{comment}</p>
      </div>
    </div>
  );
}
