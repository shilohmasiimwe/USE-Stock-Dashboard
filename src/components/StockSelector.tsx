'use client';

import { USE_STOCKS } from '@/types/stock';

interface StockSelectorProps {
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
}

export default function StockSelector({ selectedTicker, onSelectTicker }: StockSelectorProps) {
  const selectedStock = USE_STOCKS.find((stock) => stock.ticker === selectedTicker);

  return (
    <div className="rounded-3xl border border-emerald-900/45 bg-[linear-gradient(135deg,rgba(6,78,59,0.22),rgba(15,23,42,0.88)_55%,rgba(8,47,73,0.2))] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.18)] md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/75">
            Instrument
          </p>
          <h2 className="mt-2 truncate text-2xl font-semibold tracking-[-0.02em] text-slate-50">
            {selectedStock?.name ?? selectedTicker}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {selectedStock?.sector ?? 'Uganda Securities Exchange'} dashboard context.
          </p>
        </div>

        <div className="w-full md:max-w-md">
          <label htmlFor="stock-selector" className="mb-2 block text-sm font-medium text-emerald-100">
            Change ticker
          </label>
          <div className="relative">
            <select
              id="stock-selector"
              value={selectedTicker}
              onChange={(e) => onSelectTicker(e.target.value)}
              className="pressable focus-ring min-h-12 w-full appearance-none rounded-2xl border border-emerald-600/45 bg-emerald-950/45 px-4 py-3 pr-11 font-semibold text-emerald-50 hover:border-emerald-400/70"
            >
              {USE_STOCKS.map((stock) => (
                <option key={stock.ticker} value={stock.ticker} className="bg-slate-950">
                  {stock.ticker} - {stock.name}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
