'use client';

import { ReactNode } from 'react';

type SectionTone = 'default' | 'market' | 'analysis' | 'quiet';

interface DashboardSectionProps {
  title: string;
  eyebrow?: string;
  description?: string;
  tone?: SectionTone;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
}

const toneClasses: Record<SectionTone, string> = {
  default: 'bg-slate-900/82 border-slate-700/70 shadow-[0_24px_80px_rgba(2,6,23,0.22)]',
  market: 'bg-[linear-gradient(135deg,rgba(6,78,59,0.32),rgba(15,23,42,0.92)_48%,rgba(8,47,73,0.25))] border-emerald-700/45 shadow-[0_28px_90px_rgba(5,46,22,0.16)]',
  analysis: 'bg-[linear-gradient(145deg,rgba(15,23,42,0.96),rgba(30,41,59,0.74))] border-cyan-900/50 shadow-[0_24px_70px_rgba(8,47,73,0.18)]',
  quiet: 'bg-slate-950/45 border-slate-800/80 shadow-none',
};

export default function DashboardSection({
  title,
  eyebrow,
  description,
  tone = 'default',
  children,
  className = '',
  headerAction,
}: DashboardSectionProps) {
  return (
    <section className={`dashboard-section rounded-3xl border p-5 md:p-6 ${toneClasses[tone]} ${className}`}>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {eyebrow}
            </p>
          )}
          <h2 className="text-xl font-semibold tracking-[-0.015em] text-slate-50">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {description}
            </p>
          )}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
      {children}
    </section>
  );
}
