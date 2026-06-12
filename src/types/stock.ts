// USE Stock Dashboard Types

export interface StockInfo {
  ticker: string;
  name: string;
  sector: string;
  description: string;
  currency: string;
}

export interface StockMetrics {
  currentPrice: number;
  change: number;
  changePercent: number;
  high52Week: number;
  low52Week: number;
  marketCap: string;
  volume: number;
  avgVolume: number;
  peRatio: number;
  dividendYield: number;
  lastUpdated: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
}

export interface SentimentSummary {
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  averageScore: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  totalArticles: number;
  confidence: number;
}

export interface DividendAnnouncement {
  id: string;
  type: 'interim' | 'final' | 'special';
  amount: number;
  currency: string;
  exDividendDate: string;
  paymentDate: string;
  recordDate: string;
  status: 'announced' | 'paid' | 'upcoming';
  year: number;
}

export interface CorporateAction {
  id: string;
  type: 'AGM' | 'EGM' | 'Rights Issue' | 'Bonus Issue' | 'Stock Split' | 'Earnings Release' | 'Board Meeting';
  title: string;
  description: string;
  date: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  importance: 'high' | 'medium' | 'low';
}

export interface FinancialFigure {
  label: string;
  value: number | null;
  currency?: string;
  unit?: string;
  raw: string;
}

export interface FinancialDocument {
  ticker: string;
  company: string;
  title: string;
  url: string;
  summary: string;
  documentType?: string;
  publishedAt?: string;
  year?: number;
  period?: string;
  sector?: string;
  figures: FinancialFigure[];
  source: 'AfricanFinancials';
  sourceTicker?: string;
}

export interface IncomeStatementNode {
  id: string;
  label: string;
}

export interface IncomeStatementLink {
  source: string;
  target: string;
  value: number;
}

export interface IncomeStatement {
  year: number;
  period: string;
  currency: string;
  unit: string;
  nodes: IncomeStatementNode[];
  links: IncomeStatementLink[];
  source?: string;
  publishedAt?: string;
  figuresFound: string[];
}

export interface StockData {
  info: StockInfo;
  metrics: StockMetrics;
  news: NewsArticle[];
  sentiment: SentimentSummary;
  dividends: DividendAnnouncement[];
  corporateActions: CorporateAction[];
  financials?: FinancialDocument[];
  financialsMeta?: {
    updatedAt?: string;
    sourceUrl?: string;
  };
  incomeStatement?: IncomeStatement;
}

export const USE_STOCKS: StockInfo[] = [
  {
    ticker: 'MTN',
    name: 'MTN Uganda Limited',
    sector: 'Telecommunications',
    description: 'Uganda\'s leading telecommunications company providing mobile, data, and financial services.',
    currency: 'UGX'
  },
  {
    ticker: 'AIRTL',
    name: 'Airtel Uganda Limited',
    sector: 'Telecommunications',
    description: 'Major telecommunications provider offering mobile voice, data, and mobile money services in Uganda.',
    currency: 'UGX'
  },
  {
    ticker: 'SBU',
    name: 'Stanbic Bank Uganda',
    sector: 'Banking',
    description: 'A subsidiary of Standard Bank Group, providing comprehensive banking and financial services in Uganda.',
    currency: 'UGX'
  },
  {
    ticker: 'DFCU',
    name: 'DFCU Bank Limited',
    sector: 'Banking',
    description: 'One of Uganda\'s leading commercial banks offering retail, corporate, and investment banking services.',
    currency: 'UGX'
  },
  {
    ticker: 'BOBU',
    name: 'Bank of Baroda Uganda',
    sector: 'Banking',
    description: 'A subsidiary of Bank of Baroda (India), providing banking services in Uganda since 1953.',
    currency: 'UGX'
  },
  {
    ticker: 'EBU',
    name: 'Equity Bank Uganda',
    sector: 'Banking',
    description: 'A subsidiary of Equity Group Holdings, focused on financial inclusion and accessible banking.',
    currency: 'UGX'
  },
  {
    ticker: 'UCL',
    name: 'Uganda Clays Limited',
    sector: 'Manufacturing',
    description: 'Leading manufacturer of clay building products including roofing tiles and bricks in Uganda.',
    currency: 'UGX'
  },
  {
    ticker: 'NVU',
    name: 'New Vision Printing & Publishing',
    sector: 'Media',
    description: 'Uganda\'s leading media company publishing newspapers, operating radio and TV stations.',
    currency: 'UGX'
  },
  {
    ticker: 'NIC',
    name: 'National Insurance Corporation',
    sector: 'Insurance',
    description: 'Uganda\'s premier insurance company offering life and non-life insurance products.',
    currency: 'UGX'
  },
  {
    ticker: 'BATU',
    name: 'British American Tobacco Uganda',
    sector: 'Consumer Goods',
    description: 'Leading tobacco products manufacturer in Uganda, part of British American Tobacco plc.',
    currency: 'UGX'
  },
  {
    ticker: 'UMEME',
    name: 'Umeme Limited',
    sector: 'Utilities',
    description: 'Uganda\'s largest electricity distribution company, serving over 1.5 million customers nationwide.',
    currency: 'UGX'
  },
  {
    ticker: 'QCIL',
    name: 'Quality Chemicals Industries Ltd',
    sector: 'Healthcare',
    description: 'Leading pharmaceutical manufacturer in Uganda producing essential medicines and healthcare products.',
    currency: 'UGX'
  }
];
