import type { StockData } from '../types';
import TongChiRate from './TongChiRate';

interface StockCardProps {
  stock: StockData;
}

/**
 * Format a number with appropriate precision.
 */
function fmtNum(val: number | null, decimals = 2): string {
  if (val === null) return '--';
  return val.toFixed(decimals);
}

/**
 * Format large numbers (market cap, volume, amount) with unit suffix.
 */
function fmtLarge(val: number | null): string {
  if (val === null) return '--';
  if (val >= 1e12) return (val / 1e12).toFixed(2) + '万亿';
  if (val >= 1e8) return (val / 1e8).toFixed(2) + '亿';
  if (val >= 1e4) return (val / 1e4).toFixed(2) + '万';
  return val.toFixed(0);
}

/**
 * Format volume (hands) to 手/万手.
 */
function fmtVolume(val: number | null): string {
  if (val === null) return '--';
  if (val >= 10000) return (val / 10000).toFixed(2) + '万手';
  return val.toFixed(0) + '手';
}

/**
 * Individual stock card displaying key metrics and tongChiRate visualization.
 */
export default function StockCard({ stock }: StockCardProps) {
  const isUp = stock.changePct !== null && stock.changePct > 0;
  const isDown = stock.changePct !== null && stock.changePct < 0;
  const changeColor = isUp ? 'text-red-400' : isDown ? 'text-green-400' : 'text-dark-muted';
  const changeBg = isUp ? 'bg-red-500/10' : isDown ? 'bg-green-500/10' : 'bg-slate-700/30';

  const hasTCR = stock.tongChiRate1 !== null
    || stock.tongChiRate5 !== null
    || stock.tongChiRate10 !== null
    || stock.tongChiRate20 !== null;

  return (
    <div className="
      bg-dark-card border border-dark-border rounded-xl p-5
      hover:border-slate-500/50 hover:shadow-lg hover:shadow-indigo-500/5
      transition-all duration-300 animate-slide-up
    ">
      {/* Header: name + code + market badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm
            ${stock.market === 'sh' ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}
          `}>
            {stock.market === 'sh' ? '沪' : '深'}
          </div>
          <div>
            <h3 className="text-dark-text font-semibold text-sm leading-tight">{stock.name}</h3>
            <p className="text-dark-muted text-xs">{stock.code}</p>
          </div>
        </div>
        <span className={`
          px-2 py-0.5 rounded-md text-xs font-medium ${changeBg} ${changeColor}
        `}>
          {stock.changePct !== null ? `${stock.changePct >= 0 ? '+' : ''}${stock.changePct.toFixed(2)}%` : '--'}
        </span>
      </div>

      {/* Price + change amount */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-bold text-dark-text">
          {stock.latestPrice !== null ? stock.latestPrice.toFixed(2) : '--'}
        </span>
        <span className={`text-sm ${changeColor}`}>
          {stock.changeAmount !== null
            ? `${stock.changeAmount >= 0 ? '+' : ''}${stock.changeAmount.toFixed(2)}`
            : '--'}
        </span>
      </div>

      {/* TongChiRate visualization */}
      {hasTCR ? (
        <div className="space-y-1.5 mb-4">
          <TongChiRate label="1日" value={stock.tongChiRate1} />
          <TongChiRate label="5日" value={stock.tongChiRate5} />
          <TongChiRate label="10日" value={stock.tongChiRate10} />
          <TongChiRate label="20日" value={stock.tongChiRate20} />
        </div>
      ) : (
        <div className="mb-4 py-4 text-center text-dark-muted text-xs border border-dashed border-dark-border rounded-lg">
          暂无通吃率数据
        </div>
      )}

      {/* Bottom stats grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-3 border-t border-dark-border text-xs">
        <StatRow label="换手率" value={stock.turnoverRate !== null ? `${stock.turnoverRate.toFixed(2)}%` : '--'} />
        <StatRow label="量比" value={fmtNum(stock.volumeRatio)} />
        <StatRow label="成交量" value={fmtVolume(stock.volume)} />
        <StatRow label="成交额" value={fmtLarge(stock.amount)} />
        <StatRow label="振幅" value={stock.amplitude !== null ? `${stock.amplitude.toFixed(2)}%` : '--'} />
        <StatRow label="总市值" value={fmtLarge(stock.totalMarketCap)} />
        <StatRow label="DDX" value={fmtNum(stock.ddx, 3)} />
        <StatRow label="DDY" value={fmtNum(stock.ddy, 3)} />
        <StatRow label="DDZ" value={fmtNum(stock.ddz, 3)} />
        <StatRow label="流通市值" value={fmtLarge(stock.floatMarketCap)} />
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-dark-muted">{label}</span>
      <span className="text-dark-text font-medium">{value}</span>
    </div>
  );
}
