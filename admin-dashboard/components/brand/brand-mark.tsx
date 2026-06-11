import { twMerge } from "tailwind-merge";

/**
 * InvestIQ symbol — the IQ monogram with a growth arrow breaking out of the Q.
 * The "I" bar and "Q" ring render in `currentColor` (set via text color, so they
 * adapt to light/dark), while the growth arrow always uses the brand emerald
 * (`--primary`). See /brand/BRAND_GUIDELINES.md.
 */
export function BrandMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="InvestIQ"
      fill="none"
      className={twMerge("text-foreground", className)}
    >
      <rect x="18" y="26" width="13" height="48" rx="6.5" fill="currentColor" />
      <circle cx="63" cy="50" r="23" fill="none" stroke="currentColor" strokeWidth="13" />
      <polyline points="49,64 79,33" fill="none" stroke="hsl(var(--primary))" strokeWidth="12" strokeLinecap="round" />
      <polyline points="66,33 79,33 79,46" fill="none" stroke="hsl(var(--primary))" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Full InvestIQ logo lockup — symbol + wordmark, with "IQ" set in the brand
 * accent. Use across app chrome (sidebar, auth screens, headers).
 */
export function Logo({
  className,
  markSize = 22,
  showTagline = false,
}: {
  className?: string;
  markSize?: number;
  showTagline?: boolean;
}) {
  return (
    <div className={twMerge("flex items-center gap-2.5", className)}>
      <span className="relative flex items-center justify-center rounded-xl bg-secondary/60 p-1.5 flex-shrink-0">
        <BrandMark size={markSize} />
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background animate-live" />
      </span>
      <div className="leading-tight">
        <span className="block text-base font-bold text-foreground tracking-tight">
          Invest<span className="text-primary">IQ</span>
        </span>
        {showTagline && (
          <span className="block text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">
            Wealth Platform
          </span>
        )}
      </div>
    </div>
  );
}
