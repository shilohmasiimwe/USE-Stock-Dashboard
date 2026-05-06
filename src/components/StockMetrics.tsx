'use client';

import { StockInfo, StockMetrics as StockMetricsType } from '@/types/stock';
import DashboardSection from '@/components/DashboardSection';

interface StockMetricsProps {
  info: StockInfo;
  metrics: StockMetricsType;
}

export default function StockMetrics({ info, metrics }: StockMetricsProps) {
  const isPositive = metrics.change >= 0;
  const movementLabel = isPositive ? 'Up' : 'Down';

  return (
    <DashboardSection
      title={info.name}
      eyebrow={`${info.ticker} | ${info.sector}`}
      description={info.description}
      tone="market"
      headerAction={
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-[0.16em] text-emerald-200/75">Last updated</div>
          <div className="mt-1 font-mono text-sm text-slate-100">
            {new Date(metrics.lastUpdated).toLocaleDateString()}
          </div>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current price</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
            <div className="font-mono text-4xl font-semibold tracking-[-0.03em] text-slate-50 md:text-5xl">
              {info.currency} {metrics.currentPrice.toLocaleString()}
            </div>
            <div className={`mb-1 flex items-center gap-2 ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>
              <span className="font-mono text-lg font-semibold">
                {isPositive ? '+' : ''}{metrics.change.toLocaleString()}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isPositive ? 'bg-emerald-500/16' : 'bg-red-500/16'}`}>
                {movementLabel} {Math.abs(metrics.changePercent).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[560px]">
          <MetricCard label="52W High" value={`${info.currency} ${metrics.high52Week.toLocaleString()}`} />
          <MetricCard label="52W Low" value={`${info.currency} ${metrics.low52Week.toLocaleString()}`} />
          <MetricCard label="Market Cap" value={metrics.marketCap} />
          <MetricCard label="Volume" value={metrics.volume.toLocaleString()} />
          <MetricCard label="Avg Volume" value={metrics.avgVolume.toLocaleString()} />
          <MetricCard label="P/E Ratio" value={metrics.peRatio.toFixed(1)} />
          <MetricCard label="Dividend Yield" value={`${metrics.dividendYield.toFixed(1)}%`} highlight />
          <MetricCard label="Ticker" value={info.ticker} />
        </div>
      </div>
    </DashboardSection>
  );
}

function MetricCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${highlight ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-slate-800/80 bg-slate-950/35'}`}>
      <div className="mb-1 text-xs text-slate-500">{label}</div>
      <div className={`truncate font-mono text-sm font-semibold ${highlight ? 'text-emerald-300' : 'text-slate-100'}`}>
        {value}
      </div>
    </div>
  );
}
