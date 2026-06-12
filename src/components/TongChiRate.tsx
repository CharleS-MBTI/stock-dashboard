interface TongChiRateProps {
  /** Label for the rate period */
  label: string;
  /** Percentage value (can be negative/positive) */
  value: number | null;
  /** Max absolute value for bar scaling (default 10) */
  maxAbs?: number;
}

/**
 * Visualizes a single 通吃率 (TongChiRate) period as a horizontal bar.
 * Red for positive (net buying), Green for negative (net selling).
 */
export default function TongChiRate({ label, value, maxAbs = 10 }: TongChiRateProps) {
  const isPositive = value !== null && value >= 0;
  const isNegative = value !== null && value < 0;
  const absValue = value !== null ? Math.abs(value) : 0;

  // Clamp bar width to max
  const barWidth = Math.min((absValue / maxAbs) * 100, 100);

  const barColor = value === null
    ? 'bg-slate-600'
    : isPositive
      ? 'bg-gradient-to-r from-red-500 to-red-400'
      : 'bg-gradient-to-r from-green-500 to-green-400';

  const textColor = value === null
    ? 'text-dark-muted'
    : isPositive
      ? 'text-red-400'
      : 'text-green-400';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 text-dark-muted font-medium shrink-0">{label}</span>
      <div className="flex-1 h-4 bg-slate-700/50 rounded-full overflow-hidden relative">
        {/* Background zero line indicator */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-500/30" />
        {/* Bar */}
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor} ${
            isNegative ? 'ml-auto' : ''
          }`}
          style={{
            width: `${barWidth}%`,
            [isNegative ? 'marginRight' : 'marginLeft']: 0,
          }}
        />
      </div>
      <span className={`w-16 text-right font-mono font-semibold ${textColor}`}>
        {value !== null ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` : '--'}
      </span>
    </div>
  );
}
