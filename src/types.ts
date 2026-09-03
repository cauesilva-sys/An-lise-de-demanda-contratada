export type DemandStatus = 'OK' | 'WARNING' | 'EXCEEDED';

export interface Usina {
  id: string;
  name: string;
  deviceType: string; // e.g. "Solar Field"
  substation: string;
  location: string;
  capacityKw: number;
  capacityKwp?: number; // Potência Pico em kWp da usina
  contractedDemandKw: number; // Demanda Contratada em kW
  updatedAt?: string;
}

export interface PeakRecord {
  id: string;
  usinaId: string;
  usinaName: string;
  timestamp: string; // e.g. "2026-07-05 13:00:00"
  powerKw: number;
  contractedDemandKw: number;
  toleranceKw: number; // Demanda contratada com tolerância de +1,3%
  exceeded: boolean; // True ONLY if powerKw > toleranceKw AND durationMinutes >= 5
  excessKw: number;
  percentageOfContracted: number;
  durationMinutes: number; // Duração contínua em minutos
  isSustained5Min: boolean; // Duração contínua de pelo menos 5 minutos
}

export interface UsinaDemandSummary {
  usinaId: string;
  usinaName: string;
  deviceType: string;
  contractedDemandKw: number;
  toleranceKw: number; // Demanda com +1.3% de tolerância
  capacityKwp?: number;
  maxPeakKw: number;
  maxPeakTimestamp: string; // "2026-07-05 13:00:00"
  avgPowerKw: number;
  status: DemandStatus;
  statusReason: string; // Explicação detalhada da regra de 1.3% e 5 min
  excessKw: number;
  percentageOfContracted: number;
  sustainedDurationMinutes: number;
  isSustained5Min: boolean;
  topPeaks: PeakRecord[];
}

export interface TelemetryFilter {
  usinaId: string; // 'ALL' or specific usinaId
  startTime: string; // YYYY-MM-DD HH:mm:ss
  endTime: string; // YYYY-MM-DD HH:mm:ss
  timeShortcut: string; // '7d' | '30d' | 'this_month' | 'last_month' | 'custom'
  aggregation: string; // '1 min' | '5 min' | '15 min' | '1 hour'
  variable: string; // 'Active Power'
  apiToken: string;
  statusCategory?: 'ALL' | 'EXCEEDED' | 'WARNING' | 'OK'; // Filtro ativo vindo dos cards
}

export interface GlobalMetrics {
  totalUsinas: number;
  usinasExceededCount: number;
  usinasWarningCount: number;
  highestPeakOverall: {
    usinaId?: string;
    usinaName: string;
    powerKw: number;
    timestamp: string;
    contractedDemandKw: number;
  } | null;
  selectedUsinaSummary: UsinaDemandSummary | null;
}
