export interface MonthDataPoint {
  year: number; // 2024, 2025, etc.
  monthIndex: number; // 1 to 12
  monthName: string; // e.g. "Janeiro", "Fevereiro", etc.
  monthShort: string; // "Jan", "Fev", etc.
  powerKw: number | null; // Null or > 0. Values empty or <= 0 are ignored in charts
  rawPowerKw?: number | null; // Exact raw measured value if present
  contractedDemandKw: number;
  toleranceLimitKw: number; // contractedDemandKw * 1.03 (+3%)
  threshold5PctKw: number; // contractedDemandKw * 0.05 (5%)
  isExceeded: boolean; // powerKw > toleranceLimitKw
  isUnderutilized: boolean; // powerKw === null || powerKw < threshold5PctKw
  excessKw: number; // powerKw - toleranceLimitKw (0 if not exceeded)
  percentageOfContracted: number; // (powerKw / contractedDemandKw) * 100
}

export interface YearlyPlantStats {
  highestPeakKw: number;
  highestPeakMonth: string;
  highestPeakMonthIndex: number;
  activeMonthsCount: number;
  exceededMonthsCount: number;
  averagePowerKw: number;
  isExceededAnyMonth: boolean;
}

export interface UsinaMonthlyRecord {
  id: string;
  name: string;
  responsible?: string;
  contractedDemandKw: number;
  toleranceLimitKw: number; // contractedDemandKw * 1.03 (+3%)
  threshold5PctKw: number; // contractedDemandKw * 0.05 (5%)
  months: MonthDataPoint[];
  availableYears?: number[];
  yearlyStats?: Record<number, YearlyPlantStats>;
  highestPeakKw: number;
  highestPeakMonth: string;
  highestPeakMonthIndex: number;
  highestPeakYear?: number;
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
  availableYears: number[];
  availableMonths: { monthIndex: number; monthName: string; monthShort: string }[];
}

export type PeriodFilterMode = 'all' | 'over_3' | 'under_5';

export interface PeriodOption {
  year: number;
  monthIndex: number; // 1 to 12
  monthName: string;
  monthShort: string;
  label: string; // e.g. "Outubro / 2026"
  key: string; // e.g. "2026-10"
  hasData: boolean;
  totalUsinasCount: number;
  exceededCount: number;
  underutilizedCount: number;
  totalExcessKw: number;
}

export interface OverDemandReportItem {
  id: string;
  usinaId: string;
  usinaName: string;
  responsible: string;
  periodLabel: string;
  monthName: string;
  year: number;
  contractedDemandKw: number;
  toleranceLimitKw: number; // +3%
  measuredPeakKw: number;
  excessKw: number; // measuredPeakKw - toleranceLimitKw
  excessPercentage: number; // ((measuredPeakKw - toleranceLimitKw) / toleranceLimitKw) * 100
  utilizationPercentage: number; // (measuredPeakKw / contractedDemandKw) * 100
  selected: boolean;
}

export interface UnderDemandReportItem {
  id: string;
  usinaId: string;
  usinaName: string;
  responsible: string;
  periodLabel: string;
  monthName: string;
  year: number;
  contractedDemandKw: number;
  threshold5PctKw: number; // 5%
  measuredPeakKw: number; // 0 if empty or offline
  deficitKw: number; // threshold5PctKw - measuredPeakKw
  utilizationPercentage: number; // (measuredPeakKw / contractedDemandKw) * 100
  statusDiagnosis: 'offline' | 'critical_low' | 'low';
  statusLabel: string; // "Sem Injeção / 0 kW", "Subutilização Severa (< 2%)", "Abaixo de 5%"
  recommendedAction: string;
}
