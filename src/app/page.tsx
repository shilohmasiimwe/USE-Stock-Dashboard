'use client';

import { useState, useEffect } from 'react';
import { StockData, USE_STOCKS } from '@/types/stock';
import StockSelector from '@/components/StockSelector';
import StockMetrics from '@/components/StockMetrics';
import SentimentAnalysis from '@/components/SentimentAnalysis';
import NewsArticles from '@/components/NewsArticles';
import DividendAnnouncements from '@/components/DividendAnnouncements';
import CorporateActions from '@/components/CorporateActions';
import StockChart from '@/components/StockChart';
import PatternDisplay from '@/components/PatternDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';
import FutureOutlook from '@/components/FutureOutlook';
import PastPerformance from '@/components/PastPerformance';
import FinancialHealth from '@/components/FinancialHealth';
import PriceTargetHistory from '@/components/PriceTargetHistory';
import DCFValuation from '@/components/DCFValuation';
import ComparableAnalysis from '@/components/ComparableAnalysis';
import RiskAnalysis from '@/components/RiskAnalysis';
import PeerWatchlist from '@/components/PeerWatchlist';
import TechnicalAnalysis from '@/components/TechnicalAnalysis';
import { PatternDetection } from '@/lib/patternDetection';

interface PatternSummary {
  bullish: number;
  bearish: number;
  neutral: number;
  recent: PatternDetection[];
}

const SECTION_LINKS = [
  { href: '#market', label: 'Market' },
  { href: '#intelligence', label: 'News' },
  { href: '#technicals', label: 'Technicals' },
  { href: '#valuation', label: 'Valuation' },
  { href: '#risk', label: 'Risk' },
  { href: '#actions', label: 'Actions' },
];

export default function Home() {
  const [selectedTicker, setSelectedTicker] = useState(USE_STOCKS[0].ticker);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [patterns, setPatterns] = useState<PatternDetection[]>([]);
  const [patternSummary, setPatternSummary] = useState<PatternSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newsFetchedAt, setNewsFetchedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchStockData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/stocks/${selectedTicker}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch data for ${selectedTicker}`);
        }

        const data = await response.json();
        setStockData(data);
        setNewsFetchedAt(data._meta?.fetchedAt);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    const fetchPatternData = async () => {
      try {
        const response = await fetch(`/api/historical/${selectedTicker}?timeframe=daily`);
        if (response.ok) {
          const result = await response.json();
          setPatterns(result.patterns || []);
          setPatternSummary(result.patternSummary || null);
        }
      } catch (err) {
        console.error('Error fetching pattern data:', err);
      }
    };

    fetchStockData();
    fetchPatternData();
  }, [selectedTicker]);

  const handleNewsRefresh = async () => {
    const response = await fetch(`/api/stocks/${selectedTicker}`);
    if (!response.ok) return;
    const data = await response.json();
    setStockData(data);
    setNewsFetchedAt(data._meta?.fetchedAt);
  };

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="grid gap-5 border-b border-slate-800/80 pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.5)]" />
              Live market data
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.03em] text-slate-50 md:text-5xl">
              Uganda Securities Exchange dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
              Price, dividends, filings, valuation assumptions, and market context for USE-listed stocks.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/45 px-4 py-3 text-sm text-slate-400">
            <span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Current focus</span>
            <span className="mt-1 block font-mono text-slate-100">{selectedTicker}</span>
          </div>
        </header>

        <StockSelector
          selectedTicker={selectedTicker}
          onSelectTicker={setSelectedTicker}
        />

        <nav
          aria-label="Dashboard sections"
          className="sticky top-0 z-20 -mx-4 border-y border-slate-800/80 bg-slate-950/86 px-4 py-2 backdrop-blur md:mx-0 md:rounded-2xl md:border"
        >
          <div className="flex gap-2 overflow-x-auto">
            {SECTION_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="pressable focus-ring whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-sm font-bold text-red-300">
              !
            </div>
            <h3 className="mb-2 text-xl font-bold text-red-400">Error loading data</h3>
            <p className="text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => setSelectedTicker(selectedTicker)}
              className="pressable focus-ring mt-4 rounded-lg bg-red-500/20 px-6 py-2 text-red-300 hover:bg-red-500/30"
            >
              Try again
            </button>
          </div>
        ) : stockData ? (
          <div className="animate-fade-in space-y-8">
            <section id="market" className="scroll-mt-28">
              <StockMetrics info={stockData.info} metrics={stockData.metrics} />
            </section>

            <section id="intelligence" className="scroll-mt-28 space-y-6">
              <NewsArticles
                articles={stockData.news}
                ticker={selectedTicker}
                onRefresh={handleNewsRefresh}
                lastFetched={newsFetchedAt}
              />
              <DividendAnnouncements
                dividends={stockData.dividends}
                currency={stockData.info.currency}
              />
            </section>

            <section id="technicals" className="scroll-mt-28 space-y-6">
              <TechnicalAnalysis
                ticker={selectedTicker}
                info={stockData.info}
                metrics={stockData.metrics}
              />
              <StockChart ticker={selectedTicker} />
              {patternSummary && (
                <PatternDisplay patterns={patterns} patternSummary={patternSummary} />
              )}
            </section>

            <section id="valuation" className="scroll-mt-28 space-y-6">
              <FutureOutlook
                info={stockData.info}
                metrics={stockData.metrics}
                sentiment={stockData.sentiment}
              />

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <PastPerformance info={stockData.info} metrics={stockData.metrics} />
                <FinancialHealth info={stockData.info} metrics={stockData.metrics} />
              </div>

              <PriceTargetHistory
                info={stockData.info}
                metrics={stockData.metrics}
                sentiment={stockData.sentiment}
              />

              <DCFValuation info={stockData.info} metrics={stockData.metrics} />
              <ComparableAnalysis info={stockData.info} metrics={stockData.metrics} />
            </section>

            <section id="risk" className="scroll-mt-28 space-y-6">
              <RiskAnalysis info={stockData.info} metrics={stockData.metrics} />
              <SentimentAnalysis
                sentiment={stockData.sentiment}
                ticker={selectedTicker}
              />
            </section>

            <section id="actions" className="scroll-mt-28 space-y-6">
              <CorporateActions actions={stockData.corporateActions} />
              <PeerWatchlist info={stockData.info} metrics={stockData.metrics} />
            </section>
          </div>
        ) : null}

        <footer className="border-t border-slate-800 pb-4 pt-8 text-center">
          <p className="text-sm text-slate-500">
            USE Stock Dashboard (c) {new Date().getFullYear()} | Data for demonstration purposes
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Built for BBT4206 Time Series Analysis and Forecasting
          </p>
        </footer>
      </div>
    </main>
  );
}
