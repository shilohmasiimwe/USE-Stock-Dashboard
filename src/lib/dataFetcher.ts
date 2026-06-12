// Data fetcher for USE stocks from African Financials
// This service fetches and updates stock data daily

import { StockMetrics, USE_STOCKS } from '@/types/stock';
import { getStockDataSync } from './mockData';
import { getCachedPrices, setCachedPrices, invalidatePriceCache } from './redis';

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalPriceData {
  ticker: string;
  data: PriceData[];
}

// Cache for current prices (updated daily)
let priceCache: Record<string, StockMetrics> | null = null;
let lastUpdate: Date | null = null;

const COMPANY_TICKER_MAP: Record<string, string> = {
  // MTN
  'mtn': 'MTN',
  'mtn uganda': 'MTN',
  'mtn uganda limited': 'MTN',
  // Airtel
  'airtel uganda': 'AIRTL',
  'airtel': 'AIRTL',
  'airtel uganda limited': 'AIRTL',
  // Stanbic
  'stanbic': 'SBU',
  'stanbic bank': 'SBU',
  'stanbic bank uganda': 'SBU',
  'stanbic bank uganda limited': 'SBU',
  // DFCU
  'dfcu bank': 'DFCU',
  'dfcu': 'DFCU',
  'dfcu limited': 'DFCU',
  'dfcu group': 'DFCU',
  // Bank of Baroda
  'baroda': 'BOBU',
  'bank of baroda': 'BOBU',
  'bank of baroda uganda': 'BOBU',
  'bank of baroda uganda limited': 'BOBU',
  'bank of baroda (u) limited': 'BOBU',
  // Equity Bank
  'equity bank uganda': 'EBU',
  'equity bank': 'EBU',
  'equity bank uganda limited': 'EBU',
  'equity bank (u) limited': 'EBU',
  // Uganda Clays
  'uganda clays': 'UCL',
  'uganda clays limited': 'UCL',
  'uganda clays ltd': 'UCL',
  // New Vision
  'new vision': 'NVU',
  'new vision printing and publishing': 'NVU',
  'new vision printing and publishing company': 'NVU',
  'new vision printing and publishing company limited': 'NVU',
  'new vision group': 'NVU',
  // NIC — National Insurance Corporation (many aliases used by African Financials)
  'national insurance corporation': 'NIC',
  'national insurance corporation limited': 'NIC',
  'national insurance corporation of uganda': 'NIC',
  'national insurance corporation (u) limited': 'NIC',
  'nic': 'NIC',
  'nic holdings': 'NIC',
  'nic holdings limited': 'NIC',
  'nic uganda': 'NIC',
  'national insurance': 'NIC',
  // BATU
  'bat uganda': 'BATU',
  'british american tobacco uganda': 'BATU',
  'british american tobacco': 'BATU',
  'british american tobacco uganda limited': 'BATU',
  'bat': 'BATU',
  'b.a.t uganda': 'BATU',
  'b.a.t. uganda': 'BATU',
  // Umeme
  'umeme': 'UMEME',
  'umeme limited': 'UMEME',
  'umeme ltd': 'UMEME',
  // QCIL
  'qcil': 'QCIL',
  'quality chemical industries': 'QCIL',
  'quality chemicals industries': 'QCIL',
  'quality chemicals industries ltd': 'QCIL',
  'quality chemical industries ltd': 'QCIL',
  'quality chemical industries limited': 'QCIL',
  'quality chemicals': 'QCIL',
};

// Keyword-based fuzzy fallback for company names not in the exact map
const COMPANY_KEYWORDS: [RegExp, string][] = [
  [/\bmtn\b/i, 'MTN'],
  [/\bairtel\b/i, 'AIRTL'],
  [/\bstanbic\b/i, 'SBU'],
  [/\bdfcu\b/i, 'DFCU'],
  [/\bbaroda\b/i, 'BOBU'],
  [/equity\s+bank/i, 'EBU'],
  [/uganda\s+clay/i, 'UCL'],
  [/new\s+vision/i, 'NVU'],
  [/\b(nic\b|national\s+insurance)/i, 'NIC'],
  [/(british\s+american\s+tobacco|\bbat\b)/i, 'BATU'],
  [/\bumeme\b/i, 'UMEME'],
  [/\b(qcil|quality\s+chem)/i, 'QCIL'],
];

const fuzzyMatchTicker = (name: string): string | undefined => {
  for (const [pattern, ticker] of COMPANY_KEYWORDS) {
    if (pattern.test(name)) return ticker;
  }
  return undefined;
};

// AFX Kwayisi sometimes uses slightly different ticker codes
const AFX_TICKER_ALIASES: Record<string, string> = {
  AIRT: 'AIRTL',
  AIRTL: 'AIRTL',
  MTN: 'MTN',
  SBU: 'SBU',
  DFCU: 'DFCU',
  BOBU: 'BOBU',
  EBU: 'EBU',
  UCL: 'UCL',
  NVU: 'NVU',
  NIC: 'NIC',
  BATU: 'BATU',
  UMEME: 'UMEME',
  QCIL: 'QCIL',
};

const normalizeCompanyName = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const parseNumber = (value: string) => Number.parseFloat(value.replace(/,/g, ''));

const parseMarketCap = (value: string) => {
  const normalized = value.toUpperCase().replace(/^UGX\s+/, '').replace(/,/g, '').trim();
  const match = normalized.match(/^([\d.]+)\s*([KMBT])$/);
  if (!match) return null;

  const amount = Number.parseFloat(match[1]);
  const unit = match[2];
  const multiplier = unit === 'T'
    ? 1_000_000_000_000
    : unit === 'B'
      ? 1_000_000_000
      : unit === 'M'
        ? 1_000_000
        : 1_000;

  return Number.isFinite(amount) ? amount * multiplier : null;
};

const formatMarketCap = (value: number) => {
  const units = [
    { suffix: 'T', value: 1_000_000_000_000 },
    { suffix: 'B', value: 1_000_000_000 },
    { suffix: 'M', value: 1_000_000 },
    { suffix: 'K', value: 1_000 },
  ];

  for (const unit of units) {
    if (value >= unit.value) {
      const scaled = value / unit.value;
      const formatted = scaled >= 100
        ? scaled.toFixed(0)
        : scaled >= 10
          ? scaled.toFixed(1)
          : scaled.toFixed(2);

      return `UGX ${formatted.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}${unit.suffix}`;
    }
  }

  return `UGX ${value.toFixed(0)}`;
};

const deriveMarketCap = (marketCap: string, currentPrice: number, basePrice: number) => {
  const baseMarketCap = parseMarketCap(marketCap);
  if (!baseMarketCap || basePrice <= 0 || currentPrice <= 0) return marketCap;

  return formatMarketCap(baseMarketCap * (currentPrice / basePrice));
};

const derivePeRatio = (base: StockMetrics, currentPrice: number) => {
  if (base.currentPrice <= 0 || currentPrice <= 0) return base.peRatio;
  return Number((base.peRatio * (currentPrice / base.currentPrice)).toFixed(1));
};

const deriveDividendYield = (base: StockMetrics, currentPrice: number) => {
  if (base.currentPrice <= 0 || currentPrice <= 0) return base.dividendYield;

  const annualDividendPerShare = base.currentPrice * (base.dividendYield / 100);
  return Number(((annualDividendPerShare / currentPrice) * 100).toFixed(1));
};

const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

const stripTags = (value: string) =>
  decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());

const parseAfricanFinancialsHtml = (html: string) => {
  const sanitized = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');

  const rows = sanitized.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  let headerCells: string[] | null = null;
  let headerIndexes: Record<string, number> | null = null;
  const parsed: Record<string, { currentPrice: number; changePercent: number; volume: number; lastUpdated: string }> = {};

  const headerLookup = (cell: string) => stripTags(cell).toLowerCase();

  for (const row of rows) {
    const cells = Array.from(row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((match) => match[1]);
    if (cells.length === 0) continue;

    if (!headerCells) {
      const normalized = cells.map(headerLookup);
      const hasCompanyCol = normalized.some((cell) =>
        cell.includes('company') || cell.includes('issuer') || cell === 'stock' || cell === 'name' || cell === 'security'
      );
      const hasPriceCol = normalized.some((cell) => cell.includes('price') || cell === 'last' || cell === 'close');
      if (hasCompanyCol && hasPriceCol) {
        headerCells = normalized;
        headerIndexes = {
          company: normalized.findIndex((cell) =>
            cell.includes('company') || cell.includes('issuer') || cell === 'stock' || cell === 'name' || cell === 'security'
          ),
          price: normalized.findIndex((cell) => cell.includes('price') || cell === 'last' || cell === 'close'),
          changePct: normalized.findIndex((cell) => (cell.includes('%') || cell.includes('change') || cell === 'chg') && !cell.includes('52')),
          volume: normalized.findIndex((cell) => cell.includes('volume') || cell === 'vol'),
          updated: normalized.findIndex((cell) => cell.includes('updated') || cell.includes('date') || cell === 'time')
        };
      }
      continue;
    }

    if (!headerIndexes) continue;

    const values = cells.map(stripTags);
    const companyRaw = values[headerIndexes.company] || '';
    const company = normalizeCompanyName(companyRaw);
    const ticker = COMPANY_TICKER_MAP[company] ?? fuzzyMatchTicker(companyRaw);
    if (!ticker) continue;

    const priceText = values[headerIndexes.price] || '';
    const changeText = values[headerIndexes.changePct] || '';
    const volumeText = values[headerIndexes.volume] || '';
    const dateText = values[headerIndexes.updated] || '';

    const currentPrice = parseNumber(priceText);
    const changePercent = parseNumber(changeText);
    const volume = parseNumber(volumeText);
    const updatedDate = new Date(dateText);

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) continue;

    parsed[ticker] = {
      currentPrice,
      changePercent: Number.isFinite(changePercent) ? changePercent : 0,
      volume: Number.isFinite(volume) ? volume : 0,
      lastUpdated: Number.isNaN(updatedDate.getTime())
        ? new Date().toISOString()
        : updatedDate.toISOString()
    };
  }

  return parsed;
};

// ── AFX Kwayisi parser ───────────────────────────────────────────────────────
// afx.kwayisi.org/ugse/ lists tickers explicitly in a Symbol column — much
// more reliable than name-matching. Also provides 52-week high/low.

type AfxRow = {
  currentPrice: number;
  changePercent: number;
  volume: number;
  high52Week: number;
  low52Week: number;
  lastUpdated: string;
};

const parseAfxKwayisiHtml = (html: string): Record<string, AfxRow> => {
  const sanitized = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const rows = sanitized.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  let symbolIdx = -1;
  let lastIdx = -1;
  let chgPctIdx = -1;
  let high52Idx = -1;
  let low52Idx = -1;
  let volIdx = -1;

  const parsed: Record<string, AfxRow> = {};

  for (const row of rows) {
    const cells = Array.from(row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((m) => m[1]);
    if (!cells.length) continue;

    const values = cells.map(stripTags);

    if (symbolIdx === -1) {
      const norm = values.map((v) => v.toLowerCase().trim());
      const sIdx = norm.findIndex((v) => v === 'sym' || v === 'symbol' || v === 'ticker' || v === 'code');
      if (sIdx < 0) continue;
      symbolIdx = sIdx;
      lastIdx = norm.findIndex((v) => v === 'last' || v === 'price' || v === 'close' || v.includes('last price'));
      chgPctIdx = norm.findIndex((v) => v === '%chg' || v === 'chg%' || v === '%change' || v.includes('%'));
      high52Idx = norm.findIndex((v) => v.includes('52') && (v.includes('hi') || v.includes('high') || v.includes('max')));
      low52Idx = norm.findIndex((v) => v.includes('52') && (v.includes('lo') || v.includes('low') || v.includes('min')));
      volIdx = norm.findIndex((v) => v === 'volume' || v === 'vol' || v.includes('shares'));
      continue;
    }

    const symbol = values[symbolIdx]?.toUpperCase().trim();
    if (!symbol) continue;

    const ticker = AFX_TICKER_ALIASES[symbol];
    if (!ticker) continue;

    const price = parseNumber(values[lastIdx] ?? '');
    if (!Number.isFinite(price) || price <= 0) continue;

    const chgPct = parseNumber(values[chgPctIdx] ?? '');
    const vol = parseNumber(values[volIdx] ?? '');
    const hi52 = parseNumber(values[high52Idx] ?? '');
    const lo52 = parseNumber(values[low52Idx] ?? '');

    parsed[ticker] = {
      currentPrice: price,
      changePercent: Number.isFinite(chgPct) ? chgPct : 0,
      volume: Number.isFinite(vol) && vol >= 0 ? vol : 0,
      high52Week: Number.isFinite(hi52) && hi52 > 0 ? hi52 : 0,
      low52Week: Number.isFinite(lo52) && lo52 > 0 ? lo52 : 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  return parsed;
};

async function fetchAfxKwayisiPrices(): Promise<Record<string, AfxRow>> {
  const response = await fetch('https://afx.kwayisi.org/ugse/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!response.ok) throw new Error(`AFX Kwayisi request failed: ${response.status}`);
  return parseAfxKwayisiHtml(await response.text());
}

async function fetchFallbackPrices(): Promise<Record<string, StockMetrics>> {
  const fallbackUrl = process.env.AFRICAN_MARKET_FALLBACK_URL;
  if (!fallbackUrl) return {};

  const response = await fetch(fallbackUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...(process.env.AFRICAN_MARKET_FALLBACK_TOKEN
        ? { Authorization: `Bearer ${process.env.AFRICAN_MARKET_FALLBACK_TOKEN}` }
        : {})
    }
  });

  if (!response.ok) {
    throw new Error(`Fallback market source failed: ${response.status}`);
  }

  const payload = await response.json();
  const results: Record<string, StockMetrics> = {};

  if (!Array.isArray(payload)) {
    return results;
  }

  for (const entry of payload) {
    if (!entry?.ticker) continue;
    const base = getStockDataSync(entry.ticker)?.metrics;
    if (!base) continue;

    results[entry.ticker] = {
      ...base,
      currentPrice: Number(entry.currentPrice ?? base.currentPrice),
      changePercent: Number(entry.changePercent ?? base.changePercent),
      change: Number(entry.change ?? base.change),
      volume: Number(entry.volume ?? base.volume),
      lastUpdated: entry.lastUpdated ?? base.lastUpdated ?? new Date().toISOString()
    };
  }

  return results;
}

// Fetch current stock prices from African Financials
// Cache priority: Redis (persists across Vercel serverless instances) →
//                 in-memory (same instance only) → scrape → mock data
export async function fetchCurrentPrices(): Promise<Record<string, StockMetrics>> {
  // 1. Try Redis cache (survives across cold starts on Vercel)
  const redisCached = await getCachedPrices<Record<string, StockMetrics>>();
  if (redisCached && Object.keys(redisCached).length > 0) {
    priceCache = redisCached;   // warm the in-memory cache too
    lastUpdate = new Date();
    return redisCached;
  }

  // 2. Fall back to in-memory cache (within the same serverless instance)
  if (priceCache && lastUpdate) {
    const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate < 24) {
      return priceCache;
    }
  }

  // 3. Scrape both sources in parallel — AFX Kwayisi (explicit tickers, higher
  //    reliability) and African Financials (name-based, broader coverage).
  //    Merge results: AFX Kwayisi wins on price when present; African Financials
  //    fills gaps for tickers AFX doesn't cover.
  try {
    const [afxResult, afResult] = await Promise.allSettled([
      fetchAfxKwayisiPrices(),
      fetch('https://africanfinancials.com/uganda-securities-exchange-share-prices/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      }).then((r) => {
        if (!r.ok) throw new Error(`African Financials: ${r.status}`);
        return r.text().then(parseAfricanFinancialsHtml);
      }),
    ]);

    const afxParsed: Record<string, AfxRow> =
      afxResult.status === 'fulfilled' ? afxResult.value : {};
    const afParsed =
      afResult.status === 'fulfilled' ? afResult.value : {};

    const totalHits = Object.keys(afxParsed).length + Object.keys(afParsed).length;
    if (totalHits === 0) throw new Error('No prices from either source');

    const prices: Record<string, StockMetrics> = {};
    for (const stock of USE_STOCKS) {
      const base = getStockDataSync(stock.ticker)?.metrics;
      if (!base) continue;

      // AFX Kwayisi takes precedence; fall back to African Financials
      const afxRow = afxParsed[stock.ticker];
      const afRow = afParsed[stock.ticker];
      const update = afxRow ?? afRow;

      if (update) {
        const newPrice = update.currentPrice;
        prices[stock.ticker] = {
          ...base,
          currentPrice: newPrice,
          changePercent: update.changePercent,
          change: Number((newPrice * (update.changePercent / 100)).toFixed(2)),
          marketCap: deriveMarketCap(base.marketCap, newPrice, base.currentPrice),
          volume: update.volume || base.volume,
          peRatio: derivePeRatio(base, newPrice),
          dividendYield: deriveDividendYield(base, newPrice),
          // Use live 52-week range when AFX provides it; keep base otherwise
          high52Week: (afxRow?.high52Week ?? 0) > 0 ? afxRow!.high52Week : base.high52Week,
          low52Week: (afxRow?.low52Week ?? 0) > 0 ? afxRow!.low52Week : base.low52Week,
          lastUpdated: update.lastUpdated,
        };
      } else {
        prices[stock.ticker] = { ...base, lastUpdated: base.lastUpdated || new Date().toISOString() };
      }
    }

    // Persist to Redis (24 hr TTL) and warm in-memory cache
    await setCachedPrices(prices);
    priceCache = prices;
    lastUpdate = new Date();

    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);

    // 4. Try optional fallback API
    try {
      const fallbackPrices = await fetchFallbackPrices();
      if (Object.keys(fallbackPrices).length > 0) {
        await setCachedPrices(fallbackPrices);
        priceCache = fallbackPrices;
        lastUpdate = new Date();
        return fallbackPrices;
      }
    } catch (fallbackError) {
      console.error('Fallback data source failed:', fallbackError);
    }

    // 5. Last resort: mock data (no Redis write — don't cache stale mock data)
    const mock = await getMockPricesFromSource();
    priceCache = mock;
    lastUpdate = new Date();
    return mock;
  }
}

// Mock function that simulates fetching from African Financials
// In production, replace this with actual scraping/API call
async function getMockPricesFromSource(): Promise<Record<string, StockMetrics>> {
  // This would be replaced with actual scraping logic
  // For now, return the current mock data structure
  const stocks = ['MTN', 'AIRTL', 'DFCU', 'NVU', 'UCL', 'SBU', 'BOBU', 'EBU', 'NIC', 'BATU', 'UMEME', 'QCIL'];
  
  const prices: Record<string, StockMetrics> = {};
  
  for (const ticker of stocks) {
    const stockData = getStockDataSync(ticker);
    if (stockData) {
      prices[ticker] = stockData.metrics;
    }
  }
  
  return prices;
}

// ── Seeded PRNG (xorshift32) ─────────────────────────────────────────────────
// Deterministic per ticker so the chart is stable across page loads.

function makeRand(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function tickerSeed(ticker: string, currentPrice: number): number {
  let h = 0xdeadbeef;
  for (const c of ticker) h = Math.imul(h ^ c.charCodeAt(0), 0x9e3779b9);
  h ^= Math.round(currentPrice); // stable within a trading session
  return h >>> 0;
}

// Box-Muller transform → standard-normal sample
function makeRandn(rand: () => number): () => number {
  return () => {
    const u1 = Math.max(rand(), 1e-10);
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

// ── Regime definitions ───────────────────────────────────────────────────────
// USE stocks (emerging-market, thin liquidity) exhibit pronounced trend regimes.

interface Regime {
  drift: number; // per-period log drift
  vol: number;   // per-period log volatility
}

function regimesForTimeframe(baseVol: number): Regime[] {
  return [
    { drift:  0.0015, vol: baseVol },           // mild uptrend
    { drift: -0.002,  vol: baseVol * 1.5 },     // pullback / downtrend
    { drift:  0.0005, vol: baseVol * 0.55 },    // sideways / consolidation
    { drift:  0.003,  vol: baseVol * 1.25 },    // strong rally
    { drift: -0.001,  vol: baseVol * 0.8 },     // slow drift lower
  ];
}

// ── Main generator ───────────────────────────────────────────────────────────

export function generateHistoricalData(
  ticker: string,
  currentPrice: number,
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'
): PriceData[] {
  const now = new Date();

  let periods: number;
  let daysPerPeriod: number;
  let baseVol: number;

  switch (timeframe) {
    case 'daily':
      periods = 252;  // ~1 year of trading days — enough for 50-day and 200-day MAs
      daysPerPeriod = 1;
      baseVol = 0.02; // 2 % daily — realistic for USE thin-market stocks
      break;
    case 'weekly':
      periods = 104;
      daysPerPeriod = 7;
      baseVol = 0.045;
      break;
    case 'monthly':
      periods = 36;
      daysPerPeriod = 30;
      baseVol = 0.09;
      break;
    case 'yearly':
    default:
      periods = 5;
      daysPerPeriod = 365;
      baseVol = 0.22;
      break;
  }

  const rand  = makeRand(tickerSeed(ticker, currentPrice));
  const randn = makeRandn(rand);
  const regimes = regimesForTimeframe(baseVol);

  // ── Generate log-returns with regime switching ──
  // Regimes switch every 20-60 bars producing visible trend swings.
  const logReturns: number[] = [];
  let regimeIdx = Math.floor(rand() * regimes.length);
  let regimeRemaining = Math.floor(rand() * 40) + 20;
  const momentum = 0.12; // mild autocorrelation for smoother swings

  for (let i = 0; i < periods; i++) {
    if (regimeRemaining <= 0) {
      // Pick any regime except the current one to ensure visible change
      regimeIdx = (regimeIdx + 1 + Math.floor(rand() * (regimes.length - 1))) % regimes.length;
      regimeRemaining = Math.floor(rand() * 40) + 20;
    }
    const { drift, vol } = regimes[regimeIdx];
    const prev = i > 0 ? logReturns[i - 1] : 0;
    logReturns.push(drift + vol * randn() + momentum * prev);
    regimeRemaining--;
  }

  // ── Convert log-returns → price levels, then scale to end exactly at currentPrice ──
  const rawPrices: number[] = [1.0];
  for (const r of logReturns) rawPrices.push(rawPrices[rawPrices.length - 1] * Math.exp(r));

  const scale = currentPrice / rawPrices[rawPrices.length - 1];
  const scaledPrices = rawPrices.map(p => p * scale);

  // ── Build OHLCV bars ──
  const data: PriceData[] = [];
  for (let i = 0; i < periods; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (periods - 1 - i) * daysPerPeriod);

    const openPrice  = scaledPrices[i];
    const closePrice = scaledPrices[i + 1];
    const intradayVol = baseVol * 0.5;
    const high = Math.max(openPrice, closePrice) * (1 + Math.abs(randn()) * intradayVol * 0.4);
    const low  = Math.min(openPrice, closePrice) * Math.max(1 - Math.abs(randn()) * intradayVol * 0.4, 0.01);

    // Volume spikes on high-move days (common in thin markets)
    const dailyMovePct = Math.abs(closePrice - openPrice) / openPrice;
    const volMultiplier = Math.min(1 + dailyMovePct / baseVol, 5);
    const volume = Math.floor((rand() * 600_000 + 80_000) * volMultiplier);

    data.push({
      date:   date.toISOString().split('T')[0],
      open:   Math.round(openPrice  * 100) / 100,
      high:   Math.round(high       * 100) / 100,
      low:    Math.max(Math.round(low * 100) / 100, 0.01),
      close:  Math.round(closePrice * 100) / 100,
      volume,
    });
  }

  return data;
}

// Get historical data for a stock
export async function getHistoricalData(
  ticker: string,
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'
): Promise<PriceData[]> {
  const prices = await fetchCurrentPrices();
  const currentPrice = prices[ticker]?.currentPrice || 0;
  
  if (currentPrice === 0) {
    return [];
  }
  
  return generateHistoricalData(ticker, currentPrice, timeframe);
}

// Force refresh prices (for manual updates / cron job)
// Clears Redis + in-memory cache so the next fetchCurrentPrices call
// scrapes fresh data from African Financials.
export async function refreshPrices(): Promise<void> {
  await invalidatePriceCache();
  priceCache = null;
  lastUpdate = null;
  await fetchCurrentPrices();
}
