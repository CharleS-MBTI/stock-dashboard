/** Skeleton loading placeholder for stock cards */
export default function SkeletonCard() {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-700" />
          <div>
            <div className="h-5 w-16 bg-slate-700 rounded mb-1" />
            <div className="h-3 w-10 bg-slate-700 rounded" />
          </div>
        </div>
        <div className="h-6 w-16 bg-slate-700 rounded" />
      </div>

      {/* Price row */}
      <div className="flex items-baseline gap-3 mb-4">
        <div className="h-8 w-24 bg-slate-700 rounded" />
        <div className="h-5 w-20 bg-slate-700 rounded" />
      </div>

      {/* TongChiRate bars */}
      <div className="space-y-2 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-14 bg-slate-700 rounded" />
            <div className="flex-1 h-4 bg-slate-700 rounded-full" />
            <div className="h-3 w-10 bg-slate-700 rounded" />
          </div>
        ))}
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-dark-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 w-10 bg-slate-700 rounded" />
            <div className="h-3 w-14 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
