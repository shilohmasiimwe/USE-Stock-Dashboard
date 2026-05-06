'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { StockInfo, StockMetrics } from '@/types/stock';
import DashboardSection from '@/components/DashboardSection';

interface Props {
  info: StockInfo;
  metrics: StockMetrics;
}

interface PeerEntry {
  ticker: string;
  name: string;
  peRatio: number;
  dividendYield: number;
  grossMargin: number;
  revGrowth: number;
  marketCap: string;
  fcfYield: number;
}

interface TooltipPayload {
  fill?: string;
  value?: number;
  name?: string;
}

const ALL_PEERS: Record<string, PeerEntry[]> = {
  Telecommunications: [
    { ticker: 'MTN', name: 'MTN Uganda', peRatio: 12.4, dividendYield: 8.2, grossMargin: 68.4, revGrowth: 12.3, marketCap: '3.2T', fcfYield: 6.1 },
    { ticker: 'AIRTL', name: 'Airtel Uganda', peRatio: 18.6, dividendYield: 4.1, grossMargin: 61.2, revGrowth: 8.7, marketCap: '1.1T', fcfYield: 3.8 },
    { ticker: 'SAFCOM', name: 'Safaricom (KE)', peRatio: 14.6, dividendYield: 5.3, grossMargin: 66.1, revGrowth: 10.8, marketCap: 'UGX 34.5T', fcfYield: 4.9 },
  ],
  Banking: [
    { ticker: 'SBU', name: 'Stanbic Bank', peRatio: 8.3, dividendYield: 7.4, grossMargin: 72.1, revGrowth: 15.2, marketCap: '2.8T', fcfYield: 8.2 },
    { ticker: 'DFCU', name: 'DFCU Bank', peRatio: 6.1, dividendYield: 9.8, grossMargin: 68.3, revGrowth: 6.4, marketCap: '820B', fcfYield: 9.1 },
    { ticker: 'BOBU', name: 'Bank of Baroda', peRatio: 7.5, dividendYield: 6.2, grossMargin: 65.4, revGrowth: 4.1, marketCap: '540B', fcfYield: 7.4 },
    { ticker: 'EBU', name: 'Equity Bank', peRatio: 11.2, dividendYield: 5.5, grossMargin: 71.8, revGrowth: 18.6, marketCap: '1.4T', fcfYield: 5.8 },
  ],
  Manufacturing: [
    { ticker: 'UCL', name: 'Uganda Clays', peRatio: 14.2, dividendYield: 3.5, grossMargin: 38.6, revGrowth: 5.8, marketCap: '92B', fcfYield: 3.2 },
    { ticker: 'BATU', name: 'BAT Uganda', peRatio: 9.8, dividendYield: 11.2, grossMargin: 55.3, revGrowth: -2.1, marketCap: '350B', fcfYield: 8.8 },
    { ticker: 'EABL', name: 'EABL (KE)', peRatio: 22.4, dividendYield: 2.8, grossMargin: 52.1, revGrowth: 8.2, marketCap: '210B', fcfYield: 2.4 },
  ],
  Insurance: [
    { ticker: 'NIC', name: 'National Insurance Corp', peRatio: 10.4, dividendYield: 5.6, grossMargin: 48.2, revGrowth: 9.3, marketCap: '185B', fcfYield: 5.2 },
    { ticker: 'JUBILEE', name: 'Jubilee Holdings (KE)', peRatio: 8.6, dividendYield: 4.2, grossMargin: 44.5, revGrowth: 7.1, marketCap: '152B', fcfYield: 4.8 },
  ],
  Media: [
    { ticker: 'NVU', name: 'New Vision', peRatio: 8.9, dividendYield: 6.1, grossMargin: 42.5, revGrowth: 3.2, marketCap: '78B', fcfYield: 5.9 },
    { ticker: 'NMG', name: 'Nation Media (KE)', peRatio: 11.3, dividendYield: 5.4, grossMargin: 46.8, revGrowth: 5.8, marketCap: '95B', fcfYield: 4.6 },
  ],
  Utilities: [
    { ticker: 'UMEME', name: 'Umeme', peRatio: 7.8, dividendYield: 9.8, grossMargin: 35.4, revGrowth: 4.2, marketCap: '890B', fcfYield: 8.5 },
    { ticker: 'KPLC', name: 'Kenya Power (KE)', peRatio: 5.2, dividendYield: 3.1, grossMargin: 28.7, revGrowth: 6.8, marketCap: '310B', fcfYield: 4.2 },
  ],
  Healthcare: [
    { ticker: 'QCIL', name: 'Quality Chemicals', peRatio: 15.6, dividendYield: 2.8, grossMargin: 52.4, revGrowth: 22.4, marketCap: '340B', fcfYield: 2.1 },
    { ticker: 'ASANTE', name: 'Asante Healthcare', peRatio: 18.2, dividendYield: 1.9, grossMargin: 55.8, revGrowth: 18.6, marketCap: '120B', fcfYield: 1.8 },
  ],
  'Consumer Goods': [
    { ticker: 'BATU', name: 'BAT Uganda', peRatio: 9.8, dividendYield: 11.2, grossMargin: 55.3, revGrowth: -2.1, marketCap: '350B', fcfYield: 8.8 },
    { ticker: 'EABL', name: 'EABL (KE)', peRatio: 22.4, dividendYield: 2.8, grossMargin: 52.1, revGrowth: 8.2, marketCap: '210B', fcfYield: 2.4 },
    { ticker: 'BAT_KE', name: 'BAT Kenya', peRatio: 10.2, dividendYield: 12.4, grossMargin: 57.8, revGrowth: -1.4, marketCap: '180B', fcfYield: 9.2 },
  ],
};

const CHART_COLORS = ['#2dd4bf', '#60a5fa', '#f87171', '#fb923c', '#a78bfa', '#fbbf24'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs">
      <p className="mb-1 font-semibold text-slate-50">{label}</p>
      {payload.map((entry, i) => (
        <p key={`${label}-${i}`} style={{ color: entry.fill }}>
          {entry.value?.toFixed(1)}
          {entry.name?.includes('Yield') || entry.name?.includes('Margin') || entry.name?.includes('Growth') ? '%' : 'x'}
        </p>
      ))}
    </div>
  );
};

export default function ComparableAnalysis({ info, metrics }: Props) {
  const sectorPeers = ALL_PEERS[info.sector] ?? [];
  const hasCurrent = sectorPeers.some((p) => p.ticker === info.ticker);
  const currentEntry: PeerEntry = {
    ticker: info.ticker,
    name: info.name,
    peRatio: metrics.peRatio,
    dividendYield: metrics.dividendYield,
    grossMargin: 55,
    revGrowth: metrics.changePercent,
    marketCap: metrics.marketCap,
    fcfYield: metrics.peRatio > 0 ? (100 / metrics.peRatio) * 0.6 : 4.0,
  };
  const peers: PeerEntry[] = hasCurrent ? sectorPeers : [currentEntry, ...sectorPeers.slice(0, 4)];

  const peData = peers.map((p, i) => ({
    ticker: p.ticker,
    value: p.peRatio,
    fill: p.ticker === info.ticker ? '#2dd4bf' : CHART_COLORS[(i + 1) % CHART_COLORS.length],
  }));

  const divData = peers.map((p, i) => ({
    ticker: p.ticker,
    value: p.dividendYield,
    fill: p.ticker === info.ticker ? '#4ade80' : CHART_COLORS[(i + 1) % CHART_COLORS.length],
  }));

  const gmData = peers.map((p, i) => ({
    ticker: p.ticker,
    value: p.grossMargin,
    fill: p.ticker === info.ticker ? '#a78bfa' : CHART_COLORS[(i + 2) % CHART_COLORS.length],
  }));

  return (
    <DashboardSection
      title="Comparable company analysis"
      eyebrow={`${info.sector} peers | Uganda and East Africa`}
      description="Peer multiples are directional benchmarks. Use them to spot outliers before reading filings and sector notes."
      tone="quiet"
    >
      <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-700/70">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/80">
              <th className="whitespace-nowrap p-3 text-left font-semibold uppercase tracking-[0.16em] text-slate-400">Company</th>
              <th className="p-3 text-right font-semibold uppercase tracking-[0.16em] text-slate-400">P/E</th>
              <th className="whitespace-nowrap p-3 text-right font-semibold uppercase tracking-[0.16em] text-slate-400">Div. Yield</th>
              <th className="whitespace-nowrap p-3 text-right font-semibold uppercase tracking-[0.16em] text-slate-400">Gross Margin</th>
              <th className="whitespace-nowrap p-3 text-right font-semibold uppercase tracking-[0.16em] text-slate-400">Rev. Growth</th>
              <th className="whitespace-nowrap p-3 text-right font-semibold uppercase tracking-[0.16em] text-slate-400">FCF Yield</th>
              <th className="whitespace-nowrap p-3 text-right font-semibold uppercase tracking-[0.16em] text-slate-400">Mkt Cap</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((peer) => {
              const isCurrent = peer.ticker === info.ticker;
              return (
                <tr
                  key={peer.ticker}
                  className={`border-b border-slate-800 transition-colors last:border-0 ${
                    isCurrent ? 'bg-cyan-500/5' : 'hover:bg-slate-800/50'
                  }`}
                >
                  <td className={`whitespace-nowrap p-3 font-semibold ${isCurrent ? 'text-cyan-300' : 'text-slate-50'}`}>
                    <span className={`mr-2 inline-block rounded px-2 py-0.5 text-xs font-bold ${isCurrent ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-cyan-50'}`}>
                      {peer.ticker}
                    </span>
                    <span className="font-normal text-slate-400">{peer.name}</span>
                    {isCurrent && <span className="ml-2 text-xs font-normal text-cyan-400">(Selected)</span>}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-300">{peer.peRatio.toFixed(1)}x</td>
                  <td className="p-3 text-right font-mono text-emerald-300">{peer.dividendYield.toFixed(1)}%</td>
                  <td className="p-3 text-right font-mono text-slate-300">{peer.grossMargin.toFixed(1)}%</td>
                  <td className={`p-3 text-right font-mono ${peer.revGrowth >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {peer.revGrowth >= 0 ? '+' : ''}{peer.revGrowth.toFixed(1)}%
                  </td>
                  <td className="p-3 text-right font-mono text-cyan-300">{peer.fcfYield.toFixed(1)}%</td>
                  <td className="p-3 text-right font-mono text-slate-400">{peer.marketCap}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {[
          { title: 'P/E Ratio', data: peData, valueSuffix: 'x', dataKey: 'value' },
          { title: 'Dividend Yield (%)', data: divData, valueSuffix: '%', dataKey: 'value' },
          { title: 'Gross Margin (%)', data: gmData, valueSuffix: '%', dataKey: 'value' },
        ].map(({ title, data, valueSuffix, dataKey }) => (
          <div key={title} className="rounded-2xl border border-slate-700/70 bg-slate-950/35 p-4">
            <h4 className="mb-4 text-sm font-semibold text-slate-400">{title}</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#8b8fa6' }} tickFormatter={(v) => `${v}${valueSuffix}`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="ticker" tick={{ fontSize: 10, fill: '#94a3b8' }} width={50} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
                  {data.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Sector Avg P/E', value: `${(peers.reduce((s, p) => s + p.peRatio, 0) / peers.length).toFixed(1)}x` },
          { label: 'Sector Avg Div Yield', value: `${(peers.reduce((s, p) => s + p.dividendYield, 0) / peers.length).toFixed(1)}%` },
          { label: 'Sector Avg Gross Margin', value: `${(peers.reduce((s, p) => s + p.grossMargin, 0) / peers.length).toFixed(1)}%` },
          { label: 'Sector Avg Rev Growth', value: `${(peers.reduce((s, p) => s + p.revGrowth, 0) / peers.length).toFixed(1)}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-slate-700/70 bg-slate-950/35 p-3 text-center">
            <div className="mb-1 text-xs text-slate-500">{label}</div>
            <div className="font-mono text-sm font-bold text-slate-200">{value}</div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}
