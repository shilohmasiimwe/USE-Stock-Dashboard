import { NewsArticle, DividendAnnouncement, SentimentSummary, USE_STOCKS } from '@/types/stock';
import {
  getCachedDividends,
  getCachedNews,
  setCachedDividends,
  setCachedNews,
} from './redis';
import { extractWithScrapeGraph } from './scrapeGraphAi';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface NewsSource {
  name: string;
  rssUrl?: string;
  webUrl: string;
}

interface RawArticle {
  url: string;
  title: string;
  publishedAt?: string;
  summary?: string;
}

type RawDividend = {
  ticker: string;
  type: string;
  amount: number;
  currency: string;
  exDate: string;
  recDate: string;
  payDate: string;
  status: string;
  year: number;
};

type ExtractedDividend = {
  ticker?: string;
  company?: string;
  type?: string;
  amount?: number | string | null;
  currency?: string;
  exDividendDate?: string;
  recordDate?: string;
  paymentDate?: string;
  status?: string;
  year?: number | string;
};

type ExtractedDividendsPayload = {
  dividends?: ExtractedDividend[];
};

// ──────────────────────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────────────────────

const MAX_ARTICLE_AGE_DAYS = 30;
const NEWS_CACHE_TTL_HOURS = 4;
const DIV_CACHE_TTL_HOURS  = 24;
const abortSignalWithTimeout = AbortSignal as typeof AbortSignal & {
  timeout?: (milliseconds: number) => AbortSignal;
};

// RSS feeds are preferred — structured XML designed for machine consumption.
// HTML scraping is used as a fallback when the RSS feed is unavailable.
// Sources ordered by financial relevance to USE-listed companies.
const NEWS_SOURCES: NewsSource[] = [
  // Uganda-specific financial & general news
  { name: 'Daily Monitor',       rssUrl: 'https://www.monitor.co.ug/business/markets/rss',       webUrl: 'https://www.monitor.co.ug/business/markets' },
  { name: 'New Vision',          rssUrl: 'https://www.newvision.co.ug/feed',                      webUrl: 'https://www.newvision.co.ug/category/business' },
  { name: 'Nile Post',           rssUrl: 'https://nilepost.co.ug/feed',                           webUrl: 'https://nilepost.co.ug/businesses' },
  { name: 'The Observer',        rssUrl: 'https://observer.ug/feed',                              webUrl: 'https://observer.ug/business' },
  { name: 'Chimp Reports',       rssUrl: 'https://chimpreports.com/feed',                         webUrl: 'https://chimpreports.com/category/business' },
  // East Africa regional financial press
  { name: 'The East African',    rssUrl: 'https://www.theeastafrican.co.ke/tea/business/rss',     webUrl: 'https://www.theeastafrican.co.ke/tea/business' },
  { name: 'Business Daily',      rssUrl: 'https://www.businessdailyafrica.com/bd/markets/rss',    webUrl: 'https://www.businessdailyafrica.com/bd/markets' },
  { name: 'Nation Africa',       rssUrl: 'https://nation.africa/kenya/business/rss',              webUrl: 'https://nation.africa/kenya/business' },
  // USE & regulator announcements (HTML scrape — no RSS)
  { name: 'USE Announcements',   webUrl: 'https://www.use.or.ug/content/news' },
  { name: 'CMA Uganda',          webUrl: 'https://www.cmauganda.co.ug/news' },
];

const DIVIDEND_URLS = [
  'https://www.use.or.ug/content/dividends-announcements',
  'https://africanfinancials.com/uganda-securities-exchange-dividends/',
];

const DIVIDEND_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    dividends: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ticker: { type: 'string' },
          company: { type: 'string' },
          type: { type: 'string', enum: ['interim', 'final', 'special', 'unknown'] },
          amount: { type: ['number', 'null'] },
          currency: { type: 'string', enum: ['UGX', 'KES', 'USD', 'UNKNOWN'] },
          exDividendDate: { type: 'string' },
          recordDate: { type: 'string' },
          paymentDate: { type: 'string' },
          status: { type: 'string', enum: ['announced', 'paid', 'upcoming', 'unknown'] },
          year: { type: ['number', 'null'] },
        },
      },
    },
  },
} as const;

const COMPANY_ALIASES: Record<string, string[]> = {
  MTN:   ['mtn uganda', 'mtn group', 'mtn mobile money', 'momo uganda'],
  AIRTL: ['airtel uganda', 'airtel africa', 'airtel money'],
  SBU:   ['stanbic bank', 'stanbic uganda', 'stanbic bank uganda'],
  DFCU:  ['dfcu bank', 'dfcu group', 'dfcu limited'],
  BOBU:  ['bank of baroda', 'bank of baroda uganda', 'baroda uganda'],
  EBU:   ['equity bank uganda', 'equity bank limited', 'equity group uganda'],
  UCL:   ['uganda clays', 'uganda clays limited'],
  // NOTE: 'new vision' intentionally excluded — matches every New Vision newspaper article.
  // Use company-specific identifiers only.
  NVU:   ['new vision printing', 'vision group plc', 'new vision group', 'nvpu'],
  NIC:   ['national insurance corporation', 'nic holdings', 'nic uganda'],
  BATU:  ['bat uganda', 'british american tobacco uganda', 'batu limited'],
  UMEME: ['umeme limited', 'umeme electricity', 'umeme distribution'],
  QCIL:  ['quality chemicals', 'quality chemical industries', 'qcil uganda'],
};

const POSITIVE_WORDS = [
  'growth', 'profit', 'surge', 'rise', 'gain', 'record', 'award', 'expands', 'approval',
  'dividend', 'strong', 'beat', 'exceed', 'milestone', 'upgrade', 'launch', 'invest',
  'partnership', 'contract', 'revenue', 'improvement', 'increase', 'positive', 'robust',
  'momentum', 'recovery', 'bullish', 'outperform', 'acquisition', 'expansion', 'profit',
  'earnings', 'rally', 'boost', 'soar', 'jump', 'climb', 'advance', 'high', 'best',
];

const NEGATIVE_WORDS = [
  'decline', 'loss', 'drop', 'fall', 'penalty', 'lawsuit', 'probe', 'cut', 'shutdown',
  'fraud', 'investigation', 'miss', 'downgrade', 'debt', 'default', 'breach', 'fine',
  'regulatory', 'sanction', 'crisis', 'layoff', 'redundancy', 'write-off', 'impairment',
  'bearish', 'underperform', 'warning', 'risk', 'concern', 'weak', 'pressure', 'slump',
  'crash', 'plunge', 'sink', 'tumble', 'retreat', 'low', 'worst', 'negative',
];

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const normalize = (v: string) =>
  v.toLowerCase()
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&nbsp;/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim();

const stripTags = (v: string) =>
  v.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const decodeCDATA = (v: string) =>
  v.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, c: string) => c).trim();

const decodeEntities = (v: string) =>
  v.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
   .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&nbsp;/gi, ' ');

const hashId = (v: string) => {
  let h = 0;
  for (let i = 0; i < v.length; i++) { h = (h << 5) - h + v.charCodeAt(i); h |= 0; }
  return Math.abs(h).toString(16);
};

const isWithinDays = (isoDate: string, days: number) => {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() <= days * 86_400_000;
};

const scoreSentiment = (text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } => {
  const n = normalize(text);
  let score = 0;
  for (const w of POSITIVE_WORDS) if (n.includes(w)) score++;
  for (const w of NEGATIVE_WORDS) if (n.includes(w)) score--;
  if (score > 0) return { sentiment: 'positive', score: Math.min(0.95, 0.4 + score * 0.1) };
  if (score < 0) return { sentiment: 'negative', score: Math.max(-0.95, -0.4 + score * 0.1) };
  return { sentiment: 'neutral', score: 0 };
};

const matchTicker = (title: string, summary = ''): string[] => {
  const haystack = normalize(`${title} ${summary}`);
  return USE_STOCKS
    .filter(s => (COMPANY_ALIASES[s.ticker] ?? [s.name]).some(a => haystack.includes(normalize(a))))
    .map(s => s.ticker);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isExtractedDividendsPayload = (value: unknown): value is ExtractedDividendsPayload =>
  isRecord(value) && (value.dividends === undefined || Array.isArray(value.dividends));

const coerceDate = (value: string | undefined) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];

  const parts = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  return parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : trimmed;
};

const normalizeDividendType = (value: string | undefined): RawDividend['type'] => {
  const normalizedType = normalize(value ?? '');
  if (normalizedType.includes('interim')) return 'interim';
  if (normalizedType.includes('special')) return 'special';
  return 'final';
};

const normalizeDividendStatus = (value: string | undefined): RawDividend['status'] => {
  const normalizedStatus = normalize(value ?? '');
  if (normalizedStatus.includes('paid')) return 'paid';
  if (normalizedStatus.includes('upcoming')) return 'upcoming';
  return 'announced';
};

const normalizeDividendCurrency = (value: string | undefined) => {
  const currency = (value ?? 'UGX').toUpperCase();
  return ['UGX', 'KES', 'USD'].includes(currency) ? currency : 'UGX';
};

async function extractDividendsWithScrapeGraph(sourceUrl: string): Promise<RawDividend[]> {
  const extraction = await extractWithScrapeGraph<ExtractedDividendsPayload>({
    url: sourceUrl,
    prompt: 'Extract dividend announcements for Uganda Securities Exchange listed companies. Return ticker, company, dividend type, amount per share, currency, ex-dividend date, record date, payment date, status, and dividend year. Use ISO YYYY-MM-DD dates where possible.',
    outputSchema: DIVIDEND_EXTRACTION_SCHEMA,
    fetchConfig: {
      mode: 'auto',
      wait: 3000,
      timeout: 12000,
    },
    validate: isExtractedDividendsPayload,
  });

  if (!extraction.ok) {
    console.warn(`[newsScraper] ScrapeGraphAI dividend fallback skipped for ${sourceUrl}: ${extraction.error}`);
    return [];
  }

  return (extraction.data.dividends ?? []).flatMap((dividend): RawDividend[] => {
    const ticker = dividend.ticker?.toUpperCase();
    if (!ticker || !USE_STOCKS.some(stock => stock.ticker === ticker)) return [];

    const amount = typeof dividend.amount === 'number'
      ? dividend.amount
      : Number.parseFloat(String(dividend.amount ?? '').replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) return [];

    const exDate = coerceDate(dividend.exDividendDate);
    const recDate = coerceDate(dividend.recordDate);
    const payDate = coerceDate(dividend.paymentDate);
    const parsedYear = Number(dividend.year);
    const year = Number.isFinite(parsedYear)
      ? parsedYear
      : new Date(exDate || recDate || payDate || Date.now()).getFullYear();

    return [{
      ticker,
      type: normalizeDividendType(dividend.type),
      amount,
      currency: normalizeDividendCurrency(dividend.currency),
      exDate,
      recDate,
      payDate,
      status: normalizeDividendStatus(dividend.status),
      year,
    }];
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// RSS parser — pure regex, no external library needed
// ──────────────────────────────────────────────────────────────────────────────

function parseRSSItems(xml: string): RawArticle[] {
  const results: RawArticle[] = [];
  for (const match of xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)) {
    const block = match[1];

    const rawTitle = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
    const rawLink  = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]
                  ?? block.match(/<guid[^>]*isPermaLink=["']true["'][^>]*>([\s\S]*?)<\/guid>/i)?.[1]
                  ?? '';
    const rawDate  = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]
                  ?? block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1]
                  ?? '';
    const rawDesc  = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]
                  ?? block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1]
                  ?? '';

    const title       = decodeEntities(stripTags(decodeCDATA(rawTitle))).trim();
    const url         = decodeEntities(stripTags(decodeCDATA(rawLink))).trim();
    const publishedAt = rawDate.trim() ? (() => { try { return new Date(rawDate.trim()).toISOString(); } catch { return undefined; } })() : undefined;
    const summary     = stripTags(decodeCDATA(rawDesc)).slice(0, 500).trim();

    if (!title || title.length < 12 || !url || url.startsWith('#')) continue;
    results.push({ title, url, publishedAt, summary });
  }
  return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// HTML fallback parser
// ──────────────────────────────────────────────────────────────────────────────

function parseHTMLArticles(html: string, baseUrl: string): RawArticle[] {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const results: RawArticle[] = [];

  for (const block of (clean.match(/<article[\s\S]*?<\/article>/gi) ?? [])) {
    const linkM = block.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkM) continue;
    const title = stripTags(linkM[2]).trim();
    if (!title || title.length < 18) continue;
    const pubM = block.match(/<time[^>]*datetime=["']([^"']+)["']/i);
    try { results.push({ url: new URL(linkM[1], baseUrl).href, title, publishedAt: pubM?.[1] }); } catch { /* skip */ }
  }

  if (results.length < 3) {
    for (const [, href, inner] of clean.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      const title = stripTags(inner).trim();
      if (!title || title.length < 20) continue;
      try { results.push({ url: new URL(href, baseUrl).href, title }); } catch { /* skip */ }
    }
  }
  return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// Dividend HTML parser
// ──────────────────────────────────────────────────────────────────────────────

function parseDividendHtml(html: string) {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const results: RawDividend[] = [];

  for (const row of (clean.match(/<tr[\s\S]*?<\/tr>/gi) ?? [])) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m => stripTags(m[1]).trim());
    if (cells.length < 4) continue;

    const rowText = cells.join(' ');
    const ticker  = USE_STOCKS.find(s =>
      (COMPANY_ALIASES[s.ticker] ?? [s.name]).some(a => normalize(rowText).includes(normalize(a)))
    )?.ticker;
    if (!ticker) continue;

    const amtCell = cells.find(c => /^\d[\d,]*(\.\d+)?$/.test(c.replace(/ugx|kes|usd/gi, '').trim()));
    if (!amtCell) continue;
    const amount = parseFloat(amtCell.replace(/,/g, ''));

    const datePattern = /\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4}/g;
    const dates = cells.flatMap(c => c.match(datePattern) ?? []).map(d => {
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(d)) { const p = d.split(/[-/]/); return `${p[2]}-${p[1]}-${p[0]}`; }
      return d;
    });

    const lower  = rowText.toLowerCase();
    const type   = lower.includes('interim') ? 'interim' : lower.includes('special') ? 'special' : 'final';
    const status = lower.includes('paid') ? 'paid' : lower.includes('upcoming') ? 'upcoming' : 'announced';
    const year   = dates[0] ? new Date(dates[0]).getFullYear() : new Date().getFullYear();

    results.push({ ticker, type, amount, currency: 'UGX', exDate: dates[0] ?? '', recDate: dates[1] ?? '', payDate: dates[2] ?? '', status, year });
  }
  return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// Cache
// ──────────────────────────────────────────────────────────────────────────────

let newsCache:    Record<string, NewsArticle[]>          = {};
let dividendCache: Record<string, DividendAnnouncement[]> = {};
let lastNewsUpdate: Date | null = null;
let lastDivUpdate:  Date | null = null;

export const getSentimentForNews   = buildSentiment;

export function isNewsCacheFresh(maxHours = NEWS_CACHE_TTL_HOURS) {
  return !!lastNewsUpdate && (Date.now() - lastNewsUpdate.getTime()) / 3_600_000 < maxHours;
}
export function isDividendCacheFresh(maxHours = DIV_CACHE_TTL_HOURS) {
  return !!lastDivUpdate && (Date.now() - lastDivUpdate.getTime()) / 3_600_000 < maxHours;
}

interface NewsCacheSnapshot {
  updatedAt: string;
  byTicker: Record<string, NewsArticle[]>;
}

interface DividendCacheSnapshot {
  updatedAt: string;
  byTicker: Record<string, DividendAnnouncement[]>;
}

async function loadNewsCacheFromRedis() {
  const cached = await getCachedNews<NewsCacheSnapshot>();
  if (!cached?.updatedAt || !cached.byTicker) return;

  newsCache = cached.byTicker;
  lastNewsUpdate = new Date(cached.updatedAt);
}

async function loadDividendCacheFromRedis() {
  const cached = await getCachedDividends<DividendCacheSnapshot>();
  if (!cached?.updatedAt || !cached.byTicker) return;

  dividendCache = cached.byTicker;
  lastDivUpdate = new Date(cached.updatedAt);
}

export async function getNewsForTicker(ticker: string): Promise<NewsArticle[]> {
  if (!newsCache[ticker]?.length) {
    await loadNewsCacheFromRedis();
  }

  return newsCache[ticker] ?? [];
}

export async function getDividendsForTicker(ticker: string): Promise<DividendAnnouncement[]> {
  if (!dividendCache[ticker]?.length) {
    await loadDividendCacheFromRedis();
  }

  return dividendCache[ticker] ?? [];
}

// ──────────────────────────────────────────────────────────────────────────────
// Sentiment aggregator
// ──────────────────────────────────────────────────────────────────────────────

function buildSentiment(news: NewsArticle[]): SentimentSummary {
  if (!news.length) return { overallSentiment: 'neutral', averageScore: 0, positiveCount: 0, negativeCount: 0, neutralCount: 0, totalArticles: 0, confidence: 0 };
  const positiveCount = news.filter(n => n.sentiment === 'positive').length;
  const negativeCount = news.filter(n => n.sentiment === 'negative').length;
  const neutralCount  = news.filter(n => n.sentiment === 'neutral').length;
  const averageScore  = news.reduce((s, n) => s + n.sentimentScore, 0) / news.length;
  const overallSentiment: 'bullish' | 'bearish' | 'neutral' =
    averageScore > 0.15 ? 'bullish' : averageScore < -0.15 ? 'bearish' : 'neutral';
  return { overallSentiment, averageScore, positiveCount, negativeCount, neutralCount, totalArticles: news.length, confidence: Math.abs(averageScore) * 100 };
}

// ──────────────────────────────────────────────────────────────────────────────
// Fetch options
// ──────────────────────────────────────────────────────────────────────────────

const FETCH_OPTS: RequestInit = {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
  // 4 s timeout per source — keeps background scrapes well under Vercel limits
  ...(typeof AbortSignal !== 'undefined' && typeof abortSignalWithTimeout.timeout === 'function'
    ? { signal: abortSignalWithTimeout.timeout(4_000) }
    : {}),
};

// ──────────────────────────────────────────────────────────────────────────────
// News refresh
// ──────────────────────────────────────────────────────────────────────────────

export async function refreshNews(): Promise<Record<string, NewsArticle[]>> {
  const byTicker: Record<string, NewsArticle[]> = Object.fromEntries(USE_STOCKS.map(s => [s.ticker, []]));

  await Promise.allSettled(
    NEWS_SOURCES.map(async source => {
      let rawArticles: RawArticle[] = [];

      // 1. Try RSS
      if (source.rssUrl) {
        try {
          const res = await fetch(source.rssUrl, FETCH_OPTS);
          if (res.ok) rawArticles = parseRSSItems(await res.text());
        } catch { /* fall through */ }
      }

      // 2. HTML fallback
      if (rawArticles.length === 0) {
        try {
          const res = await fetch(source.webUrl, FETCH_OPTS);
          if (res.ok) rawArticles = parseHTMLArticles(await res.text(), source.webUrl);
        } catch { /* skip source entirely */ }
      }

      for (const raw of rawArticles) {
        if (!raw.url || !raw.title || raw.title.length < 12) continue;
        if (raw.publishedAt && !isWithinDays(raw.publishedAt, MAX_ARTICLE_AGE_DAYS)) continue;

        const tickers = matchTicker(raw.title, raw.summary ?? '');
        if (!tickers.length) continue;

        const { sentiment, score } = scoreSentiment(raw.title + ' ' + (raw.summary ?? ''));
        const article: NewsArticle = {
          id:             hashId(raw.url),
          title:          raw.title,
          summary:        raw.summary ?? '',
          source:         source.name,
          publishedAt:    raw.publishedAt ?? new Date().toISOString(),
          url:            raw.url,
          sentiment,
          sentimentScore: score,
        };

        for (const t of tickers) {
          if (!byTicker[t].some(a => a.id === article.id)) byTicker[t].push(article);
        }
      }
    })
  );

  // Sort newest-first
  for (const t of Object.keys(byTicker)) {
    byTicker[t].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  newsCache      = byTicker;
  lastNewsUpdate = new Date();
  await setCachedNews({
    updatedAt: lastNewsUpdate.toISOString(),
    byTicker: newsCache,
  });
  return newsCache;
}

// ──────────────────────────────────────────────────────────────────────────────
// Dividend refresh
// ──────────────────────────────────────────────────────────────────────────────

export async function refreshDividends(): Promise<Record<string, DividendAnnouncement[]>> {
  const byTicker: Record<string, DividendAnnouncement[]> = Object.fromEntries(USE_STOCKS.map(s => [s.ticker, []]));
  let found = 0;

  for (const url of DIVIDEND_URLS) {
    try {
      const res = await fetch(url, FETCH_OPTS);
      if (!res.ok) continue;
      const html = await res.text();
      const parsedDividends = parseDividendHtml(html);
      const dividends = parsedDividends.length > 0
        ? parsedDividends
        : await extractDividendsWithScrapeGraph(url);

      for (const d of dividends) {
        const div: DividendAnnouncement = {
          id:             hashId(`${d.ticker}-${d.exDate}-${d.amount}`),
          type:           d.type as 'interim' | 'final' | 'special',
          amount:         d.amount,
          currency:       d.currency,
          exDividendDate: d.exDate,
          recordDate:     d.recDate,
          paymentDate:    d.payDate,
          status:         d.status as 'announced' | 'paid' | 'upcoming',
          year:           d.year,
        };
        if (!byTicker[d.ticker].some(x => x.id === div.id)) { byTicker[d.ticker].push(div); found++; }
      }
    } catch (err) {
      console.error(`[newsScraper] Dividend scrape failed for ${url}:`, err);
    }
  }

  if (found > 0) {
    dividendCache = byTicker;
    lastDivUpdate = new Date();
    await setCachedDividends({
      updatedAt: lastDivUpdate.toISOString(),
      byTicker: dividendCache,
    });
    return dividendCache;
  }

  if (Object.keys(dividendCache).length === 0) {
    await loadDividendCacheFromRedis();
  }

  return dividendCache;
}
