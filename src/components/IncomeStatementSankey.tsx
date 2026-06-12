'use client';

import { useMemo } from 'react';
import { SankeyChart } from '@mui/x-charts-pro/SankeyChart';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { IncomeStatement } from '@/types/stock';

interface Props {
  incomeStatement: IncomeStatement;
  ticker: string;
}

const darkTheme = createTheme({
  palette: { mode: 'dark' },
  components: {
    MuiPaper: {
      styleOverrides: { root: { backgroundColor: '#0f172a', color: '#f1f5f9' } },
    },
  },
});

// Color map by node role (matched by id prefix)
const NODE_COLORS: Record<string, string> = {
  revenue:    '#34d399', // emerald
  cogs:       '#f87171', // red
  gross:      '#60a5fa', // blue
  opex:       '#fb923c', // orange
  depr:       '#a78bfa', // violet
  opProfit:   '#38bdf8', // sky
  finCost:    '#f472b6', // pink
  finInc:     '#86efac', // light green
  tax:        '#fbbf24', // amber
  net:        '#34d399', // emerald
  divPaid:    '#a3e635', // lime
  retained:   '#67e8f9', // cyan
};

function formatValue(value: number, unit: string, currency: string): string {
  const unitLabel = unit === 'billion' || unit === 'bn'
    ? 'bn'
    : unit === 'trillion'
    ? 'tn'
    : 'M';
  return `${currency} ${value.toLocaleString()} ${unitLabel}`;
}

export default function IncomeStatementSankey({ incomeStatement, ticker }: Props) {
  const { nodes, links, year, period, currency, unit, figuresFound, source, publishedAt } = incomeStatement;

  const coloredNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        color: NODE_COLORS[n.id] ?? '#94a3b8',
      })),
    [nodes]
  );

  const publishedLabel = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-UG', { year: 'numeric', month: 'short' })
    : null;

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-xl">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Income Statement
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">
            {ticker} Revenue Flow
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {period} {year} · Sankey breakdown of how revenue flows to net profit
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {publishedLabel && (
            <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
              Published {publishedLabel}
            </span>
          )}
          {source && (
            <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-400">
              {source}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-2">
        {coloredNodes.map((n) => (
          <span
            key={n.id}
            className="flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-950/50 px-2.5 py-1 text-xs text-slate-300"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: n.color }}
            />
            {n.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/60 p-2">
        <ThemeProvider theme={darkTheme}>
          <SankeyChart
            series={{
              type: 'sankey',
              data: {
                nodes: coloredNodes,
                links,
              },
              nodeOptions: {
                width: 16,
                padding: 24,
              },
              linkOptions: {
                opacity: 0.45,
              },
              valueFormatter: (value) =>
                formatValue(value, unit, currency),
            }}
            height={420}
            sx={{
              '& .MuiChartsLegend-root': { display: 'none' },
              '& text': { fill: '#e2e8f0', fontSize: '0.7rem' },
              bgcolor: 'transparent',
            }}
          />
        </ThemeProvider>
      </div>

      {/* Figures found badge */}
      {figuresFound.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Figures extracted from filing:{' '}
          <span className="text-slate-400">{figuresFound.join(' · ')}</span>
        </p>
      )}

      {links.length < 3 && (
        <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
          Partial data — some line items estimated from available figures. Full income statement
          figures will populate once annual report data is scraped.
        </p>
      )}
    </section>
  );
}
