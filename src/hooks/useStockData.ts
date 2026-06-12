import { useState, useEffect, useCallback, useRef } from 'react';
import type { StockData, SortState } from '../types';
import { fetchStockData } from '../api/stockApi';

const REFRESH_INTERVAL = 30000; // 30 seconds

interface UseStockDataReturn {
  stocks: StockData[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  isCached: boolean;
  warning: string | null;
  sortState: SortState;
  setSortState: (state: SortState) => void;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing stock data with auto-refresh and sorting.
 */
export function useStockData(): UseStockDataReturn {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [sortState, setSortState] = useState<SortState>({
    field: 'tongChiRate1',
    direction: 'desc',
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchStockData();
      setStocks(response.data);
      setIsCached(response.cached);
      setLastUpdated(response.updatedAt);
      setWarning(response.warning ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh
  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  // Sort stocks based on current sort state
  const sortedStocks = [...stocks].sort((a, b) => {
    const { field, direction } = sortState;
    const aVal = a[field];
    const bVal = b[field];

    // Handle null values: push them to the end
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return direction === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  return {
    stocks: sortedStocks,
    loading,
    error,
    lastUpdated,
    isCached,
    warning,
    sortState,
    setSortState,
    refresh: loadData,
  };
}
