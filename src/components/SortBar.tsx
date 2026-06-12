import type { SortField, SortState, SortDirection } from '../types';

interface SortBarProps {
  sortState: SortState;
  onChange: (state: SortState) => void;
  loading: boolean;
  stockCount: number;
}

interface SortOption {
  field: SortField;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'tongChiRate1', label: '1日通吃率' },
  { field: 'tongChiRate5', label: '5日通吃率' },
  { field: 'tongChiRate10', label: '10日通吃率' },
  { field: 'tongChiRate20', label: '20日通吃率' },
  { field: 'changePct', label: '涨跌幅' },
  { field: 'turnoverRate', label: '换手率' },
  { field: 'ddx', label: 'DDX' },
  { field: 'latestPrice', label: '最新价' },
  { field: 'code', label: '代码' },
  { field: 'name', label: '名称' },
];

/**
 * Sort toolbar with sort field selection and direction toggle.
 */
export default function SortBar({ sortState, onChange, loading, stockCount }: SortBarProps) {
  const handleFieldClick = (field: SortField) => {
    if (field === sortState.field) {
      // Toggle direction
      const newDirection: SortDirection = sortState.direction === 'desc' ? 'asc' : 'desc';
      onChange({ field, direction: newDirection });
    } else {
      // New field, default to desc
      onChange({ field, direction: 'desc' });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-dark-muted text-sm mr-1">
        排序：
      </span>
      <div className="flex flex-wrap gap-1.5">
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortState.field === opt.field;
          return (
            <button
              key={opt.field}
              onClick={() => handleFieldClick(opt.field)}
              disabled={loading}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                ${isActive
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                  : 'bg-slate-800/50 text-dark-muted border border-transparent hover:border-slate-600 hover:text-dark-text'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {opt.label}
              {isActive && (
                <span className="ml-1 text-indigo-400">
                  {sortState.direction === 'desc' ? '↓' : '↑'}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <span className="ml-auto text-dark-muted text-xs">
        {stockCount} 只股票
      </span>
    </div>
  );
}
