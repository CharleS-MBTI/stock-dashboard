import express from 'express';
import cors from 'cors';
import { scrapeAllStocks } from './scraper.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/** In-memory cache with timestamp */
let cache = {
  data: null,
  updatedAt: null,
};
const CACHE_TTL = 30000; // 30 seconds

/**
 * GET /api/stocks
 * Returns stock data for all 9 tracked stocks.
 * Uses cached data if available within TTL.
 */
app.get('/api/stocks', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && cache.updatedAt && (now - cache.updatedAt < CACHE_TTL)) {
      return res.json({ success: true, data: cache.data, cached: true, updatedAt: cache.updatedAt });
    }

    const data = await scrapeAllStocks();
    cache = { data, updatedAt: now };
    res.json({ success: true, data, cached: false, updatedAt: now });
  } catch (error) {
    console.error('Scrape error:', error.message);
    // Return cached data even if expired, as fallback
    if (cache.data) {
      return res.json({
        success: true,
        data: cache.data,
        cached: true,
        updatedAt: cache.updatedAt,
        warning: 'Using cached data — live scrape failed',
      });
    }
    // Ultimate fallback: return static tickers with empty data
    const fallback = getFallbackData();
    res.json({ success: true, data: fallback, cached: false, updatedAt: Date.now(), warning: 'Using fallback data' });
  }
});

/**
 * GET /api/health
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', cacheAge: cache.updatedAt ? Date.now() - cache.updatedAt : null });
});

/** Return static fallback data for the 9 stocks when all scraping fails */
function getFallbackData() {
  const stocks = [
    { code: '600586', name: '金晶科技', market: 'sh' },
    { code: '300468', name: '四方精创', market: 'sz' },
    { code: '603108', name: '润达医疗', market: 'sh' },
    { code: '002475', name: '立讯精密', market: 'sz' },
    { code: '000657', name: '中钨高新', market: 'sz' },
    { code: '300953', name: '震裕科技', market: 'sz' },
    { code: '002261', name: '拓维信息', market: 'sz' },
    { code: '002703', name: '浙江世宝', market: 'sz' },
    { code: '002565', name: '顺灏股份', market: 'sz' },
  ];
  return stocks.map((s) => ({
    ...s,
    latestPrice: null,
    changePct: null,
    changeAmount: null,
    turnoverRate: null,
    volume: null,
    amount: null,
    volumeRatio: null,
    amplitude: null,
    totalMarketCap: null,
    floatMarketCap: null,
    ddx: null,
    ddy: null,
    ddz: null,
    tongChiRate1: null,
    tongChiRate5: null,
    tongChiRate10: null,
    tongChiRate20: null,
  }));
}

app.listen(PORT, () => {
  console.log(`📊 Stock data proxy server running on http://localhost:${PORT}`);
  console.log(`   API endpoint: http://localhost:${PORT}/api/stocks`);
});
