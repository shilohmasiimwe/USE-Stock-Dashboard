import { FinancialDocument, FinancialFigure, IncomeStatement, IncomeStatementNode, IncomeStatementLink } from '@/types/stock';

// Label keyword groups for matching figure names from scraped documents
const LABEL_PATTERNS: Record<string, RegExp> = {
  revenue:          /\b(revenue|turnover|net revenue|total revenue|sales|net sales|gross revenue|income from operations)\b/i,
  cogs:             /\b(cost of (sales|goods|revenue|products|services)|direct costs?|cost of services)\b/i,
  grossProfit:      /\b(gross profit|gross income)\b/i,
  opex:             /\b(operating expenses?|admin(istrative)? expenses?|selling( and distribution)? expenses?|general and admin|s[,&]?\s*g\s*[&a]\s*[ae]|operating costs?|distribution costs?|total (operating )?expenses?)\b/i,
  depreciation:     /\b(depreciation|amortisation|amortization|d\s*[&a]\s*a)\b/i,
  operatingProfit:  /\b(operating profit|profit from operations|ebit|earnings before interest|operating income)\b/i,
  financeIncome:    /\b(finance income|interest income|investment income|other income)\b/i,
  financeCosts:     /\b(finance costs?|interest (expense|charges?|payable)|borrowing costs?|finance charges?)\b/i,
  pbt:              /\b(profit before (tax|taxation)|p\.?b\.?t|earnings before (income )?tax|ebt)\b/i,
  tax:              /\b((income )?tax (expense|charge|provision)|taxation|tax on profit|corporate tax)\b/i,
  netProfit:        /\b(net (profit|income|earnings)|profit after (tax|taxation)|p\.?a\.?t|net result|profit for (the )?(year|period))\b/i,
  dividendsPaid:    /\b(dividends? paid|dividends? declared|distribution to shareholders)\b/i,
  retainedEarnings: /\b(retained (earnings|profit|income)|transfer to reserves?)\b/i,
};

type LineItem =
  | 'revenue' | 'cogs' | 'grossProfit' | 'opex' | 'depreciation'
  | 'operatingProfit' | 'financeIncome' | 'financeCosts' | 'pbt'
  | 'tax' | 'netProfit' | 'dividendsPaid' | 'retainedEarnings';

function matchLabel(label: string): LineItem | null {
  for (const [key, pattern] of Object.entries(LABEL_PATTERNS)) {
    if (pattern.test(label)) return key as LineItem;
  }
  return null;
}

function normalizeValue(figure: FinancialFigure): number {
  if (figure.value == null) return 0;
  const unit = (figure.unit ?? '').toLowerCase();
  const multipliers: Record<string, number> = {
    trillion: 1_000_000,
    billion: 1_000,
    bn: 1_000,
    million: 1,
    m: 1,
    k: 0.001,
  };
  const mult = multipliers[unit] ?? 1;
  return Math.abs(figure.value * mult); // values in millions of UGX
}

function extractFigures(docs: FinancialDocument[]): { items: Partial<Record<LineItem, number>>; doc: FinancialDocument | null; unit: string } {
  // Prefer annual reports; sort by year desc to get most recent
  const ranked = [...docs].sort((a, b) => {
    const yearDiff = (b.year ?? 0) - (a.year ?? 0);
    if (yearDiff !== 0) return yearDiff;
    const aIsAnnual = /(annual|full.year|year.end)/i.test(a.documentType ?? a.title);
    const bIsAnnual = /(annual|full.year|year.end)/i.test(b.documentType ?? b.title);
    return (bIsAnnual ? 1 : 0) - (aIsAnnual ? 1 : 0);
  });

  const items: Partial<Record<LineItem, number>> = {};
  let usedDoc: FinancialDocument | null = null;

  for (const doc of ranked) {
    if (!doc.figures?.length) continue;
    const candidate: Partial<Record<LineItem, number>> = {};

    for (const fig of doc.figures) {
      const key = matchLabel(fig.label);
      if (!key || candidate[key] != null) continue;
      const v = normalizeValue(fig);
      if (v > 0) candidate[key] = v;
    }

    const coverage = Object.keys(candidate).length;
    if (coverage > Object.keys(items).length) {
      Object.assign(items, candidate);
      usedDoc = doc;
    }

    // Stop once we have a reasonably complete income statement
    if (items.revenue && (items.netProfit || items.pbt) && items.grossProfit) break;
  }

  // Infer unit from the magnitude of revenue (UGX figures are typically in billions)
  const revenueRaw = usedDoc?.figures?.find(f => LABEL_PATTERNS.revenue.test(f.label));
  const unit = revenueRaw
    ? (revenueRaw.unit ?? (revenueRaw.value != null && revenueRaw.value > 500 ? 'million' : 'billion'))
    : 'million';

  return { items, doc: usedDoc, unit };
}

function deriveFlow(items: Partial<Record<LineItem, number>>): { nodes: IncomeStatementNode[]; links: IncomeStatementLink[]; figuresFound: string[] } {
  const nodes: IncomeStatementNode[] = [];
  const links: IncomeStatementLink[] = [];
  const figuresFound: string[] = [];

  const add = (id: string, label: string) => {
    if (!nodes.find(n => n.id === id)) nodes.push({ id, label });
  };

  const link = (srcId: string, tgtId: string, value: number) => {
    if (value <= 0) return;
    if (!nodes.find(n => n.id === srcId) || !nodes.find(n => n.id === tgtId)) return;
    links.push({ source: srcId, target: tgtId, value: Math.round(value) });
  };

  const rev = items.revenue;
  if (!rev) return { nodes, links, figuresFound };

  figuresFound.push('Revenue');
  add('revenue', 'Revenue');

  // ── Gross Profit layer ────────────────────────────────────────────────────────
  let gross = items.grossProfit;
  let cogs  = items.cogs;

  if (!gross && cogs) {
    gross = rev - cogs;
  } else if (!cogs && gross) {
    cogs = rev - gross;
  } else if (!gross && !cogs) {
    // fallback: assume 50% gross margin
    cogs  = rev * 0.5;
    gross = rev * 0.5;
  }

  if (cogs && cogs > 0) {
    figuresFound.push('Cost of Sales');
    add('cogs', 'Cost of Sales');
    link('revenue', 'cogs', cogs);
  }

  if (gross && gross > 0) {
    figuresFound.push('Gross Profit');
    add('gross', 'Gross Profit');
    link('revenue', 'gross', gross);
  }

  // ── Operating Profit layer ───────────────────────────────────────────────────
  let opProfit = items.operatingProfit;
  let opex     = items.opex;
  const depr   = items.depreciation;

  const totalOpex = (opex ?? 0) + (depr ?? 0);

  if (!opProfit && totalOpex > 0 && gross) {
    opProfit = gross - totalOpex;
  } else if (!totalOpex && opProfit && gross) {
    opex = gross - opProfit;
  } else if (!opProfit && !totalOpex && gross) {
    // fallback: 60% of gross to opex
    opex = gross * 0.6;
    opProfit = gross * 0.4;
  }

  if (opex && opex > 0) {
    figuresFound.push('Operating Expenses');
    add('opex', 'Operating Expenses');
    link('gross', 'opex', opex);
  }

  if (depr && depr > 0) {
    figuresFound.push('Depreciation & Amortisation');
    add('depr', 'Depreciation & Amortisation');
    link('gross', 'depr', depr);
  }

  if (opProfit && opProfit > 0) {
    figuresFound.push('Operating Profit');
    add('opProfit', 'Operating Profit (EBIT)');
    link('gross', 'opProfit', opProfit);
  }

  // ── Net Profit layer ─────────────────────────────────────────────────────────
  const base = opProfit ?? gross ?? 0;

  const finInc  = items.financeIncome;
  const finCost = items.financeCosts;

  let pbt = items.pbt;
  if (!pbt) {
    pbt = base + (finInc ?? 0) - (finCost ?? 0);
  }

  if (finCost && finCost > 0) {
    figuresFound.push('Finance Costs');
    add('finCost', 'Finance Costs');
    link('opProfit', 'finCost', finCost);
  }

  if (finInc && finInc > 0) {
    figuresFound.push('Finance Income');
    add('finInc', 'Finance Income');
    // Finance income flows into PBT (represented by a link from opProfit)
    link('opProfit', 'finInc', finInc);
  }

  let tax     = items.tax;
  let netPro  = items.netProfit;

  if (!netPro && tax && pbt) {
    netPro = pbt - tax;
  } else if (!tax && netPro && pbt) {
    tax = pbt - netPro;
  } else if (!netPro && !tax && pbt) {
    tax    = pbt * 0.3;
    netPro = pbt * 0.7;
  }

  const pbtSrc = opProfit ? 'opProfit' : 'gross';

  if (tax && tax > 0) {
    figuresFound.push('Tax');
    add('tax', 'Income Tax');
    link(pbtSrc, 'tax', tax);
  }

  if (netPro && netPro > 0) {
    figuresFound.push('Net Profit');
    add('net', 'Net Profit');
    link(pbtSrc, 'net', netPro);
  }

  // ── Profit allocation ────────────────────────────────────────────────────────
  const divPaid  = items.dividendsPaid;
  const retained = items.retainedEarnings;

  if (netPro && netPro > 0 && (divPaid || retained)) {
    if (divPaid && divPaid > 0) {
      figuresFound.push('Dividends Paid');
      add('divPaid', 'Dividends Paid');
      link('net', 'divPaid', divPaid);
    }
    if (retained && retained > 0) {
      figuresFound.push('Retained Earnings');
      add('retained', 'Retained Earnings');
      link('net', 'retained', retained);
    }
  }

  return { nodes, links, figuresFound };
}

export function buildIncomeStatement(docs: FinancialDocument[]): IncomeStatement | null {
  if (!docs?.length) return null;

  const { items, doc, unit } = extractFigures(docs);
  if (!items.revenue) return null;

  const { nodes, links, figuresFound } = deriveFlow(items);
  if (links.length === 0) return null;

  return {
    year: doc?.year ?? new Date().getFullYear(),
    period: doc?.period ?? 'FY',
    currency: 'UGX',
    unit,
    nodes,
    links,
    source: doc?.source,
    publishedAt: doc?.publishedAt,
    figuresFound,
  };
}
