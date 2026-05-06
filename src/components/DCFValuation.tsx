'use client';

import { useMemo, useState } from 'react';
import { StockInfo, StockMetrics } from '@/types/stock';
import DashboardSection from '@/components/DashboardSection';

interface Props {
  info: StockInfo;
  metrics: StockMetrics;
}

type Scenario = 'bull' | 'base' | 'bear';

const SCENARIOS: Record<Scenario, { revGrowth: number; fcfMargin: number; wacc: number; tgr: number; label: string }> = {
  bull: { revGrowth: 20, fcfMargin: 30, wacc: 8, tgr: 3.5, label: 'Bull Case' },
  base: { revGrowth: 12, fcfMargin: 22, wacc: 10, tgr: 2.5, label: 'Base Case' },
  bear: { revGrowth: 5, fcfMargin: 14, wacc: 12, tgr: 1.5, label: 'Bear Case' },
};

function parseMarketCapToNum(mc: string): number {
  const val = parseFloat(mc.replace(/[^0-9.]/g, '') || '0');
  if (mc.toUpperCase().includes('T')) return val * 1e12;
  if (mc.toUpperCase().includes('B')) return val * 1e9;
  if (mc.toUpperCase().includes('M')) return val * 1e6;
  return val;
}

function computeDCFModel(
  baseRevenue: number,
  sharesOutstanding: number,
  netDebt: number,
  wacc: number,
  tgr: number,
  revGrowth: number,
  fcfMargin: number
) {
  const waccR = wacc / 100;
  const tgrR = tgr / 100;
  const growthR = revGrowth / 100;
  const fcfR = fcfMargin / 100;
  const years = 7;

  let pvFCF = 0;
  let lastFCF = 0;
  const projRevenues: number[] = [];
  const projFCFs: number[] = [];
  const discountedFCFs: number[] = [];
  let rev = baseRevenue;

  for (let i = 1; i <= years; i++) {
    const yrGrowth = Math.max(growthR * Math.pow(0.85, i - 1), tgrR);
    rev = rev * (1 + yrGrowth);
    const fcf = rev * fcfR;
    const df = Math.pow(1 + waccR, i);
    const pv = fcf / df;
    pvFCF += pv;
    lastFCF = fcf;
    projRevenues.push(rev);
    projFCFs.push(fcf);
    discountedFCFs.push(pv);
  }

  const terminalValue = (lastFCF * (1 + tgrR)) / (waccR - tgrR);
  const pvTerminal = terminalValue / Math.pow(1 + waccR, years);
  const equityValue = pvFCF + pvTerminal - netDebt;
  const impliedPrice = sharesOutstanding > 0 ? equityValue / sharesOutstanding : 0;

  return { impliedPrice, pvFCF, pvTerminal, projRevenues, projFCFs, discountedFCFs };
}

function computeReverseDCF(
  baseRevenue: number,
  sharesOutstanding: number,
  netDebt: number,
  currentPrice: number,
  wacc: number,
  tgr: number,
  fcfMargin: number
) {
  const waccR = wacc / 100;
  const tgrR = tgr / 100;
  const fcfR = fcfMargin / 100;
  const targetEV = currentPrice * sharesOutstanding + netDebt;

  let lo = 0;
  let hi = 1;
  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;
    let pvFCF = 0;
    let lastFCF = 0;
    for (let i = 1; i <= 7; i++) {
      const rev = baseRevenue * Math.pow(1 + mid, i);
      const fcf = rev * fcfR;
      pvFCF += fcf / Math.pow(1 + waccR, i);
      lastFCF = fcf;
    }
    const tv = (lastFCF * (1 + tgrR)) / (waccR - tgrR);
    const ev = pvFCF + tv / Math.pow(1 + waccR, 7);
    if (ev < targetEV) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * 100;
}

function formatCap(n: number, currency: string) {
  if (n >= 1e12) return `${currency} ${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${currency} ${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${currency} ${(n / 1e6).toFixed(1)}M`;
  return `${currency} ${n.toLocaleString()}`;
}

export default function DCFValuation({ info, metrics }: Props) {
  const [scenario, setScenario] = useState<Scenario>('base');
  const [wacc, setWacc] = useState(10);
  const [tgr, setTgr] = useState(2.5);
  const [revGrowth, setRevGrowth] = useState(12);
  const [fcfMargin, setFcfMargin] = useState(22);

  const marketCap = parseMarketCapToNum(metrics.marketCap);
  const sharesOutstanding = marketCap > 0 && metrics.currentPrice > 0 ? marketCap / metrics.currentPrice : 1e9;
  const baseRevenue = marketCap > 0 ? marketCap * 0.18 : metrics.currentPrice * 1_500_000;
  const netDebt = baseRevenue * 0.05;

  const result = useMemo(
    () => computeDCFModel(baseRevenue, sharesOutstanding, netDebt, wacc, tgr, revGrowth, fcfMargin),
    [baseRevenue, sharesOutstanding, netDebt, wacc, tgr, revGrowth, fcfMargin]
  );

  const impliedCAGR = useMemo(
    () => computeReverseDCF(baseRevenue, sharesOutstanding, netDebt, metrics.currentPrice, wacc, tgr, fcfMargin),
    [baseRevenue, sharesOutstanding, netDebt, metrics.currentPrice, wacc, tgr, fcfMargin]
  );

  const upside = result.impliedPrice > 0
    ? ((result.impliedPrice - metrics.currentPrice) / metrics.currentPrice) * 100
    : 0;

  const handleScenario = (s: Scenario) => {
    const sc = SCENARIOS[s];
    setScenario(s);
    setWacc(sc.wacc);
    setTgr(sc.tgr);
    setRevGrowth(sc.revGrowth);
    setFcfMargin(sc.fcfMargin);
  };

  const scenarioPrices = useMemo(() => {
    return Object.entries(SCENARIOS).map(([key, sc]) => {
      const r = computeDCFModel(baseRevenue, sharesOutstanding, netDebt, sc.wacc, sc.tgr, sc.revGrowth, sc.fcfMargin);
      const pct = r.impliedPrice > 0 ? ((r.impliedPrice - metrics.currentPrice) / metrics.currentPrice) * 100 : 0;
      return { key: key as Scenario, label: sc.label, price: r.impliedPrice, pct };
    });
  }, [baseRevenue, sharesOutstanding, netDebt, metrics.currentPrice]);

  const currentYear = new Date().getFullYear();
  const projYears = Array.from({ length: 7 }, (_, i) => `FY${currentYear + i + 1}E`);
  const fmtShares = sharesOutstanding >= 1e9
    ? `${(sharesOutstanding / 1e9).toFixed(2)}B`
    : sharesOutstanding >= 1e6
    ? `${(sharesOutstanding / 1e6).toFixed(1)}M`
    : sharesOutstanding.toLocaleString();

  return (
    <DashboardSection
      title="DCF valuation model"
      eyebrow={`Interactive discounted cash flow | ${info.ticker}`}
      description="A scenario model for sensitivity analysis. Treat the output as a decision aid, not a live analyst price target."
      tone="analysis"
      headerAction={
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/8 px-4 py-3 text-sm text-cyan-100">
          <span className="block text-xs uppercase tracking-[0.16em] text-cyan-300/70">Model source</span>
          <span className="mt-1 block text-slate-300">Derived from market cap, price, and editable assumptions</span>
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={scenario === s}
            onClick={() => handleScenario(s)}
            className={`pressable focus-ring rounded-xl border px-4 py-2 text-sm font-semibold ${
              scenario === s
                ? s === 'bull'
                  ? 'border-emerald-500/40 bg-emerald-500/18 text-emerald-300'
                  : s === 'base'
                  ? 'border-cyan-500/40 bg-cyan-500/18 text-cyan-300'
                  : 'border-red-500/40 bg-red-500/18 text-red-300'
                : 'border-slate-700 bg-slate-950/45 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {SCENARIOS[s].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="self-start rounded-2xl border border-slate-700/70 bg-slate-950/40 p-5">
          <h3 className="mb-5 text-sm font-bold text-slate-50">Model inputs</h3>

          {[
            { label: 'WACC', value: wacc, set: setWacc, min: 7, max: 15, step: 0.5, fmt: (v: number) => `${v.toFixed(1)}%` },
            { label: 'Terminal Growth Rate', value: tgr, set: setTgr, min: 0.5, max: 5, step: 0.5, fmt: (v: number) => `${v.toFixed(1)}%` },
            { label: 'Revenue Growth (Yr 1)', value: revGrowth, set: setRevGrowth, min: 2, max: 40, step: 1, fmt: (v: number) => `${v}%` },
            { label: 'FCF Margin', value: fcfMargin, set: setFcfMargin, min: 5, max: 45, step: 1, fmt: (v: number) => `${v}%` },
          ].map(({ label, value, set, min, max, step, fmt }) => {
            const inputId = `${info.ticker}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            return (
              <div key={label} className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor={inputId} className="text-xs text-slate-400">{label}</label>
                  <span className="font-mono text-xs font-bold text-cyan-300">{fmt(value)}</span>
                </div>
                <input
                  id={inputId}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={(e) => set(parseFloat(e.target.value))}
                  className="focus-ring h-1 w-full cursor-pointer appearance-none rounded"
                  style={{
                    background: `linear-gradient(to right, #22d3ee ${((value - min) / (max - min)) * 100}%, #334155 ${((value - min) / (max - min)) * 100}%)`,
                    accentColor: '#22d3ee',
                  }}
                />
              </div>
            );
          })}

          <div className="space-y-3 border-t border-slate-700 pt-4">
            <InputMeta label="Projection Period" value="7 Years" />
            <InputMeta label="Est. Shares Outstanding" value={fmtShares} />
            <InputMeta label="Est. Base Revenue" value={formatCap(baseRevenue, info.currency)} />
          </div>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-6">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Implied share price</div>
            <div
              className="mt-2 font-mono text-4xl font-semibold tracking-[-0.03em]"
              style={{ color: upside >= 0 ? '#2dd4bf' : '#f87171' }}
            >
              {metrics.currentPrice < 100
                ? `${info.currency} ${result.impliedPrice.toFixed(2)}`
                : `${info.currency} ${Math.round(result.impliedPrice).toLocaleString()}`}
            </div>
            <div className="mt-2 font-mono text-sm" style={{ color: upside >= 0 ? '#4ade80' : '#f87171' }}>
              {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% {upside >= 0 ? 'upside' : 'downside'} vs current {info.currency} {metrics.currentPrice.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-5">
            <h4 className="mb-2 text-sm font-semibold text-blue-300">Reverse DCF: what is priced in?</h4>
            <div className="font-mono text-2xl font-bold text-blue-200">~{impliedCAGR.toFixed(0)}% revenue CAGR</div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              The current market price implies roughly this 7-year revenue growth rate at {wacc}% WACC and {fcfMargin}% FCF margin.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {scenarioPrices.map(({ key, label, price, pct }) => (
              <div
                key={key}
                className={`rounded-2xl border bg-slate-950/35 p-4 text-center ${
                  key === 'bull'
                    ? 'border-emerald-500/20'
                    : key === 'base'
                    ? 'border-blue-500/20'
                    : 'border-red-500/20'
                }`}
              >
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
                <div className="font-mono text-lg font-bold text-slate-100">
                  {metrics.currentPrice < 100 ? price.toFixed(2) : Math.round(price).toLocaleString()}
                </div>
                <div className={`mt-1 font-mono text-xs ${pct >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-700/70 bg-slate-950/40">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="bg-slate-900/80 p-3 text-left font-semibold uppercase tracking-[0.16em] text-slate-400">Metric</th>
                  {projYears.map((year) => (
                    <th key={year} className="whitespace-nowrap bg-slate-900/80 p-3 text-right font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ProjectionRow label="Revenue" values={result.projRevenues.map((r) => formatCap(r, info.currency))} />
                <ProjectionRow label="Free Cash Flow" values={result.projFCFs.map((f) => formatCap(f, info.currency))} />
                <ProjectionRow label="PV of FCF" values={result.discountedFCFs.map((d) => formatCap(d, info.currency))} accent />
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryStat label="PV of FCFs" value={formatCap(result.pvFCF, info.currency)} />
            <SummaryStat label="PV of Terminal Value" value={formatCap(result.pvTerminal, info.currency)} />
            <SummaryStat label="Equity Value" value={formatCap(result.pvFCF + result.pvTerminal - netDebt, info.currency)} />
            <SummaryStat
              label="Implied Price"
              value={metrics.currentPrice < 100 ? `${info.currency} ${result.impliedPrice.toFixed(2)}` : `${info.currency} ${Math.round(result.impliedPrice).toLocaleString()}`}
              positive={upside >= 0}
            />
          </div>
        </div>
      </div>

      <p className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-950/35 px-4 py-3 text-xs leading-5 text-slate-500">
        Assumption note: base revenue, shares outstanding, and net debt are estimated from available dashboard metrics when full statement data is unavailable.
      </p>
    </DashboardSection>
  );
}

function InputMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-mono text-sm text-slate-300">{value}</div>
    </div>
  );
}

function ProjectionRow({ label, values, accent = false }: { label: string; values: string[]; accent?: boolean }) {
  return (
    <tr className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30">
      <td className="p-3 font-semibold text-slate-50">{label}</td>
      {values.map((value, i) => (
        <td key={`${label}-${i}`} className={`whitespace-nowrap p-3 text-right font-mono ${accent ? 'text-cyan-300' : 'text-slate-300'}`}>
          {value}
        </td>
      ))}
    </tr>
  );
}

function SummaryStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/35 p-3">
      <div className="mb-1 text-xs text-slate-500">{label}</div>
      <div className={`truncate font-mono text-sm font-bold ${positive === undefined ? 'text-slate-200' : positive ? 'text-emerald-300' : 'text-red-300'}`}>
        {value}
      </div>
    </div>
  );
}
