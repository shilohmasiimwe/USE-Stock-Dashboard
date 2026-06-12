import { NextRequest, NextResponse } from 'next/server';
import { getStockDataSync } from '@/lib/mockData';
import { fetchCurrentPrices } from '@/lib/dataFetcher';
import { getFinancialsSnapshot } from '@/lib/financialsScraper';
import { buildIncomeStatement } from '@/lib/incomeStatementParser';
import { StockMetrics } from '@/types/stock';
import {
  getNewsForTicker,
  getDividendsForTicker,
  getSentimentForNews,
  isNewsCacheFresh,
  isDividendCacheFresh,
  refreshNews,
  refreshDividends,
} from '@/lib/newsScraper';

function deriveDividendYield(currentPrice: number, dividends: Array<{ amount: number; year: number }>) {
  if (currentPrice <= 0 || dividends.length === 0) return null;

  const latestYear = Math.max(...dividends.map((dividend) => dividend.year));
  const annualTotal = dividends
    .filter((dividend) => dividend.year === latestYear)
    .reduce((sum, dividend) => sum + dividend.amount, 0);

  if (annualTotal <= 0) return null;
  return Number(((annualTotal / currentPrice) * 100).toFixed(1));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker symbol is required' }, { status: 400 });
  }

  const upper = ticker.toUpperCase();

  // Only await the price fetch — it uses Redis so it's fast on warm cache.
  // News and dividend scrapes hit multiple external URLs and can take 5–15 s;
  // firing them in the background lets the response return immediately and
  // the cache warms up for the next request.
  const latestPrices = await fetchCurrentPrices().catch(() => ({} as Record<string, StockMetrics>));

  const stockData = getStockDataSync(upper);
  if (!stockData) {
    return NextResponse.json(
      { error: `Stock data not found for ticker: ${ticker}` },
      { status: 404 }
    );
  }

  // Overlay live price if available
  if (latestPrices[upper]) {
    stockData.metrics = latestPrices[upper];
  }

  const [latestNews, latestDividends] = await Promise.all([
    getNewsForTicker(upper),
    getDividendsForTicker(upper),
  ]);

  if (!isNewsCacheFresh()) refreshNews().catch(() => {});
  if (!isDividendCacheFresh()) refreshDividends().catch(() => {});

  // Overlay live news when scraper/cache coverage exists. If not, keep the
  // seeded fallback so the dashboard does not render as empty during source
  // outages or before the first successful cron refresh.
  if (latestNews.length > 0) {
    stockData.news = latestNews.slice(0, 12);
    stockData.sentiment = getSentimentForNews(stockData.news);
  }

  // Overlay live dividends when scraper/cache coverage exists. Empty scraper
  // output should not erase the seeded fallback dividend section.
  if (latestDividends.length > 0) {
    stockData.dividends = latestDividends;
    const liveDividendYield = deriveDividendYield(stockData.metrics.currentPrice, latestDividends);
    if (liveDividendYield !== null) {
      stockData.metrics.dividendYield = liveDividendYield;
    }
  }

  // Overlay latest financial documents (from African Financials)
  const financialsSnapshot = await getFinancialsSnapshot();
  if (financialsSnapshot?.byTicker?.[upper]?.length) {
    stockData.financials = financialsSnapshot.byTicker[upper];
    stockData.financialsMeta = {
      updatedAt: financialsSnapshot.updatedAt,
      sourceUrl: financialsSnapshot.sourceUrl,
    };
    // Build income statement Sankey data from the scraped financial documents
    const incomeStatement = buildIncomeStatement(stockData.financials);
    if (incomeStatement) {
      stockData.incomeStatement = incomeStatement;
    }
  }

  return NextResponse.json({
    ...stockData,
    _meta: { fetchedAt: new Date().toISOString() },
  });
}
