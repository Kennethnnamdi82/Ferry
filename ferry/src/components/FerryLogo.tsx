import { cn } from "@/lib/utils";

/**
 * Ferry — refined wordmark.
 * Pure typography, no icon. Tight tracking, lowercase, with a single
 * accent dot for personality. Inspired by Vercel/Linear marks.
 *
 * Pass `withWordmark={false}` to render only the dot glyph (useful for
 * favicons and very small surfaces).
 */
export function FerryLogo({
  className,
  size = 28,
  withWordmark = true,
}: {
  className?: string;
  size?: number;
  withWordmark?: boolean;
}) {
  // Wordmark size scales relative to the requested glyph size.
  const fontSize = Math.round(size * 0.78);
  return (
    <span className={cn("inline-flex items-baseline", className)} aria-label="Ferry">
      {withWordmark ? (
        <span
          className="font-display font-semibold leading-none text-foreground"
          style={{
            fontSize,
            letterSpacing: "-0.055em",
          }}
        >
          ferry
          <span
            className="ml-[1px] inline-block rounded-full align-baseline"
            style={{
              width: Math.max(4, Math.round(size * 0.14)),
              height: Math.max(4, Math.round(size * 0.14)),
              background: "hsl(var(--accent))",
              transform: `translateY(${Math.round(size * 0.04)}px)`,
            }}
          />
        </span>
      ) : (
        <span
          className="inline-flex items-center justify-center rounded-md bg-foreground font-display font-semibold leading-none text-background"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.55), letterSpacing: "-0.05em" }}
        >
          f
          <span
            className="ml-[1px] inline-block rounded-full"
            style={{
              width: Math.max(3, Math.round(size * 0.12)),
              height: Math.max(3, Math.round(size * 0.12)),
              background: "hsl(var(--accent))",
            }}
          />
        </span>
      )}
    </span>
  );
}
