/** Shared INR / number formatting helpers (en-IN locale everywhere). */

export function formatINR(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Compact Indian notation: ₹1.2Cr / ₹3.5L / ₹12.0K */
export function formatCompactINR(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(1)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

export function formatPercent(value: number, fractionDigits = 2): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
