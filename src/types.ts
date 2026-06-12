/** Core stock data type matched to backend API response */
export interface StockData {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 市场: sh=沪市, sz=深市 */
  market: 'sh' | 'sz';
  /** 最新价 */
  latestPrice: number | null;
  /** 涨跌幅 (%) */
  changePct: number | null;
  /** 涨跌额 */
  changeAmount: number | null;
  /** 换手率 (%) */
  turnoverRate: number | null;
  /** 成交量 */
  volume: number | null;
  /** 成交额 */
  amount: number | null;
  /** 量比 */
  volumeRatio: number | null;
  /** 振幅 (%) */
  amplitude: number | null;
  /** 总市值 */
  totalMarketCap: number | null;
  /** 流通市值 */
  floatMarketCap: number | null;
  /** DDX 大单动向 */
  ddx: number | null;
  /** DDY 涨跌动因 */
  ddy: number | null;
  /** DDZ 大单差分 */
  ddz: number | null;
  /** 1日通吃率 (%) */
  tongChiRate1: number | null;
  /** 5日通吃率 (%) */
  tongChiRate5: number | null;
  /** 10日通吃率 (%) */
  tongChiRate10: number | null;
  /** 20日通吃率 (%) */
  tongChiRate20: number | null;
}

/** API response wrapper */
export interface StockApiResponse {
  success: boolean;
  data: StockData[];
  cached: boolean;
  updatedAt: number;
  warning?: string;
}

/** Sort field identifiers */
export type SortField =
  | 'code'
  | 'name'
  | 'latestPrice'
  | 'changePct'
  | 'turnoverRate'
  | 'volumeRatio'
  | 'ddx'
  | 'ddy'
  | 'ddz'
  | 'tongChiRate1'
  | 'tongChiRate5'
  | 'tongChiRate10'
  | 'tongChiRate20';

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Sort state */
export interface SortState {
  field: SortField;
  direction: SortDirection;
}
