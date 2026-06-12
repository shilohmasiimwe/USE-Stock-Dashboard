import { USE_STOCKS, FinancialDocument, FinancialFigure } from '@/types/stock';
import { getCachedFinancials, setCachedFinancials } from './redis';
import { extractWithScrapeGraph } from './scrapeGraphAi';

export interface FinancialsSnapshot {
  updatedAt: string;
  sourceUrl: string;
  byTicker: Record<string, FinancialDocument[]>;
  missingTickers: string[];
}

const SOURCE_URL = 'https://africanfinancials.com/uganda-listed-company-documents/';
const MAX_PAGES = 6;
const FINANCIALS_CACHE_TTL_HOURS = 24;
const abortSignalWithTimeout = AbortSignal as typeof AbortSignal & {
  timeout?: (milliseconds: number) => AbortSignal;
};

const createFetchOptions = (timeoutMs: number): RequestInit => ({
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
  ...(typeof AbortSignal !== 'undefined' && typeof abortSignalWithTimeout.timeout === 'function'
    ? { signal: abortSignalWithTimeout.timeout(timeoutMs) }
    : {}),
});

const AFRICAN_TICKER_MAP: Record<string, string> = {
  MTN: 'MTN',
  AIRT: 'AIRTL',
  AIRTL: 'AIRTL',
  SBU: 'SBU',
  DFCU: 'DFCU',
  BOBU: 'BOBU',
  EBL: 'EBU',
  EQTY: 'EBU',
  UCL: 'UCL',
  NVL: 'NVU',
  NIC: 'NIC',
  BATU: 'BATU',
  UMEME: 'UMEME',
  QCIL: 'QCIL',
};

const COMPANY_ALIASES: Record<string, string[]> = {
  MTN: ['mtn', 'mtn uganda', 'mtn uganda limited'],
  AIRTL: ['airtel', 'airtel uganda', 'airtel uganda limited'],
  SBU: ['stanbic', 'stanbic bank uganda', 'stanbic bank'],
  DFCU: ['dfcu', 'dfcu bank', 'dfcu bank limited'],
  BOBU: ['baroda', 'bank of baroda', 'bank of baroda uganda'],
  EBU: ['equity bank', 'equity bank uganda', 'equity bank limited', 'equity group'],
  UCL: ['uganda clays', 'uganda clays limited'],
  NVU: ['new vision', 'new vision printing and publishing', 'new vision printing and publishing company ltd'],
  NIC: ['national insurance', 'national insurance corporation', 'nic holdings'],
  BATU: ['bat uganda', 'british american tobacco uganda', 'british american tobacco'],
  UMEME: ['umeme', 'umeme limited'],
  QCIL: ['quality chemicals', 'quality chemicals industries', 'quality chemicals industries ltd', 'qcil'],
};

type ExtractedFinancialDocument = {
  ticker?: string;
  company?: string;
  title?: string;
  url?: string;
  documentType?: string;
  publishedAt?: string;
  year?: number | string;
  period?: string;
  sector?: string;
  summary?: string;
  figures?: Array<{
    label?: string;
    value?: number | string | null;
    currency?: string;
    unit?: string;
    raw?: string;
  }>;
};

type ExtractedFinancialsPayload = {
  documents?: ExtractedFinancialDocument[];
};

const FIGURES_SCHEMA_ITEM = {
  type: 'object',
  properties: {
    label:    { type: 'string' },
    value:    { type: ['number', 'null'] },
    currency: { type: 'string' },
    unit:     { type: 'string' },
    raw:      { type: 'string' },
  },
} as const;

const FINANCIALS_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    documents: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ticker:       { type: 'string' },
          company:      { type: 'string' },
          title:        { type: 'string' },
          url:          { type: 'string' },
          documentType: { type: 'string' },
          publishedAt:  { type: 'string' },
          year:         { type: ['number', 'null'] },
          period:       { type: 'string' },
          sector:       { type: 'string' },
          summary:      { type: 'string' },
          figures:      { type: 'array', items: FIGURES_SCHEMA_ITEM },
        },
      },
    },
  },
} as const;

// Schema used when fetching an individual document detail page on African Financials.
// Targets the complete income statement / P&L breakdown.
const IS_DETAIL_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    year:    { type: ['number', 'null'] },
    period:  { type: 'string' },
    figures: { type: 'array', items: FIGURES_SCHEMA_ITEM },
  },
} as const;

type ISDetailPayload = {
  year?: number | null;
  period?: string;
  figures?: Array<{
    label?: string;
    value?: number | string | null;
    currency?: string;
    unit?: string;
    raw?: string;
  }>;
};

const isISDetailPayload = (v: unknown): v is ISDetailPayload =>
  typeof v === 'object' && v !== null;

// Fetch an individual African Financials document page and extract detailed P&L figures.
// Only called for URLs that live on africanfinancials.com (not external PDFs).
async function fetchDocumentDetails(docUrl: string): Promise<FinancialFigure[]> {
  if (!docUrl.includes('africanfinancials.com') || docUrl.endsWith('.pdf')) return [];

  let html = '';
  try {
    const res = await fetch(docUrl, createFetchOptions(8_000));
    if (res.ok) html = await res.text();
  } catch { /* fall through to ScrapeGraphAI stealth */ }

  // 1. HTML-based extraction (when plain fetch succeeds)
  let htmlFigures: FinancialFigure[] = [];
  if (html) {
    const clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ');
    const text = stripTags(clean).replace(/\s+/g, ' ');
    htmlFigures = parseFigures(text);
    if (htmlFigures.length >= 2) return htmlFigures;
  }

  // 2. ScrapeGraphAI with stealth — African Financials is Cloudflare-protected
  const extraction = await extractWithScrapeGraph<ISDetailPayload>({
    url: docUrl,
    prompt:
      'Extract the complete income statement (profit & loss) from this financial document page. ' +
      'Return every line item you find: Total Revenue/Turnover, Cost of Sales/Revenue, Gross Profit, ' +
      'Operating Expenses, Depreciation & Amortisation, Operating Profit/EBIT, Finance Income, ' +
      'Finance Costs/Interest Expense, Profit Before Tax, Income Tax, Net Profit/PAT, ' +
      'Dividends Paid, Retained Earnings. ' +
      'For each item provide: label (exact name used on the page), value (number), ' +
      'currency (UGX/KES/USD), unit (million/billion/trillion), and the raw text snippet.',
    outputSchema: IS_DETAIL_EXTRACTION_SCHEMA,
    fetchConfig: { stealth: true, mode: 'js', wait: 3000, timeout: 15000 },
    validate: isISDetailPayload,
  });

  if (!extraction.ok) return htmlFigures;

  return (extraction.data.figures ?? []).flatMap((f): FinancialFigure[] => {
    if (!f.label) return [];
    const raw = typeof f.value === 'string' ? f.value : String(f.value ?? '');
    const value = Number.parseFloat(raw.replace(/,/g, ''));
    return [{
      label: f.label,
      value: Number.isFinite(value) ? value : null,
      currency: f.currency,
      unit: f.unit,
      raw: f.raw ?? `${f.label}: ${f.value ?? ''}`.trim(),
    }];
  });
}

let financialsCache: FinancialsSnapshot | null = null;
let lastUpdate: Date | null = null;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

const stripTags = (value: string) =>
  decodeEntities(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isExtractedFinancialsPayload = (value: unknown): value is ExtractedFinancialsPayload =>
  isRecord(value) && (value.documents === undefined || Array.isArray(value.documents));

const isFresh = (maxHours = FINANCIALS_CACHE_TTL_HOURS) =>
  !!lastUpdate && (Date.now() - lastUpdate.getTime()) / 3_600_000 < maxHours;

const mapTicker = (sourceTicker: string | undefined, companyName: string) => {
  if (sourceTicker) {
    const mapped = AFRICAN_TICKER_MAP[sourceTicker.toUpperCase()];
    if (mapped) return mapped;
  }

  const normalizedCompany = normalize(companyName);
  for (const stock of USE_STOCKS) {
    const aliases = COMPANY_ALIASES[stock.ticker] ?? [stock.name];
    if (aliases.some(a => normalize(a) === normalizedCompany || normalizedCompany.includes(normalize(a)))) {
      return stock.ticker;
    }
  }

  return null;
};

const parsePublishedDate = (value: string | undefined) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const CURRENCY_RE = /Ushs?|Shs|UGX|Kshs|KES|USD/i;
const UNIT_RE = /trillion|billion|million|bn|m\b(?!\w)/i;

function normCurrency(raw: string | undefined) {
  if (!raw) return undefined;
  return raw.toUpperCase().replace(/^USHS?$/, 'UGX').replace(/^SHS$/, 'UGX');
}

function parseFigures(summary: string): FinancialFigure[] {
  const results: FinancialFigure[] = [];
  const seen = new Set<string>();

  // Pattern 1 — "Label: [currency] value [unit]"
  const colonPattern = /([A-Za-z][A-Za-z \-()\/]{2,50}):\s*(Ushs?|Shs|UGX|Kshs|KES|USD)?\s*([\d,.]+)\s*(trillion|billion|million|bn|m\b)?/gi;
  for (const m of summary.matchAll(colonPattern)) {
    const label = m[1].trim();
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const rawValue = m[3]?.replace(/,/g, '');
    const value = rawValue ? Number.parseFloat(rawValue) : null;
    results.push({
      label,
      value: Number.isFinite(value as number) ? (value as number) : null,
      currency: normCurrency(m[2]?.trim()),
      unit: m[4]?.toLowerCase(),
      raw: m[0].trim(),
    });
  }

  // Pattern 2 — "Label of [currency] value [unit]" or "Label grew/rose to [currency] value [unit]"
  const prosePattern = /([A-Za-z][A-Za-z \-()\/]{2,50})\s+(?:of|to|at|was|totalled?|reached|grew to|rose to)\s+(Ushs?|Shs|UGX|Kshs|KES|USD)?\s*([\d,.]+)\s*(trillion|billion|million|bn|m\b)?/gi;
  for (const m of summary.matchAll(prosePattern)) {
    const label = m[1].trim();
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    // Only accept if there is a numeric value with a known currency or unit
    if (!m[2] && !UNIT_RE.test(m[4] ?? '')) continue;
    seen.add(key);
    const rawValue = m[3]?.replace(/,/g, '');
    const value = rawValue ? Number.parseFloat(rawValue) : null;
    results.push({
      label,
      value: Number.isFinite(value as number) ? (value as number) : null,
      currency: normCurrency(m[2]?.trim()),
      unit: m[4]?.toLowerCase(),
      raw: m[0].trim(),
    });
  }

  // Pattern 3 — standalone "[currency] value [unit]" near a P&L keyword
  const plKeywords = /\b(revenue|turnover|profit|income|loss|expense|cost|earnings|ebit|pat|pbt|sales|dividend|tax)\b/i;
  const amountPattern = /(Ushs?|Shs|UGX|Kshs|KES|USD)\s*([\d,.]+)\s*(trillion|billion|million|bn|m\b)?/gi;
  for (const m of summary.matchAll(amountPattern)) {
    const start = m.index ?? 0;
    const context = summary.slice(Math.max(0, start - 60), start + m[0].length + 10);
    const labelMatch = context.match(/([A-Za-z][A-Za-z \-()\/]{2,40})\s*(?:of|:|was|to|at)?$/i);
    if (!labelMatch) continue;
    const label = labelMatch[1].trim();
    if (!plKeywords.test(label)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const rawValue = m[2]?.replace(/,/g, '');
    const value = rawValue ? Number.parseFloat(rawValue) : null;
    results.push({
      label,
      value: Number.isFinite(value as number) ? (value as number) : null,
      currency: normCurrency(m[1]),
      unit: m[3]?.toLowerCase(),
      raw: m[0].trim(),
    });
  }

  return results;
}

function extractDocumentBlocks(html: string): { title: string; url: string; block: string }[] {
  const matches = [...html.matchAll(/<h[23][^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h[23]>/gi)];
  if (matches.length === 0) return [];

  const results: { title: string; url: string; block: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const nextStart = matches[i + 1]?.index ?? html.length;
    const title = stripTags(match[2]);
    if (!/\([A-Z0-9]+\.ug\)/i.test(title)) continue;
    const url = match[1];
    const block = html.slice(end, nextStart);
    results.push({ title, url, block });
  }

  return results;
}

function extractDocumentsFromHtml(html: string): Omit<FinancialDocument, 'ticker'>[] {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const blocks = extractDocumentBlocks(clean);

  const results: Omit<FinancialDocument, 'ticker'>[] = [];

  const fallbackMatches =
    blocks.length === 0
      ? [...clean.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*\([A-Z0-9]+\.ug\)[^<]*)<\/a>/gi)]
      : [];

  if (blocks.length === 0) {
    for (const match of fallbackMatches) {
      const title = stripTags(match[2]);
      if (!/(report|presentation|circular|prospectus)/i.test(title)) continue;
      const url = match[1];
      const idx = match.index ?? 0;
      const block = clean.slice(idx, idx + 1200);
      blocks.push({ title, url, block });
    }
  }

  for (const { title, url, block } of blocks) {
    const sourceTicker = title.match(/\(([A-Z0-9]+)\.ug\)/i)?.[1]?.toUpperCase();
    const company = title.split('(')[0].trim();
    const text = stripTags(block);
    const [summaryRaw, metaRaw] = text.split(/Document type:/i);
    const summary = (summaryRaw || '').replace(/\s+/g, ' ').trim();

    const meta = metaRaw ?? '';
    const docType = meta.match(/^\s*([^P]+?)\s*Published:/i)?.[1]?.trim()
      ?? meta.match(/^\s*([^Y]+?)\s*Year:/i)?.[1]?.trim();
    const publishedRaw = meta.match(/Published:\s*([A-Za-z]{3}\s+\d{1,2},\s+\d{4})/i)?.[1];
    const year = meta.match(/Year:\s*(\d{4})/i)?.[1];
    const period = meta.match(/Period:\s*([A-Z0-9]+)/i)?.[1];
    const sector = meta.match(/Period:\s*[A-Z0-9]+\s*([A-Za-z &/]+)\s*\|\s*Uganda/i)?.[1]?.trim();

    results.push({
      company: company || 'Unknown',
      title,
      url,
      summary: summary.slice(0, 700),
      documentType: docType,
      publishedAt: parsePublishedDate(publishedRaw),
      year: year ? Number.parseInt(year, 10) : undefined,
      period,
      sector,
      figures: parseFigures(summary),
      source: 'AfricanFinancials',
      sourceTicker,
    });
  }

  return results;
}

async function extractDocumentsWithScrapeGraph(sourceUrl: string): Promise<Omit<FinancialDocument, 'ticker'>[]> {
  const extraction = await extractWithScrapeGraph<ExtractedFinancialsPayload>({
    url: sourceUrl,
    prompt: 'Extract Uganda-listed company financial documents. Return each document title, company, ticker if present, URL, document type, published date, year, period, sector, short summary, and any financial figures mentioned with label, value, currency, unit, and raw text.',
    outputSchema: FINANCIALS_EXTRACTION_SCHEMA,
    fetchConfig: {
      stealth: true,
      mode: 'js',
      wait: 3000,
      timeout: 15000,
    },
    validate: isExtractedFinancialsPayload,
  });

  if (!extraction.ok) {
    console.warn(`[financialsScraper] ScrapeGraphAI fallback skipped for ${sourceUrl}: ${extraction.error}`);
    return [];
  }

  return (extraction.data.documents ?? []).flatMap((doc): Omit<FinancialDocument, 'ticker'>[] => {
    if (!doc.title || !doc.url) return [];

    const year = Number(doc.year);
    const figures = (doc.figures ?? []).flatMap((figure): FinancialFigure[] => {
      if (!figure.label && !figure.raw) return [];
      const value = typeof figure.value === 'number'
        ? figure.value
        : Number.parseFloat(String(figure.value ?? '').replace(/,/g, ''));

      return [{
        label: figure.label ?? figure.raw ?? 'Figure',
        value: Number.isFinite(value) ? value : null,
        currency: figure.currency,
        unit: figure.unit,
        raw: figure.raw ?? `${figure.label ?? 'Figure'}: ${figure.value ?? ''}`.trim(),
      }];
    });

    return [{
      company: (doc.company ?? doc.title.split('(')[0].trim()) || 'Unknown',
      title: doc.title,
      url: doc.url,
      summary: (doc.summary ?? '').slice(0, 700),
      documentType: doc.documentType,
      publishedAt: parsePublishedDate(doc.publishedAt),
      year: Number.isFinite(year) ? year : undefined,
      period: doc.period,
      sector: doc.sector,
      figures,
      source: 'AfricanFinancials',
      sourceTicker: doc.ticker?.toUpperCase(),
    }];
  });
}

// Merge additional figures into a doc, preferring the richer set per label.
function mergeFigures(
  base: FinancialFigure[],
  extra: FinancialFigure[],
): FinancialFigure[] {
  const byLabel = new Map<string, FinancialFigure>();
  for (const f of base)  byLabel.set(f.label.toLowerCase(), f);
  for (const f of extra) {
    const key = f.label.toLowerCase();
    // Prefer the entry that has an actual numeric value
    if (!byLabel.has(key) || (f.value != null && byLabel.get(key)!.value == null)) {
      byLabel.set(key, f);
    }
  }
  return [...byLabel.values()];
}

async function fetchAllDocuments(): Promise<Omit<FinancialDocument, 'ticker'>[]> {
  const allDocs: Omit<FinancialDocument, 'ticker'>[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? SOURCE_URL : `${SOURCE_URL}page/${page}/`;

    // Try plain fetch first (no credit cost); fall through to ScrapeGraphAI stealth on 403
    let parsedDocs: Omit<FinancialDocument, 'ticker'>[] = [];
    try {
      const res = await fetch(url, createFetchOptions(8_000));
      if (res.ok) parsedDocs = extractDocumentsFromHtml(await res.text());
    } catch { /* fall through to ScrapeGraphAI stealth */ }

    const docs = parsedDocs.length > 0
      ? parsedDocs
      : await extractDocumentsWithScrapeGraph(url);
    let newCount = 0;

    for (const doc of docs) {
      if (!doc.url || seen.has(doc.url)) continue;
      seen.add(doc.url);
      allDocs.push(doc);
      newCount++;
    }

    if (docs.length === 0 || newCount === 0) break;
  }

  // Enrich documents that link to an African Financials detail page by fetching
  // the full P&L breakdown from that page (the listing summary is often sparse).
  // Run in parallel with a concurrency cap so we don't hammer the server.
  const BATCH = 6;
  for (let i = 0; i < allDocs.length; i += BATCH) {
    await Promise.allSettled(
      allDocs.slice(i, i + BATCH).map(async (doc) => {
        if (!doc.url.includes('africanfinancials.com') || doc.url.endsWith('.pdf')) return;
        // Skip if listing already gave us ≥3 P&L figures
        if (doc.figures.length >= 3) return;
        try {
          const extra = await fetchDocumentDetails(doc.url);
          if (extra.length > 0) doc.figures = mergeFigures(doc.figures, extra);
        } catch { /* best-effort — leave base figures unchanged */ }
      })
    );
  }

  return allDocs;
}

export async function refreshFinancials(): Promise<FinancialsSnapshot> {
  const byTicker: Record<string, FinancialDocument[]> = Object.fromEntries(
    USE_STOCKS.map(s => [s.ticker, []])
  );

  const docs = await fetchAllDocuments();
  if (docs.length === 0) {
    throw new Error('No financial documents parsed from African Financials');
  }

  for (const doc of docs) {
    const mappedTicker = mapTicker(doc.sourceTicker, doc.company);
    if (!mappedTicker) continue;
    byTicker[mappedTicker].push({ ...doc, ticker: mappedTicker });
  }

  for (const t of Object.keys(byTicker)) {
    byTicker[t].sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  const missingTickers = USE_STOCKS
    .map(s => s.ticker)
    .filter(t => byTicker[t].length === 0);

  const snapshot: FinancialsSnapshot = {
    updatedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    byTicker,
    missingTickers,
  };

  financialsCache = snapshot;
  lastUpdate = new Date();

  await setCachedFinancials(snapshot);
  return snapshot;
}

export async function getFinancialsSnapshot(): Promise<FinancialsSnapshot | null> {
  if (financialsCache && isFresh()) return financialsCache;

  const cached = await getCachedFinancials<FinancialsSnapshot>();
  if (cached?.updatedAt) {
    financialsCache = cached;
    lastUpdate = new Date(cached.updatedAt);
  }

  if (financialsCache && isFresh()) return financialsCache;

  try {
    return await refreshFinancials();
  } catch (err) {
    console.error('[financialsScraper] Refresh failed:', err);
    return financialsCache;
  }
}

export async function getFinancialsForTicker(ticker: string): Promise<FinancialDocument[]> {
  const snapshot = await getFinancialsSnapshot();
  return snapshot?.byTicker?.[ticker] ?? [];
}

export function isFinancialsCacheFresh(maxHours = FINANCIALS_CACHE_TTL_HOURS) {
  return isFresh(maxHours);
}
