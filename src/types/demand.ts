export interface MonthDataPoint {
  monthIndex: number; // 1 to 12
  monthName: string; // e.g. "Janeiro", "Fevereiro", etc.
  monthShort: string; // "Jan", "Fev", etc.
  powerKw: number | null; // Null or > 0. Values empty or <= 0 are ignored
  contractedDemandKw: number;
  toleranceLimitKw: number; // contractedDemandKw * 1.03
  isExceeded: boolean; // powerKw > toleranceLimitKw
  excessKw: number; // powerKw - toleranceLimitKw (0 if not exceeded)
  percentageOfContracted: number; // (powerKw / contractedDemandKw) * 100
}

export interface UsinaMonthlyRecord {
  id: string;
  name: string;
  contractedDemandKw: number;
  toleranceLimitKw: number; // contractedDemandKw * 1.03 (+3%)
  months: MonthDataPoint[];
  highestPeakKw: number;
  highestPeakMonth: string;
  highestPeakMonthIndex: number;
  isExceededAnyMonth: boolean;
  exceededMonthsCount: number;
  activeMonthsCount: number;
  averagePowerKw: number;
}

export interface SheetParseResult {
  usinas: UsinaMonthlyRecord[];
  usinasCount: number;
  exceededCount: number;
  okCount: number;
  highestOverallPeak: {
    usinaName: string;
    powerKw: number;
    month: string;
    contractedDemandKw: number;
  } | null;
  detectedFormat: 'matrix_monthly' | 'timeseries_log';
  lastFetchedAt: string;
  sourceUrl: string;
}
