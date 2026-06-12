import { useStockData } from '../hooks/useStockData';
import StockCard from './StockCard';
import SkeletonCard from './SkeletonCard';
import SortBar from './SortBar';

/**
 * Format timestamp to readable time string.
 */
function fmtTime(ts: number | null): string {
  if (!ts) return '--';
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Main dashboard component: grid of stock cards with sort controls.
 */
export default function Dashboard() {
  const {
    stocks,
    loading,
    error,
    lastUpdated,
    isCached,
    warning,
    sortState,
    setSortState,
    refresh,
  } = useStockData();

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-bg/95 backdrop-blur-sm border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-dark-text flex items-center gap-2">
              <span className="text-2xl">📊</span>
              A股通吃率仪表盘
            </h1>
            <p className="text-dark-muted text-xs mt-0.5">主力资金实时监控 · 9只标的</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Status indicators */}
            <div className="hidden sm:flex items-center gap-3 text-xs">
              {warning && (
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {warning}
                </span>
              )}
              {isCached && !warning && (
                <span className="text-cyan-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  缓存数据
                </span>
              )}
              <span className="text-dark-muted">
                更新于 {fmtTime(lastUpdated)}
              </span>
            </div>

            <button
              onClick={refresh}
              disabled={loading}
              className="
                px-4 py-2 rounded-lg text-sm font-medium
                bg-indigo-500/20 text-indigo-300 border border-indigo-500/30
                hover:bg-indigo-500/30 active:scale-95
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2
              "
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path
                  strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              刷新
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Sort bar */}
        <SortBar
          sortState={sortState}
          onChange={setSortState}
          loading={loading}
          stockCount={stocks.length}
        />

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-medium">数据加载失败</p>
              <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
            </div>
            <button
              onClick={refresh}
              className="ml-auto px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-medium transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* Mobile status bar */}
        <div className="sm:hidden flex items-center gap-3 text-xs mb-4 text-dark-muted">
          {warning && <span className="text-amber-400">{warning}</span>}
          <span>更新于 {fmtTime(lastUpdated)}</span>
        </div>

        {/* Grid */}
        {loading && stocks.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.map((stock, index) => (
              <div
                key={stock.code}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-fade-in"
              >
                <StockCard stock={stock} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && stocks.length === 0 && !error && (
          <div className="text-center py-20">
            <span className="text-5xl">📭</span>
            <p className="text-dark-muted mt-4">暂无股票数据</p>
            <button
              onClick={refresh}
              className="mt-3 px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-300 text-sm hover:bg-indigo-500/30 transition-colors"
            >
              点击加载
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-dark-muted text-xs">
          <p>
            数据来源：查股网(ddx.gubit.cn) · 东方财富 · 新浪财经
            &nbsp;|&nbsp;
            自动刷新间隔：30秒
            &nbsp;|&nbsp;
            通吃率 = 主力资金净买入 / 成交额 × 100%
          </p>
        </div>
      </footer>
    </div>
  );
}
