import { StockData, NewsArticle, DividendAnnouncement, CorporateAction, SentimentSummary, StockMetrics } from '@/types/stock';

// ============================================================================
// USE STOCK DATA - Sourced from African Financials (africanfinancials.com),
// stockanalysis.com/ugse, and afx.kwayisi.org
// Last Updated: March 27, 2026
// ============================================================================

// Mock news articles for each USE stock
const stockNews: Record<string, NewsArticle[]> = {
  MTN: [
    {
      id: '1',
      title: 'MTN Uganda Reports Strong Q3 Revenue Growth',
      summary: 'MTN Uganda posted impressive results with revenue rising 18% driven by mobile money, data services, and subscriber growth across all segments.',
      source: 'New Vision',
      publishedAt: '2025-12-28',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.82
    },
    {
      id: '2',
      title: 'MTN Mobile Money Transactions Hit Record High',
      summary: 'Mobile money platform MoMo processes over 10 million transactions daily, cementing MTN\'s position as the leading fintech provider in Uganda.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-25',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.75
    },
    {
      id: '3',
      title: 'MTN Uganda Expands 4G/5G Network Coverage',
      summary: 'Company invests UGX 200 billion in network infrastructure, bringing high-speed internet to more rural areas across Uganda.',
      source: 'The Observer',
      publishedAt: '2025-12-22',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.68
    },
    {
      id: '4',
      title: 'Uganda Communications Commission Approves New Tariffs',
      summary: 'Regulatory changes allow telecom operators to adjust pricing, potentially benefiting MTN\'s revenue per user metrics.',
      source: 'New Vision',
      publishedAt: '2025-12-20',
      url: '#',
      sentiment: 'neutral',
      sentimentScore: 0.15
    },
    {
      id: '5',
      title: 'MTN Group Announces Strategic Investment in East Africa',
      summary: 'Parent company commits $500 million to expand operations across East African subsidiaries including Uganda.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-18',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.72
    }
  ],
  AIRTL: [
    {
      id: '1',
      title: 'Airtel Uganda Gains Market Share in Data Services',
      summary: 'Airtel reports significant growth in mobile data subscribers, narrowing the gap with competitors through competitive pricing.',
      source: 'New Vision',
      publishedAt: '2025-12-27',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.68
    },
    {
      id: '2',
      title: 'Airtel Money Launches New Cross-Border Payment Service',
      summary: 'New remittance corridors enable seamless money transfers between Uganda, Kenya, and Tanzania.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-24',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.62
    },
    {
      id: '3',
      title: 'Airtel Uganda Partners with Banks for Digital Payments',
      summary: 'Strategic partnerships with major banks enhance Airtel Money ecosystem and merchant payment acceptance.',
      source: 'The Observer',
      publishedAt: '2025-12-21',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.55
    },
    {
      id: '4',
      title: 'Bharti Airtel Africa Reports Regional Growth',
      summary: 'Parent company shows strong performance across African markets, with Uganda contributing to overall profitability.',
      source: 'New Vision',
      publishedAt: '2025-12-19',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.58
    },
    {
      id: '5',
      title: 'Airtel Uganda Launches 4G in 50 New Towns',
      summary: 'Network expansion brings faster internet to underserved areas, supporting digital inclusion initiatives.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-16',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.65
    }
  ],
  DFCU: [
    {
      id: '1',
      title: 'DFCU Bank Reports Strong Q3 2025 Earnings Growth',
      summary: 'DFCU Bank posted impressive results with net profit rising 15% on increased lending activity and digital banking adoption. The bank\'s asset quality remains strong with NPL ratio declining.',
      source: 'New Vision',
      publishedAt: '2025-12-28',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.78
    },
    {
      id: '2',
      title: 'DFCU Bank Expands Digital Banking Services Across Uganda',
      summary: 'The bank launches new mobile banking features including instant loans and QR payments to enhance customer experience and financial inclusion in rural areas.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-25',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.65
    },
    {
      id: '3',
      title: 'DFCU Bank Partners with Uganda Revenue Authority',
      summary: 'Strategic partnership aims to simplify tax payments through digital channels, making it easier for businesses and individuals to meet their tax obligations.',
      source: 'The Observer',
      publishedAt: '2025-12-22',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.52
    },
    {
      id: '4',
      title: 'Bank of Uganda Announces New Capital Requirements',
      summary: 'Central bank raises minimum capital requirements for commercial banks. DFCU Bank confirms it already exceeds the new thresholds with comfortable margins.',
      source: 'New Vision',
      publishedAt: '2025-12-20',
      url: '#',
      sentiment: 'neutral',
      sentimentScore: 0.12
    },
    {
      id: '5',
      title: 'DFCU Bank Receives Award for Customer Service Excellence',
      summary: 'The bank recognized for outstanding customer experience initiatives and innovative digital solutions at the Uganda Banking Awards 2025.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-18',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.82
    }
  ],
  SBU: [
    {
      id: '1',
      title: 'Stanbic Bank Uganda Posts Record Annual Profits',
      summary: 'The bank reports its highest ever annual profit driven by strong performance in trade finance, corporate banking, and wealth management divisions.',
      source: 'New Vision',
      publishedAt: '2025-12-27',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.85
    },
    {
      id: '2',
      title: 'Stanbic Uganda Launches Green Finance Initiative',
      summary: 'New sustainability program offers preferential rates for environmentally friendly business projects and renewable energy investments.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-24',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.68
    },
    {
      id: '3',
      title: 'Stanbic Bank Expands Branch Network in Northern Uganda',
      summary: 'Bank opens three new branches in Gulu, Lira, and Arua to improve accessibility and support economic development in the region.',
      source: 'The Observer',
      publishedAt: '2025-12-21',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.55
    },
    {
      id: '4',
      title: 'Uganda Shilling Strengthens Against Dollar',
      summary: 'Currency gains 2% against USD, benefiting import-dependent businesses. Banking sector sees increased forex trading activity.',
      source: 'New Vision',
      publishedAt: '2025-12-19',
      url: '#',
      sentiment: 'neutral',
      sentimentScore: 0.08
    },
    {
      id: '5',
      title: 'Stanbic Uganda Wins Best Bank in Trade Finance Award',
      summary: 'Recognition for excellence in cross-border trade services and support for Ugandan exporters accessing regional and international markets.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-16',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.75
    }
  ],
  UCL: [
    {
      id: '1',
      title: 'Uganda Clays Reports Revenue Growth Despite Challenges',
      summary: 'The company shows resilience with increased sales in construction materials despite rising energy costs. Management optimistic about infrastructure projects pipeline.',
      source: 'New Vision',
      publishedAt: '2025-12-26',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.45
    },
    {
      id: '2',
      title: 'Uganda Clays Invests in New Production Technology',
      summary: 'Modernization program aims to increase efficiency and product quality with new kilns and automation equipment from Europe.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-23',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.62
    },
    {
      id: '3',
      title: 'Construction Boom Drives Demand for Building Materials',
      summary: 'Housing sector growth and government infrastructure projects create strong demand for clay products. Uganda Clays positioned to benefit.',
      source: 'The Observer',
      publishedAt: '2025-12-20',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.58
    },
    {
      id: '4',
      title: 'Energy Costs Impact Manufacturing Sector Margins',
      summary: 'Rising electricity tariffs affect production costs across the manufacturing sector. Companies explore renewable energy alternatives.',
      source: 'New Vision',
      publishedAt: '2025-12-17',
      url: '#',
      sentiment: 'negative',
      sentimentScore: -0.35
    },
    {
      id: '5',
      title: 'Uganda Clays Expands Distribution Network',
      summary: 'Company strengthens presence in Eastern Uganda markets with new depot in Mbale and partnerships with hardware retailers.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-15',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.48
    }
  ],
  NVU: [
    {
      id: '1',
      title: 'New Vision Group Reports Strong Digital Revenue Growth',
      summary: 'Digital advertising and online subscriptions drive 25% revenue increase in digital segment, offsetting decline in print advertising.',
      source: 'New Vision',
      publishedAt: '2025-12-28',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.72
    },
    {
      id: '2',
      title: 'New Vision Launches New Mobile News App',
      summary: 'Company expands digital presence with redesigned app featuring personalized content, video streaming, and interactive features.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-24',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.55
    },
    {
      id: '3',
      title: 'New Vision Printing Wins Major Government Contract',
      summary: 'Commercial printing division secures multi-year contract for government publications and educational materials.',
      source: 'The Observer',
      publishedAt: '2025-12-21',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.68
    },
    {
      id: '4',
      title: 'Advertising Industry Faces Digital Disruption',
      summary: 'Traditional media companies adapt to changing landscape as advertisers shift budgets to social media and digital platforms.',
      source: 'New Vision',
      publishedAt: '2025-12-18',
      url: '#',
      sentiment: 'neutral',
      sentimentScore: -0.05
    },
    {
      id: '5',
      title: 'New Vision Radio Stations Expand Coverage',
      summary: 'Network of regional radio stations receives new broadcasting equipment, improving signal quality and reach across Uganda.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-15',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.42
    }
  ],
  BOBU: [
    {
      id: '1',
      title: 'Bank of Baroda Uganda Shows Steady Growth',
      summary: 'The bank maintains stable performance in competitive market with focus on trade finance and diaspora banking services.',
      source: 'New Vision',
      publishedAt: '2025-12-27',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.48
    },
    {
      id: '2',
      title: 'Bank of Baroda Uganda Launches Trade Finance Solutions',
      summary: 'New services target importers and exporters with faster processing and competitive rates for letters of credit and guarantees.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-23',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.55
    },
    {
      id: '3',
      title: 'Bank of Baroda Expands Digital Services',
      summary: 'Mobile banking adoption increases among customers as bank introduces new features and improves user experience.',
      source: 'The Observer',
      publishedAt: '2025-12-20',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.45
    },
    {
      id: '4',
      title: 'Indian Investment in Uganda Increases',
      summary: 'Growing trade ties between India and Uganda benefit Bank of Baroda as the preferred banking partner for Indian businesses.',
      source: 'New Vision',
      publishedAt: '2025-12-17',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.52
    }
  ],
  EBU: [
    {
      id: '1',
      title: 'Equity Bank Uganda Expands Rural Banking Network',
      summary: 'Agency banking network reaches more Ugandan communities with over 500 new agents deployed in underserved areas.',
      source: 'New Vision',
      publishedAt: '2025-12-28',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.72
    },
    {
      id: '2',
      title: 'Equity Bank Uganda Reports Strong Loan Growth',
      summary: 'Credit portfolio expands 20% with focus on agriculture and SME lending, supporting economic development across sectors.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-25',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.68
    },
    {
      id: '3',
      title: 'Equity Bank Uganda Launches Financial Literacy Program',
      summary: 'Initiative aims to improve financial education across Uganda with workshops in schools and community centers.',
      source: 'The Observer',
      publishedAt: '2025-12-22',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.58
    },
    {
      id: '4',
      title: 'Equity Group Holdings Reports Pan-African Growth',
      summary: 'Parent company shows strong performance across subsidiaries, with Uganda operations contributing significantly to group profits.',
      source: 'New Vision',
      publishedAt: '2025-12-19',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.65
    },
    {
      id: '5',
      title: 'Equity Bank Uganda Wins Innovation Award',
      summary: 'Recognition for digital banking solutions and customer service excellence at the East African Banking Excellence Awards.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-16',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.75
    }
  ],
  NIC: [
    {
      id: '1',
      title: 'National Insurance Corporation Reports Premium Growth',
      summary: 'NIC shows strong performance with gross written premiums increasing 18% driven by corporate and health insurance segments.',
      source: 'New Vision',
      publishedAt: '2025-12-27',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.65
    },
    {
      id: '2',
      title: 'NIC Launches New Health Insurance Products',
      summary: 'Company expands product range with affordable health insurance options targeting middle-income earners and families.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-24',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.58
    },
    {
      id: '3',
      title: 'Insurance Penetration in Uganda Remains Low',
      summary: 'Industry stakeholders call for regulatory reforms and public awareness campaigns to boost insurance adoption.',
      source: 'The Observer',
      publishedAt: '2025-12-21',
      url: '#',
      sentiment: 'neutral',
      sentimentScore: 0.05
    },
    {
      id: '4',
      title: 'NIC Partners with Microfinance Institutions',
      summary: 'Collaboration aims to provide micro-insurance products to underserved populations through existing microfinance networks.',
      source: 'New Vision',
      publishedAt: '2025-12-18',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.52
    }
  ],
  BATU: [
    {
      id: '1',
      title: 'British American Tobacco Uganda Maintains Market Leadership',
      summary: 'Company retains dominant market position despite increased competition and regulatory challenges in the tobacco industry.',
      source: 'New Vision',
      publishedAt: '2025-12-26',
      url: '#',
      sentiment: 'neutral',
      sentimentScore: 0.15
    },
    {
      id: '2',
      title: 'BATU Invests in Sustainable Tobacco Farming',
      summary: 'Company supports farmers with sustainable agriculture practices and alternative income programs in tobacco-growing regions.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-23',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.45
    },
    {
      id: '3',
      title: 'New Tobacco Tax Regulations Take Effect',
      summary: 'Government increases excise duty on tobacco products, impacting pricing and potentially affecting sales volumes.',
      source: 'The Observer',
      publishedAt: '2025-12-20',
      url: '#',
      sentiment: 'negative',
      sentimentScore: -0.42
    },
    {
      id: '4',
      title: 'BATU Announces Dividend Despite Challenges',
      summary: 'Company declares dividend to shareholders, demonstrating financial resilience despite regulatory headwinds.',
      source: 'New Vision',
      publishedAt: '2025-12-17',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.55
    }
  ],
  UMEME: [
    {
      id: '1',
      title: 'Umeme Concession Renewal Under Discussion',
      summary: 'Government and Umeme in talks regarding the electricity distribution concession that expires in 2025. Stakeholders await outcome.',
      source: 'New Vision',
      publishedAt: '2025-12-28',
      url: '#',
      sentiment: 'neutral',
      sentimentScore: 0.05
    },
    {
      id: '2',
      title: 'Umeme Reports Increase in Power Connections',
      summary: 'Electricity distributor connects 150,000 new customers in 2025, expanding access across urban and rural Uganda.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-24',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.58
    },
    {
      id: '3',
      title: 'Umeme Reduces Power Losses Through Smart Metering',
      summary: 'Advanced metering infrastructure helps reduce technical and commercial losses, improving operational efficiency.',
      source: 'The Observer',
      publishedAt: '2025-12-21',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.52
    },
    {
      id: '4',
      title: 'Electricity Tariff Review Impacts Umeme Revenue',
      summary: 'Regulatory tariff adjustments affect company margins as cost recovery mechanisms are recalibrated.',
      source: 'New Vision',
      publishedAt: '2025-12-18',
      url: '#',
      sentiment: 'negative',
      sentimentScore: -0.35
    },
    {
      id: '5',
      title: 'Umeme Declares High Dividend Yield',
      summary: 'Company maintains attractive dividend policy, offering one of the highest yields on the USE.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-15',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.68
    }
  ],
  QCIL: [
    {
      id: '1',
      title: 'QCIL Reports Strong Revenue Growth in Pharmaceutical Sales',
      summary: 'Quality Chemicals Industries Limited posts impressive results with revenue rising 22% on increased demand for locally manufactured medicines.',
      source: 'New Vision',
      publishedAt: '2025-12-28',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.75
    },
    {
      id: '2',
      title: 'QCIL Expands Manufacturing Capacity with New Production Line',
      summary: 'Company invests in new pharmaceutical production equipment to meet growing regional demand for essential medicines.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-25',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.68
    },
    {
      id: '3',
      title: 'QCIL Partners with Government for Essential Medicine Supply',
      summary: 'Strategic agreement with Ministry of Health ensures steady demand for locally produced pharmaceuticals.',
      source: 'The Observer',
      publishedAt: '2025-12-22',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.62
    },
    {
      id: '4',
      title: 'QCIL Receives WHO Prequalification for New Products',
      summary: 'World Health Organization approval opens export markets for Quality Chemicals pharmaceutical products.',
      source: 'New Vision',
      publishedAt: '2025-12-19',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.78
    },
    {
      id: '5',
      title: 'QCIL Launches Affordable Healthcare Initiative',
      summary: 'Company introduces discounted medicine programs for underserved communities across Uganda.',
      source: 'Daily Monitor',
      publishedAt: '2025-12-16',
      url: '#',
      sentiment: 'positive',
      sentimentScore: 0.55
    }
  ]
};

// Mock metrics for each stock (prices in UGX - sourced from African Financials Dec 31, 2025)
// Source: https://africanfinancials.com/uganda-securities-exchange-share-prices/
// ============================================================================
// Prices, P/E ratios, and market caps verified against stockanalysis.com/ugse
// and afx.kwayisi.org as of March 2026.
// Dividend yields recalculated using verified prices.
// ============================================================================
const stockMetrics: Record<string, StockMetrics> = {
  MTN: {
    currentPrice: 476.75,
    change: 0,
    changePercent: 0.00,
    high52Week: 510,
    low52Week: 280,
    marketCap: 'UGX 10.67T',
    volume: 1100,
    avgVolume: 950000,
    peRatio: 15.73,
    dividendYield: 4.7, // FY2024 total: UGX 22.60/share (6.60+7.50+8.50) ÷ 476.75
    lastUpdated: new Date().toISOString()
  },
  AIRTL: {
    currentPrice: 123.73,
    change: 0,
    changePercent: 0.00,
    high52Week: 135,
    low52Week: 75,
    marketCap: 'UGX 5.4T',
    volume: 0,
    avgVolume: 580000,
    peRatio: 14.9,
    dividendYield: 6.4, // FY2024 total: UGX 7.88/share ÷ 123.73
    lastUpdated: new Date().toISOString()
  },
  SBU: {
    currentPrice: 80.00,
    change: 0,
    changePercent: 0.00,
    high52Week: 85,
    low52Week: 47,
    marketCap: 'UGX 4.10T',
    volume: 11200,
    avgVolume: 15000,
    peRatio: 6.93,
    dividendYield: 7.3, // FY2024 total: UGX 5.86/share (2.73 interim + 3.13 final) ÷ 80.00
    lastUpdated: new Date().toISOString()
  },
  DFCU: {
    currentPrice: 307.00,
    change: 0,
    changePercent: 0.00,
    high52Week: 380,
    low52Week: 245,
    marketCap: 'UGX 229.7B',
    volume: 0,
    avgVolume: 98000,
    peRatio: 3.58,
    dividendYield: 6.5, // FY2024 final: UGX 20.09/share ÷ 307 (record dividend, +121% vs FY2023)
    lastUpdated: new Date().toISOString()
  },
  BOBU: {
    currentPrice: 49.00,
    change: 0,
    changePercent: 0.00,
    high52Week: 63,
    low52Week: 40,
    marketCap: 'UGX 735B',
    volume: 35000,
    avgVolume: 28000,
    peRatio: 5.49,
    dividendYield: 8.2, // FY2024 final: UGX 4.00/share ÷ 49.00 (doubled vs FY2023)
    lastUpdated: new Date().toISOString()
  },
  EBU: {
    currentPrice: 32,
    change: 0.8,
    changePercent: 2.56,
    high52Week: 42,
    low52Week: 25,
    marketCap: 'UGX 128B',
    volume: 180000,
    avgVolume: 150000,
    peRatio: 8.5,
    dividendYield: 2.4,
    lastUpdated: new Date().toISOString()
  },
  UCL: {
    currentPrice: 4.50,
    change: 0,
    changePercent: 0.00,
    high52Week: 9,
    low52Week: 3,
    marketCap: 'UGX 4.1B', // ~900M shares × UGX 4.50
    volume: 0,
    avgVolume: 180000,
    peRatio: 0, // N/A — net loss in FY2024 (EPS: -5.50)
    dividendYield: 0, // No dividend declared since FY2021 (last paid Jul 2022); net loss in FY2024
    lastUpdated: new Date().toISOString()
  },
  NVU: {
    currentPrice: 149.00,
    change: 0,
    changePercent: 0.00,
    high52Week: 185,
    low52Week: 115,
    marketCap: 'UGX 11.4B', // ~76.5M shares × UGX 149
    volume: 0,
    avgVolume: 65000,
    peRatio: 0, // N/A — net loss in FY2024 (EPS: -132.87)
    dividendYield: 0, // No dividend since FY2020 (last paid Jan 2021); losses of UGX 10.16B in FY2024
    lastUpdated: new Date().toISOString()
  },
  NIC: {
    currentPrice: 5.00,
    change: 0,
    changePercent: 0,
    high52Week: 18,
    low52Week: 5,
    marketCap: 'UGX 10.6B', // 2.12B shares × UGX 5.00 — confirmed African Financials
    volume: 95000,
    avgVolume: 78000,
    peRatio: 81.8, // EPS: UGX 0.22 — thin profitability; FY2024 net income UGX 477M
    dividendYield: 0, // No dividend since FY2022 (last paid Sep 2023); FY2023 loss; FY2024 PAT too slim
    lastUpdated: new Date().toISOString()
  },
  BATU: {
    currentPrice: 12500,
    change: 0,
    changePercent: 0.00,
    high52Week: 15000,
    low52Week: 10000,
    marketCap: 'UGX 613.5B', // ~49.08M shares × UGX 12,500
    volume: 8500,
    avgVolume: 7200,
    peRatio: 59.53, // EPS: UGX 209.99 — FY2024 net income UGX 10.3B
    dividendYield: 1.7, // FY2024 final: UGX 210/share ÷ 12,500 = 1.68%; FY2025: UGX 199 (upcoming Jul 2026)
    lastUpdated: new Date().toISOString()
  },
  UMEME: {
    currentPrice: 57.80,
    change: 0,
    changePercent: 0.00,
    high52Week: 420,
    low52Week: 50,
    marketCap: 'UGX 93.86B', // post-concession expiry; price reflects wind-down
    volume: 250000,
    avgVolume: 200000,
    peRatio: 0, // N/A — net loss FY2024 (EPS: -425.06); concession ended
    dividendYield: 0, // No recurring dividend; FY2024 loss; UGX 222 special was one-off concession payout
    lastUpdated: new Date().toISOString()
  },
  QCIL: {
    currentPrice: 122.00,
    change: 0,
    changePercent: 0.00,
    high52Week: 145,
    low52Week: 80,
    marketCap: 'UGX 445.53B',
    volume: 320000,
    avgVolume: 280000,
    peRatio: 10.49,
    dividendYield: 9.5, // FY2025 total: UGX 11.60/share (4.10+3.50+4.00) ÷ 122.00; pays quarterly
    lastUpdated: new Date().toISOString()
  }
};

// Mock dividends for each stock
// Sources: africanfinancials.com, stockanalysis.com/ugse, company IR pages, USE announcements
// Last verified: March 2026
const stockDividends: Record<string, DividendAnnouncement[]> = {
  MTN: [
    // Source: africanfinancials.com / mtn.co.ug — pays 3 tranches/year (Q2 interim, Q3 interim, final)
    {
      id: '1',
      type: 'interim',
      amount: 6.60,
      currency: 'UGX',
      exDividendDate: '2024-08-28',
      paymentDate: '2024-09-20',
      recordDate: '2024-09-01',
      status: 'paid',
      year: 2024
    },
    {
      id: '2',
      type: 'interim',
      amount: 7.50,
      currency: 'UGX',
      exDividendDate: '2024-11-22',
      paymentDate: '2024-12-16',
      recordDate: '2024-11-26',
      status: 'paid',
      year: 2024
    },
    {
      id: '3',
      type: 'final',
      amount: 8.50,
      currency: 'UGX',
      exDividendDate: '2025-05-28',
      paymentDate: '2025-06-20',
      recordDate: '2025-06-02',
      status: 'paid',
      year: 2024
    },
    {
      id: '4',
      type: 'interim',
      amount: 10.00,
      currency: 'UGX',
      exDividendDate: '2025-08-27',
      paymentDate: '2025-09-19',
      recordDate: '2025-09-01',
      status: 'paid',
      year: 2025
    },
    {
      id: '5',
      type: 'interim',
      amount: 10.50,
      currency: 'UGX',
      exDividendDate: '2025-11-26',
      paymentDate: '2025-12-19',
      recordDate: '2025-12-01',
      status: 'paid',
      year: 2025
    },
    {
      id: '6',
      type: 'final',
      amount: 8.25,
      currency: 'UGX',
      exDividendDate: '2026-04-07',
      paymentDate: '2026-04-30',
      recordDate: '2026-04-10',
      status: 'upcoming',
      year: 2025
    }
  ],
  AIRTL: [
    // Source: africanfinancials.com / techafricanews.com — pays quarterly at ≥95% net profit payout ratio
    {
      id: '1',
      type: 'interim',
      amount: 2.15,
      currency: 'UGX',
      exDividendDate: '2024-08-01',
      paymentDate: '2024-09-01',
      recordDate: '2024-08-05',
      status: 'paid',
      year: 2024
    },
    {
      id: '2',
      type: 'interim',
      amount: 2.075,
      currency: 'UGX',
      exDividendDate: '2024-11-20',
      paymentDate: '2025-01-03',
      recordDate: '2024-12-16',
      status: 'paid',
      year: 2024
    },
    {
      id: '3',
      type: 'final',
      amount: 2.50,
      currency: 'UGX',
      exDividendDate: '2025-04-08',
      paymentDate: '2025-04-28',
      recordDate: '2025-04-08',
      status: 'paid',
      year: 2024
    },
    {
      id: '4',
      type: 'final',
      amount: 3.55,
      currency: 'UGX',
      exDividendDate: '2026-04-01',
      paymentDate: '2026-04-29',
      recordDate: '2026-04-08',
      status: 'upcoming',
      year: 2025
    }
  ],
  DFCU: [
    // Source: independent.co.ug / redpepper.co.ug — annual final dividend only
    {
      id: '1',
      type: 'final',
      amount: 9.10,
      currency: 'UGX',
      exDividendDate: '2024-08-01',
      paymentDate: '2024-08-30',
      recordDate: '2024-08-02',
      status: 'paid',
      year: 2023
    },
    {
      id: '2',
      type: 'final',
      amount: 20.09,
      currency: 'UGX',
      exDividendDate: '2025-08-01',
      paymentDate: '2025-08-30',
      recordDate: '2025-08-08',
      status: 'paid',
      year: 2024  // Record dividend; +121% vs FY2023 on 151% profit growth
    }
  ],
  SBU: [
    // Source: africanfinancials.com / kenyanwallstreet.com — pays semi-annually (interim ~Oct, final ~Jun)
    {
      id: '1',
      type: 'interim',
      amount: 2.73,
      currency: 'UGX',
      exDividendDate: '2024-10-22',
      paymentDate: '2024-11-12',
      recordDate: '2024-10-24',
      status: 'paid',
      year: 2024
    },
    {
      id: '2',
      type: 'final',
      amount: 3.13,
      currency: 'UGX',
      exDividendDate: '2025-06-04',
      paymentDate: '2025-06-27',
      recordDate: '2025-06-06',
      status: 'paid',
      year: 2024
    },
    {
      id: '3',
      type: 'interim',
      amount: 2.73,
      currency: 'UGX',
      exDividendDate: '2025-10-17',
      paymentDate: '2025-11-19',
      recordDate: '2025-10-21',
      status: 'paid',
      year: 2025
    }
  ],
  UCL: [
    // Source: stockanalysis.com/ugse/UCL — NO dividend since FY2021; net loss UGX 4.95B in FY2024
    {
      id: '1',
      type: 'final',
      amount: 1.50,
      currency: 'UGX',
      exDividendDate: '2022-06-27',
      paymentDate: '2022-07-20',
      recordDate: '2022-06-29',
      status: 'paid',
      year: 2021  // Last dividend paid; none declared for FY2022, FY2023, or FY2024
    }
  ],
  NVU: [
    // Source: stockanalysis.com/ugse/NVL — NO dividend since FY2020; losses of UGX 10.16B in FY2024
    {
      id: '1',
      type: 'final',
      amount: 18.00,
      currency: 'UGX',
      exDividendDate: '2020-12-29',
      paymentDate: '2021-01-23',
      recordDate: '2021-01-02',
      status: 'paid',
      year: 2020  // Last dividend paid; none declared for FY2021 through FY2025
    }
  ],
  BOBU: [
    // Source: stockanalysis.com/ugse/BOBU — annual final dividend
    {
      id: '1',
      type: 'final',
      amount: 2.00,
      currency: 'UGX',
      exDividendDate: '2024-08-02',
      paymentDate: '2024-08-23',
      recordDate: '2024-08-06',
      status: 'paid',
      year: 2023
    },
    {
      id: '2',
      type: 'final',
      amount: 4.00,
      currency: 'UGX',
      exDividendDate: '2025-07-28',
      paymentDate: '2025-08-20',
      recordDate: '2025-07-30',
      status: 'paid',
      year: 2024  // Doubled vs FY2023
    }
  ],
  EBU: [
    // Note: EBU (Equity Bank Uganda Ltd subsidiary) — Uganda-specific dividend data pending confirmation
    {
      id: '1',
      type: 'final',
      amount: 0.8,
      currency: 'UGX',
      exDividendDate: '2025-06-20',
      paymentDate: '2025-07-05',
      recordDate: '2025-06-25',
      status: 'paid',
      year: 2024
    }
  ],
  NIC: [
    // Source: nic.co.ug / stockanalysis.com/ugse/NIC — NO dividend in FY2023 (loss) or FY2024 (slim profit)
    {
      id: '1',
      type: 'final',
      amount: 1.00,
      currency: 'UGX',
      exDividendDate: '2023-08-29',
      paymentDate: '2023-09-14',
      recordDate: '2023-08-31',
      status: 'paid',
      year: 2022  // Last dividend paid; none for FY2023 (loss) or FY2024
    }
  ],
  BATU: [
    // Source: stockanalysis.com/ugse/BATU / ceo.co.ug — annual final dividend only (pays ~July each year)
    {
      id: '1',
      type: 'final',
      amount: 181.00,
      currency: 'UGX',
      exDividendDate: '2024-07-24',
      paymentDate: '2024-07-30',
      recordDate: '2024-07-26',
      status: 'paid',
      year: 2023
    },
    {
      id: '2',
      type: 'final',
      amount: 210.00,
      currency: 'UGX',
      exDividendDate: '2025-07-23',
      paymentDate: '2025-07-30',
      recordDate: '2025-07-25',
      status: 'paid',
      year: 2024
    },
    {
      id: '3',
      type: 'final',
      amount: 199.00,
      currency: 'UGX',
      exDividendDate: '2026-07-24',
      paymentDate: '2026-07-31',
      recordDate: '2026-07-24',
      status: 'upcoming',
      year: 2025  // Lower than FY2024 due to illicit cigarette trade pressure on profit
    }
  ],
  UMEME: [
    // Source: mwangocapital.substack.com / stockanalysis.com/ugse/UMEM
    // Concession ended 31 Mar 2025; UGX 222 special was one-off from $118M govt compensation
    {
      id: '1',
      type: 'final',
      amount: 54.20,
      currency: 'UGX',
      exDividendDate: '2024-06-26',
      paymentDate: '2024-07-19',
      recordDate: '2024-06-28',
      status: 'paid',
      year: 2023
    },
    {
      id: '2',
      type: 'interim',
      amount: 26.00,
      currency: 'UGX',
      exDividendDate: '2024-10-07',
      paymentDate: '2024-10-31',
      recordDate: '2024-10-10',
      status: 'paid',
      year: 2024
    },
    {
      id: '3',
      type: 'special',
      amount: 222.00,
      currency: 'UGX',
      exDividendDate: '2025-07-10',
      paymentDate: '2025-07-31',
      recordDate: '2025-07-14',
      status: 'paid',
      year: 2024  // One-off: recovery of $118M from govt after concession termination
    }
  ],
  QCIL: [
    // Source: stockanalysis.com/ugse/QCIL / nilepost.co.ug — March year-end; pays multiple interims/year
    {
      id: '1',
      type: 'interim',
      amount: 4.10,
      currency: 'UGX',
      exDividendDate: '2024-07-24',
      paymentDate: '2024-07-31',
      recordDate: '2024-07-26',
      status: 'paid',
      year: 2025  // FY2025 Q1 (Apr–Jun 2024)
    },
    {
      id: '2',
      type: 'interim',
      amount: 3.50,
      currency: 'UGX',
      exDividendDate: '2024-11-27',
      paymentDate: '2024-12-12',
      recordDate: '2024-11-29',
      status: 'paid',
      year: 2025  // FY2025 Q2 (Jul–Sep 2024)
    },
    {
      id: '3',
      type: 'final',
      amount: 4.00,
      currency: 'UGX',
      exDividendDate: '2025-02-27',
      paymentDate: '2025-03-14',
      recordDate: '2025-03-03',
      status: 'paid',
      year: 2025  // FY2025 final (year ended 31 Mar 2025); FY2025 total = UGX 11.60/share
    },
    {
      id: '4',
      type: 'interim',
      amount: 6.00,
      currency: 'UGX',
      exDividendDate: '2025-08-05',
      paymentDate: '2025-08-14',
      recordDate: '2025-08-07',
      status: 'paid',
      year: 2026  // FY2026 Q1 (Apr–Jun 2025)
    },
    {
      id: '5',
      type: 'interim',
      amount: 3.57,
      currency: 'UGX',
      exDividendDate: '2025-11-21',
      paymentDate: '2025-12-05',
      recordDate: '2025-11-25',
      status: 'paid',
      year: 2026  // FY2026 Q2 (Jul–Sep 2025)
    },
    {
      id: '6',
      type: 'interim',
      amount: 6.00,
      currency: 'UGX',
      exDividendDate: '2026-02-24',
      paymentDate: '2026-03-05',
      recordDate: '2026-02-26',
      status: 'paid',
      year: 2026  // FY2026 Q3 — special component from Zambia receivable recovery
    }
  ]
};

// Mock corporate actions
const stockCorporateActions: Record<string, CorporateAction[]> = {
  MTN: [
    {
      id: '1',
      type: 'AGM',
      title: 'Annual General Meeting 2025',
      description: 'Shareholders to approve 2024 financial statements, dividends, and elect board members.',
      date: '2025-05-20',
      status: 'completed',
      importance: 'high'
    },
    {
      id: '2',
      type: 'Earnings Release',
      title: 'Q4 2025 Results Announcement',
      description: 'Quarterly earnings report with subscriber growth and mobile money metrics.',
      date: '2026-02-20',
      status: 'upcoming',
      importance: 'high'
    },
    {
      id: '3',
      type: 'Board Meeting',
      title: 'Strategic Planning Meeting',
      description: 'Board to review 2026 investment plans and network expansion strategy.',
      date: '2026-01-15',
      status: 'upcoming',
      importance: 'medium'
    }
  ],
  AIRTL: [
    {
      id: '1',
      type: 'AGM',
      title: 'Annual General Meeting 2025',
      description: 'Shareholders meeting to approve financial statements and dividend distribution.',
      date: '2025-06-15',
      status: 'completed',
      importance: 'high'
    },
    {
      id: '2',
      type: 'Earnings Release',
      title: 'Full Year 2025 Results',
      description: 'Annual financial results with focus on subscriber growth and ARPU metrics.',
      date: '2026-02-25',
      status: 'upcoming',
      importance: 'high'
    },
    {
      id: '3',
      type: 'Rights Issue',
      title: 'Planned Capital Raise',
      description: 'Proposed rights issue to fund network expansion and spectrum acquisition.',
      date: '2026-03-20',
      status: 'upcoming',
      importance: 'high'
    }
  ],
  DFCU: [
    {
      id: '1',
      type: 'AGM',
      title: 'Annual General Meeting 2025',
      description: 'Shareholders to approve 2024 financial statements and elect board members.',
      date: '2025-05-28',
      status: 'completed',
      importance: 'high'
    },
    {
      id: '2',
      type: 'Earnings Release',
      title: 'Q4 2025 Results Announcement',
      description: 'Quarterly earnings report for the period ending December 2025.',
      date: '2026-02-15',
      status: 'upcoming',
      importance: 'high'
    },
    {
      id: '3',
      type: 'Board Meeting',
      title: 'Board of Directors Meeting',
      description: 'Regular board meeting to review performance and strategic initiatives.',
      date: '2026-01-20',
      status: 'upcoming',
      importance: 'medium'
    }
  ],
  SBU: [
    {
      id: '1',
      type: 'AGM',
      title: 'Annual General Meeting 2025',
      description: 'Shareholders meeting to approve dividends and financial statements.',
      date: '2025-05-15',
      status: 'completed',
      importance: 'high'
    },
    {
      id: '2',
      type: 'Earnings Release',
      title: 'Full Year 2025 Results',
      description: 'Annual financial results announcement for fiscal year 2025.',
      date: '2026-02-28',
      status: 'upcoming',
      importance: 'high'
    },
    {
      id: '3',
      type: 'Rights Issue',
      title: 'Proposed Rights Issue',
      description: 'Planned capital raise to support expansion and meet regulatory requirements.',
      date: '2026-03-15',
      status: 'upcoming',
      importance: 'high'
    }
  ],
  UCL: [
    {
      id: '1',
      type: 'AGM',
      title: 'Annual General Meeting 2025',
      description: 'Shareholders to approve annual report and dividend distribution.',
      date: '2025-06-10',
      status: 'completed',
      importance: 'high'
    },
    {
      id: '2',
      type: 'Earnings Release',
      title: 'H2 2025 Results',
      description: 'Half-year financial results for July-December 2025.',
      date: '2026-02-20',
      status: 'upcoming',
      importance: 'medium'
    }
  ],
  NVU: [
    {
      id: '1',
      type: 'AGM',
      title: 'Annual General Meeting 2025',
      description: 'Shareholders meeting to review performance and approve dividends.',
      date: '2025-05-30',
      status: 'completed',
      importance: 'high'
    },
    {
      id: '2',
      type: 'Earnings Release',
      title: 'Q4 2025 Financial Results',
      description: 'Quarterly earnings announcement with digital revenue breakdown.',
      date: '2026-02-10',
      status: 'upcoming',
      importance: 'high'
    }
  ],
  BOBU: [
    {
      id: '1',
      type: 'AGM',
      title: 'Annual General Meeting 2025',
      description: 'Shareholders to approve financial statements and elect directors.',
      date: '2025-05-25',
      status: 'completed',
      importance: 'high'
    },
    {
      id: '2',
      type: 'Earnings Release',
      title: 'Annual Results 2025',
      description: 'Full year financial results announcement.',
      date: '2026-03-01',
      status: 'upcoming',
      importance: 'high'
    }
  ],
  EBU: [
    {
      id: '1',
      type: 'AGM',
      title: 'Annual General Meeting 2025',
      description: 'Shareholders meeting to approve dividends and strategic plans.',
      date: '2025-06-05',
      status: 'completed',
      importance: 'high'
    },
    {
      id: '2',
      type: 'Earnings Release',
      title: 'FY 2025 Results',
      description: 'Annual financial results with focus on growth metrics.',
      date: '2026-02-25',
      status: 'upcoming',
      importance: 'high'
    },
    {
      id: '3',
      type: 'Bonus Issue',
      title: 'Proposed Bonus Share Issue',
      description: 'Board considering bonus shares to reward shareholders.',
      date: '2026-04-01',
      status: 'upcoming',
      importance: 'medium'
    }
  ],
  NIC: [
    {
      id: '1',
      type: 'AGM',
      title: 'Annual General Meeting 2025',
      description: 'Shareholders meeting to review insurance performance.',
      date: '2025-06-15',
      status: 'completed',
      importance: 'high'
    },
    {
      id: '2',
      type: 'Earnings Release',
      title: 'Annual Results 2025',
      description: 'Full year insurance premium and claims report.',
      date: '2026-03-10',
      status: 'upcoming',
      importance: 'high'
    }
  ],
  BATU: [
    {
      id: '1',
      type: 'AGM',
      title: 'Annual General Meeting 2025',
      description: 'Shareholders to approve financial statements and dividend.',
      date: '2025-05-20',
      status: 'completed',
      importance: 'high'
    },
    {
      id: '2',
      type: 'Earnings Release',
      title: 'FY 2025 Financial Results',
      description: 'Annual earnings with regulatory impact analysis.',
      date: '2026-02-18',
      status: 'upcoming',
      importance: 'high'
    }
  ],
  UMEME: [
    {
      id: '1',
      type: 'AGM',
      title: 'Annual General Meeting 2025',
      description: 'Shareholders to approve financial statements and concession renewal updates.',
      date: '2025-05-28',
      status: 'completed',
      importance: 'high'
    },
    {
      id: '2',
      type: 'Earnings Release',
      title: 'FY 2025 Financial Results',
      description: 'Annual financial results with focus on concession developments.',
      date: '2026-02-22',
      status: 'upcoming',
      importance: 'high'
    },
    {
      id: '3',
      type: 'Board Meeting',
      title: 'Concession Review Meeting',
      description: 'Board to discuss government negotiations on distribution concession renewal.',
      date: '2026-01-18',
      status: 'upcoming',
      importance: 'high'
    }
  ],
  QCIL: [
    {
      id: '1',
      type: 'AGM',
      title: 'Annual General Meeting 2025',
      description: 'Shareholders to approve financial statements and dividend distribution.',
      date: '2025-06-12',
      status: 'completed',
      importance: 'high'
    },
    {
      id: '2',
      type: 'Earnings Release',
      title: 'FY 2025 Financial Results',
      description: 'Annual earnings with pharmaceutical sales and regional expansion updates.',
      date: '2026-02-28',
      status: 'upcoming',
      importance: 'high'
    },
    {
      id: '3',
      type: 'Board Meeting',
      title: 'Expansion Strategy Review',
      description: 'Board to discuss new manufacturing facility and export market development.',
      date: '2026-01-25',
      status: 'upcoming',
      importance: 'medium'
    }
  ]
};

function calculateSentiment(news: NewsArticle[]): SentimentSummary {
  const positiveCount = news.filter(n => n.sentiment === 'positive').length;
  const negativeCount = news.filter(n => n.sentiment === 'negative').length;
  const neutralCount = news.filter(n => n.sentiment === 'neutral').length;
  
  const avgScore = news.reduce((sum, n) => sum + n.sentimentScore, 0) / news.length;
  
  let overallSentiment: 'bullish' | 'bearish' | 'neutral';
  if (avgScore > 0.2) {
    overallSentiment = 'bullish';
  } else if (avgScore < -0.2) {
    overallSentiment = 'bearish';
  } else {
    overallSentiment = 'neutral';
  }
  
  return {
    overallSentiment,
    averageScore: avgScore,
    positiveCount,
    negativeCount,
    neutralCount,
    totalArticles: news.length,
    confidence: Math.abs(avgScore) * 100
  };
}

export function getStockData(ticker: string): StockData | null {
  return getStockDataSync(ticker);
}

// Synchronous version for server-side use
export function getStockDataSync(ticker: string): StockData | null {
  const news = stockNews[ticker] || stockNews['DFCU'];
  const metrics = stockMetrics[ticker] || stockMetrics['DFCU'];
  const dividends = stockDividends[ticker] || [];
  const corporateActions = stockCorporateActions[ticker] || [];
  
  // Get stock info from the constant
  const stockInfoMap: Record<string, { ticker: string; name: string; sector: string; description: string; currency: string }> = {
    MTN: { ticker: 'MTN', name: 'MTN Uganda Limited', sector: 'Telecommunications', description: "Uganda's leading telecommunications company", currency: 'UGX' },
    AIRTL: { ticker: 'AIRTL', name: 'Airtel Uganda Limited', sector: 'Telecommunications', description: 'Major telecommunications provider in Uganda', currency: 'UGX' },
    SBU: { ticker: 'SBU', name: 'Stanbic Bank Uganda', sector: 'Banking', description: 'A subsidiary of Standard Bank Group', currency: 'UGX' },
    DFCU: { ticker: 'DFCU', name: 'DFCU Bank Limited', sector: 'Banking', description: "One of Uganda's leading commercial banks", currency: 'UGX' },
    BOBU: { ticker: 'BOBU', name: 'Bank of Baroda Uganda', sector: 'Banking', description: 'A subsidiary of Bank of Baroda (India)', currency: 'UGX' },
    EBU: { ticker: 'EBU', name: 'Equity Bank Uganda', sector: 'Banking', description: 'A subsidiary of Equity Group Holdings', currency: 'UGX' },
    UCL: { ticker: 'UCL', name: 'Uganda Clays Limited', sector: 'Manufacturing', description: 'Leading manufacturer of clay products', currency: 'UGX' },
    NVU: { ticker: 'NVU', name: 'New Vision Printing & Publishing', sector: 'Media', description: "Uganda's leading media company", currency: 'UGX' },
    NIC: { ticker: 'NIC', name: 'National Insurance Corporation', sector: 'Insurance', description: "Uganda's premier insurance company", currency: 'UGX' },
    BATU: { ticker: 'BATU', name: 'British American Tobacco Uganda', sector: 'Consumer Goods', description: 'Leading tobacco products manufacturer', currency: 'UGX' },
    UMEME: { ticker: 'UMEME', name: 'Umeme Limited', sector: 'Utilities', description: "Uganda's largest electricity distributor", currency: 'UGX' },
    QCIL: { ticker: 'QCIL', name: 'Quality Chemicals Industries Ltd', sector: 'Healthcare', description: 'Leading pharmaceutical manufacturer', currency: 'UGX' }
  };
  
  const stockInfo = stockInfoMap[ticker];
  if (!stockInfo) return null;
  
  return {
    info: stockInfo,
    metrics,
    news,
    sentiment: calculateSentiment(news),
    dividends,
    corporateActions
  };
}

