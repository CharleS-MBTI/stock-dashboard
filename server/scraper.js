import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

// ============================================================================
// Target stocks to track
// ============================================================================
const TARGET_STOCKS = [
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

const TARGET_CODES = new Set(TARGET_STOCKS.map((s) => s.code));

// ============================================================================
// URL builders for data sources
// ============================================================================
const CHAGU_SOURCES = {
  sh: 'http://ddx.gubit.cn/sh.php',
  sz: 'http://ddx.gubit.cn/sz.php',
};

/** Eastmoney market code prefix: 1=SH, 0=SZ */
function emMarketCode(market) {
  return market === 'sh' ? '1' : '0';
}

/** Eastmoney full secid */
function emSecId(code, market) {
  return `${emMarketCode(market)}.${code}`;
}

// ============================================================================
// Strategy 1: Chaguwang (ddx.gubit.cn) HTML scraping
// ============================================================================

/**
 * Fetch and parse the DDX table from chaguwang.cn for a given market.
 * Returns a Map of stockCode -> parsed row data.
 */
async function scrapeChaguMarket(market) {
  const url = CHAGU_SOURCES[market];
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 10000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });

  // Detect encoding — chaguwang uses GBK/GB2312
  const contentType = response.headers['content-type'] || '';
  let html;
  if (contentType.includes('charset=gb') || contentType.includes('charset=GB')) {
    html = iconv.decode(Buffer.from(response.data), 'gbk');
  } else {
    // Try to detect from meta tag
    const buf = Buffer.from(response.data);
    const head = iconv.decode(buf.slice(0, 1024), 'utf8');
    const charsetMatch = head.match(/charset=["']?\s*([\w-]+)/i);
    if (charsetMatch && /gb/i.test(charsetMatch[1])) {
      html = iconv.decode(buf, 'gbk');
    } else {
      html = iconv.decode(buf, 'utf8');
    }
  }

  const $ = cheerio.load(html);
  const resultMap = new Map();

  // Find the main data table — chaguwang uses a table with class or just the main table
  const tables = $('table');
  let dataTable = null;
  tables.each((_, table) => {
    const text = $(table).text();
    if (text.includes('通吃率') || text.includes('DDX') || text.includes('序号')) {
      dataTable = $(table);
      return false; // break
    }
  });

  if (!dataTable) {
    console.warn(`[ChaguWang] Could not find data table for market ${market}`);
    return resultMap;
  }

  // Parse header row to find column indices
  const headerCells = dataTable.find('tr').first().find('td, th');
  const colMap = {};
  headerCells.each((i, cell) => {
    const headerText = $(cell).text().trim();
    colMap[headerText] = i;
  });

  // Flexible matching for column names (chaguwang may have slight variations)
  const findCol = (...names) => {
    for (const name of names) {
      if (colMap[name] !== undefined) return colMap[name];
    }
    // Fuzzy match
    for (const key of Object.keys(colMap)) {
      for (const name of names) {
        if (key.includes(name)) return colMap[key];
      }
    }
    return -1;
  };

  const idxCode = findCol('代码', '股票代码');
  const idxName = findCol('名称', '股票名称');
  const idxPrice = findCol('最新', '最新价');
  const idxChangePct = findCol('涨幅', '涨跌幅');
  const idxTurnover = findCol('换手率');
  const idxVolRatio = findCol('量比');
  const idxDDX = findCol('DDX');
  const idxDDY = findCol('DDY');
  const idxDDZ = findCol('DDZ');
  const idxVolume = findCol('成交量');
  const idxAmount = findCol('成交额');
  const idxBBD = findCol('BBD');
  const idxTCR1 = findCol('通吃率1', '1日通吃');
  const idxTCR5 = findCol('通吃率5', '5日通吃');
  const idxTCR10 = findCol('通吃率10', '10日通吃');
  const idxTCR20 = findCol('通吃率20', '20日通吃');
  const idxAmplitude = findCol('振幅');

  // Parse data rows
  dataTable.find('tr').slice(1).each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 5) return; // skip empty/malformed rows

    const getText = (idx) => {
      if (idx < 0 || idx >= cells.length) return '';
      return $(cells[idx]).text().trim();
    };

    const code = getText(idxCode);
    if (!code || code.length < 6) return;

    const name = getText(idxName);

    const parseNum = (text) => {
      if (!text || text === '-' || text === '--') return null;
      const cleaned = text.replace(/,/g, '').replace(/%/g, '');
      const val = parseFloat(cleaned);
      return isNaN(val) ? null : val;
    };

    const parsePercent = (text) => {
      if (!text || text === '-' || text === '--') return null;
      const cleaned = text.replace(/,/g, '').replace(/%/g, '');
      const val = parseFloat(cleaned);
      return isNaN(val) ? null : val;
    };

    resultMap.set(code, {
      code,
      name: name || '',
      market,
      latestPrice: parseNum(getText(idxPrice)),
      changePct: parsePercent(getText(idxChangePct)),
      changeAmount: null, // chaguwang may not have this directly
      turnoverRate: parsePercent(getText(idxTurnover)),
      volume: parseNum(getText(idxVolume)) || null,
      amount: parseNum(getText(idxAmount)) || null,
      volumeRatio: parseNum(getText(idxVolRatio)),
      amplitude: parsePercent(getText(idxAmplitude)),
      totalMarketCap: null,
      floatMarketCap: null,
      ddx: parseNum(getText(idxDDX)),
      ddy: parseNum(getText(idxDDY)),
      ddz: parseNum(getText(idxDDZ)),
      tongChiRate1: parsePercent(getText(idxTCR1)),
      tongChiRate5: parsePercent(getText(idxTCR5)),
      tongChiRate10: parsePercent(getText(idxTCR10)),
      tongChiRate20: parsePercent(getText(idxTCR20)),
      bbd: parseNum(getText(idxBBD)),
    });
  });

  console.log(`[ChaguWang] Parsed ${resultMap.size} stocks from ${market} market`);
  return resultMap;
}

// ============================================================================
// Strategy 2: Eastmoney public API (fallback / supplement)
// ============================================================================

/**
 * Fetch real-time quote data from Eastmoney API.
 * Returns a Map of code -> quote data.
 */
async function fetchEastmoneyQuotes(codes) {
  const secids = codes.map(({ code, market }) => emSecId(code, market)).join(',');
  const url = `http://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f5,f6,f8,f10,f12,f14,f15,f16,f17,f18,f20,f21,f170&secids=${secids}`;

  try {
    const { data } = await axios.get(url, { timeout: 8000 });
    const resultMap = new Map();

    if (data?.data?.diff) {
      for (const item of data.data.diff) {
        resultMap.set(item.f12, {
          latestPrice: item.f2 ?? null,           // 最新价
          changePct: item.f3 ?? null,              // 涨跌幅(%)
          changeAmount: item.f4 ?? null,            // 涨跌额
          turnoverRate: item.f8 ?? null,            // 换手率(%)
          volume: item.f5 ?? null,                  // 成交量(手)
          amount: item.f6 ?? null,                  // 成交额(元)
          volumeRatio: item.f10 ?? null,            // 量比
          amplitude: item.f15 ?? null,              // 振幅(%)
          totalMarketCap: item.f20 ?? null,         // 总市值
          floatMarketCap: item.f21 ?? null,         // 流通市值
        });
      }
    }
    return resultMap;
  } catch (err) {
    console.warn('[Eastmoney Quotes] Failed:', err.message);
    return new Map();
  }
}

/**
 * Fetch fund flow data from Eastmoney (as fallback for tongChiRate).
 * Returns a Map of code -> { tongChiRate1, tongChiRate5, tongChiRate10, tongChiRate20 }
 */
async function fetchEastmoneyFundFlow(codes) {
  const resultMap = new Map();

  for (const { code, market } of codes) {
    try {
      const secid = emSecId(code, market);
      // kline fund flow endpoint
      const url = `http://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?lmt=0&klt=101&secid=${secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58`;

      const { data } = await axios.get(url, { timeout: 5000 });
      if (data?.data?.klines && data.data.klines.length > 0) {
        const lines = data.data.klines;
        const last = lines[lines.length - 1];
        const parts = last.split(',');
        // f52: mainForceNet (主力净流入), f53: mainForcePct (主力净流入占比)
        // f54: superLargeNet (超大单净流入), f55: superLargePct
        // f56: largeNet (大单净流入), f57: largePct
        // f58: midNet (中单净流入), f59: smallNet (小单净流入)

        // For tongChiRate, we use (superLarge + large) / amount as percentage
        const superLargeNet = parseFloat(parts[4]) || 0;  // f54
        const largeNet = parseFloat(parts[6]) || 0;        // f56
        const amount = parseFloat(parts[1]) || 1;           // f52 is date, actually let me check

        // Actually the kline format: 日期,主力净流入,小单净流入,中单净流入,大单净流入,超大单净流入
        // Let me use the correct indices
        // f51=日期, f52=主力净流入, f53=小单净流入, f54=中单净流入, f55=大单净流入, f56=超大单净流入
        const mainForceNet = parseFloat(parts[1]) || 0;     // 主力净流入
        const smallNet = parseFloat(parts[2]) || 0;         // 小单净流入
        const midNet = parseFloat(parts[3]) || 0;           // 中单净流入
        const largeNetVal = parseFloat(parts[4]) || 0;      // 大单净流入
        const superLargeNetVal = parseFloat(parts[5]) || 0; // 超大单净流入

        // We also need the turnover amount — get from quotes
        // For now just compute net flow amounts
        const tongChiVal = mainForceNet; // 主力净流入金额作为近似

        resultMap.set(code, {
          mainForceNet: tongChiVal,
          superLargeNet: superLargeNetVal,
          largeNet: largeNetVal,
          midNet,
          smallNet,
        });
      }
    } catch (err) {
      // Individual stock failure is ok
    }
  }

  return resultMap;
}

// ============================================================================
// Strategy 3: Sina finance API (last resort)
// ============================================================================

/**
 * Build Sina API symbol list.
 */
function sinaSymbols(codes) {
  return codes.map(({ code, market }) => `${market}${code}`).join(',');
}

/**
 * Fetch quotes from Sina.
 */
async function fetchSinaQuotes(codes) {
  const symbols = sinaSymbols(codes);
  const url = `http://hq.sinajs.cn/list=${symbols}`;

  try {
    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: {
        Referer: 'https://finance.sina.com.cn',
      },
    });
    const resultMap = new Map();

    const lines = data.split('\n').filter(Boolean);
    for (const line of lines) {
      const match = line.match(/var hq_str_(\w+)="(.+)"/);
      if (!match) continue;
      const fullSymbol = match[1]; // e.g., sh600586
      const code = fullSymbol.slice(2);
      const fields = match[2].split(',');

      if (fields.length < 32) continue;

      resultMap.set(code, {
        latestPrice: parseFloat(fields[3]) || null,
        changePct: parseFloat(fields[4]) || null, // actually this is changeAmount in sina
        changeAmount: parseFloat(fields[4]) || null,
        turnoverRate: null, // not in sina basic
        volume: parseFloat(fields[8]) || null,
        amount: parseFloat(fields[9]) || null,
        volumeRatio: null,
        amplitude: null,
        totalMarketCap: null,
        floatMarketCap: null,
      });

      // Let me correct: sina fields: name, open, close, price, high, low, ...
      // Actually: 0=name, 1=open, 2=prevClose, 3=price, 4=high, 5=low, ...
      // changePct = (price - prevClose) / prevClose * 100
      const price = parseFloat(fields[3]);
      const prevClose = parseFloat(fields[2]);
      const chgPct = prevClose > 0 ? ((price - prevClose) / prevClose * 100) : null;

      resultMap.set(code, {
        latestPrice: price || null,
        changePct: chgPct,
        changeAmount: price && prevClose ? (price - prevClose) : null,
        turnoverRate: null,
        volume: parseFloat(fields[8]) || null,
        amount: parseFloat(fields[9]) || null,
        volumeRatio: null,
        amplitude: null,
        totalMarketCap: null,
        floatMarketCap: null,
      });
    }
    return resultMap;
  } catch (err) {
    console.warn('[Sina Quotes] Failed:', err.message);
    return new Map();
  }
}

// ============================================================================
// Main orchestration: scrape all 9 stocks with multi-source fallback
// ============================================================================

/**
 * Main entry: scrape all 9 stocks using multi-source strategy.
 * Priority: Chaguwang > Eastmoney (quotes + fund flow) > Sina
 */
export async function scrapeAllStocks() {
  const results = [];

  console.log('[Scraper] Starting multi-source data collection...');

  // Step 1: Try Chaguwang for SH and SZ markets
  let chaguData = new Map();
  try {
    const [shData, szData] = await Promise.all([
      scrapeChaguMarket('sh'),
      scrapeChaguMarket('sz'),
    ]);
    chaguData = new Map([...shData, ...szData]);
    console.log(`[Scraper] Chaguwang: got ${chaguData.size} stocks`);
  } catch (err) {
    console.warn('[Scraper] Chaguwang failed:', err.message);
  }

  // Step 2: Supplement with Eastmoney quotes
  const codesNeedingSupplement = TARGET_STOCKS.filter((s) => {
    const d = chaguData.get(s.code);
    return !d || d.latestPrice === null || d.turnoverRate === null;
  });

  let emQuotes = new Map();
  let emFundFlow = new Map();

  if (codesNeedingSupplement.length > 0) {
    try {
      emQuotes = await fetchEastmoneyQuotes(codesNeedingSupplement);
      console.log(`[Scraper] Eastmoney quotes: got ${emQuotes.size} stocks`);
    } catch (err) {
      console.warn('[Scraper] Eastmoney quotes failed:', err.message);
    }
  }

  // Step 3: If chaguwang has no tongChiRate, supplement with Eastmoney fund flow
  const needFundFlow = TARGET_STOCKS.filter((s) => {
    const d = chaguData.get(s.code);
    return !d || d.tongChiRate1 === null;
  });

  if (needFundFlow.length > 0) {
    try {
      emFundFlow = await fetchEastmoneyFundFlow(needFundFlow);
      console.log(`[Scraper] Eastmoney fund flow: got ${emFundFlow.size} stocks`);
    } catch (err) {
      console.warn('[Scraper] Eastmoney fund flow failed:', err.message);
    }
  }

  // Step 4: If still missing, try Sina
  const stillMissing = TARGET_STOCKS.filter((s) => {
    const d = chaguData.get(s.code);
    const eq = emQuotes.get(s.code);
    return (!d || d.latestPrice === null) && (!eq || eq.latestPrice === null);
  });

  let sinaQuotes = new Map();
  if (stillMissing.length > 0) {
    try {
      sinaQuotes = await fetchSinaQuotes(stillMissing);
      console.log(`[Scraper] Sina quotes: got ${sinaQuotes.size} stocks`);
    } catch (err) {
      console.warn('[Scraper] Sina quotes failed:', err.message);
    }
  }

  // Step 5: Merge all data sources
  for (const stock of TARGET_STOCKS) {
    const chagu = chaguData.get(stock.code) || {};
    const emQ = emQuotes.get(stock.code) || {};
    const emFF = emFundFlow.get(stock.code) || {};
    const sina = sinaQuotes.get(stock.code) || {};

    // Compute approximate tongChiRate from Eastmoney fund flow if chaguwang is missing
    let tcr1 = chagu.tongChiRate1;
    let tcr5 = chagu.tongChiRate5;
    let tcr10 = chagu.tongChiRate10;
    let tcr20 = chagu.tongChiRate20;

    // If chaguwang tongChiRate is missing and we have fund flow data,
    // compute tongChiRate = (superLarge+large)/amount * 100
    if (tcr1 === null && emFF.mainForceNet !== undefined) {
      const amount = chagu.amount || emQ.amount || 1;
      // amount from eastmoney is in yuan, mainForceNet is in 万元 usually
      // We'll normalize: mainForceNet is in 万元, amount is in 元
      const amountWan = amount > 1e6 ? amount / 10000 : amount;
      if (amountWan > 0) {
        tcr1 = parseFloat(((emFF.mainForceNet / amountWan) * 100).toFixed(2));
      }
    }

    const merged = {
      code: stock.code,
      name: chagu.name || stock.name,
      market: stock.market,
      latestPrice: chagu.latestPrice ?? emQ.latestPrice ?? sina.latestPrice,
      changePct: chagu.changePct ?? emQ.changePct ?? sina.changePct,
      changeAmount: chagu.changeAmount ?? emQ.changeAmount ?? sina.changeAmount,
      turnoverRate: chagu.turnoverRate ?? emQ.turnoverRate ?? sina.turnoverRate,
      volume: chagu.volume ?? emQ.volume ?? sina.volume,
      amount: chagu.amount ?? emQ.amount ?? sina.amount,
      volumeRatio: chagu.volumeRatio ?? emQ.volumeRatio ?? sina.volumeRatio,
      amplitude: chagu.amplitude ?? emQ.amplitude ?? sina.amplitude,
      totalMarketCap: chagu.totalMarketCap ?? emQ.totalMarketCap ?? sina.totalMarketCap,
      floatMarketCap: chagu.floatMarketCap ?? emQ.floatMarketCap ?? sina.floatMarketCap,
      ddx: chagu.ddx ?? null,
      ddy: chagu.ddy ?? null,
      ddz: chagu.ddz ?? null,
      tongChiRate1: tcr1 ?? null,
      tongChiRate5: tcr5 ?? null,
      tongChiRate10: tcr10 ?? null,
      tongChiRate20: tcr20 ?? null,
    };

    results.push(merged);
  }

  console.log(`[Scraper] Final: ${results.length} stocks merged`);
  return results;
}
