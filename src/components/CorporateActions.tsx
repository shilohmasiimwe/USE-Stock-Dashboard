'use client';

import { CorporateAction } from '@/types/stock';
import DashboardSection from '@/components/DashboardSection';

interface CorporateActionsProps {
  actions: CorporateAction[];
}

export default function CorporateActions({ actions }: CorporateActionsProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/14 text-emerald-300 border-emerald-500/25';
      case 'upcoming':
        return 'bg-blue-500/14 text-blue-300 border-blue-500/25';
      case 'cancelled':
        return 'bg-red-500/14 text-red-300 border-red-500/25';
      default:
        return 'bg-slate-700/45 text-slate-300 border-slate-600/50';
    }
  };

  const getImportanceStyles = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'border-red-500/30 bg-red-500/8';
      case 'medium':
        return 'border-amber-500/30 bg-amber-500/8';
      default:
        return 'border-slate-700/70 bg-slate-950/35';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'AGM':
        return 'AGM';
      case 'EGM':
        return 'EGM';
      case 'Rights Issue':
        return 'RI';
      case 'Bonus Issue':
        return 'BI';
      case 'Stock Split':
        return 'SS';
      case 'Earnings Release':
        return 'ER';
      case 'Board Meeting':
        return 'BM';
      default:
        return 'CA';
    }
  };

  const sortedActions = [...actions].sort((a, b) => {
    if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
    if (b.status === 'upcoming' && a.status !== 'upcoming') return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <DashboardSection
      title="Corporate actions"
      eyebrow="Events"
      description="Board meetings, earnings releases, rights issues, and other events that can change the investment case."
      tone="quiet"
    >
      {sortedActions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/35 px-5 py-8 text-center">
          <p className="font-medium text-slate-300">No corporate actions available</p>
          <p className="mt-1 text-sm text-slate-500">New filings and company events will appear here when available.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedActions.map((action) => (
            <article
              key={action.id}
              className={`rounded-2xl border p-4 ${getImportanceStyles(action.importance)}`}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-950/45 font-mono text-xs font-bold text-slate-300">
                  {getTypeLabel(action.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-[0.16em] text-slate-500">{action.type}</span>
                      <h4 className="mt-1 font-semibold text-slate-50">{action.title}</h4>
                    </div>
                    <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${getStatusStyles(action.status)}`}>
                      {action.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-400">{action.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-mono text-slate-500">{action.date}</span>
                    <span className={`capitalize ${
                      action.importance === 'high' ? 'text-red-300' :
                      action.importance === 'medium' ? 'text-amber-300' : 'text-slate-400'
                    }`}>
                      {action.importance} priority
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardSection>
  );
}
