const SIZES = {
  sm: { box: "h-7 w-7 rounded-lg", glyph: 15 },
  lg: { box: "h-11 w-11 rounded-xl", glyph: 22 },
};

/** The one place the product's mark is drawn. */
export default function ProductMark({
  size = "sm",
  className = "",
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { box, glyph } = SIZES[size];

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-accent text-on-accent ${box} ${className}`}
    >
      <svg width={glyph} height={glyph} viewBox="0 0 20 20" fill="none">
        <path
          d="M4 14.5V9m4 5.5v-9m4 9V11m4 3.5V6.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
