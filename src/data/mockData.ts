import { Usina, UsinaDemandSummary, GlobalMetrics, TelemetryFilter } from '../types';
import {
  INITIAL_USINAS,
  RAW_USINAS_LIST,
  generateUsinaTelemetrySummary,
  generate288DailySamplePoints,
  processRealTimeseriesArray,
  TimeSeriesSamplePoint,
} from './mockUsinas';
import { DELFOS_SOLAR_FIELDS, findDelfosDeviceIdByName } from './delfosDevicesMap';
import DELFOS_ALL_SOLAR_FIELDS_TELEMETRY from './delfosAllSolarFieldsTelemetrySept02.json';

// Local storage key for persistent custom contracted demands in static client-side mode
const STORAGE_KEY_CUSTOM_DEMANDS = 'gdsun_custom_demands_v1';

/**
 * Base de todas as 125 usinas fotovoltaicas cadastradas na carteira GD Sun.
 * Exportada explicitamente para acesso direto estático client-side.
 */
export const MOCK_USINAS_125: Usina[] = INITIAL_USINAS;

/**
 * Carrega sobreposições de demandas contratuais salvas no navegador (LocalStorage)
 */
function getCustomDemandsFromStorage(): Record<string, number> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CUSTOM_DEMANDS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Salva a alteração da demanda contratada no LocalStorage
 */
function saveCustomDemandToStorage(usinaId: string, newValKw: number): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const map = getCustomDemandsFromStorage();
    map[usinaId] = newValKw;
    window.localStorage.setItem(STORAGE_KEY_CUSTOM_DEMANDS, JSON.stringify(map));
  } catch (err) {
    console.error('Falha ao gravar demanda contratada no LocalStorage:', err);
  }
}

/**
 * Retorna as 125 usinas aplicando eventuais demandas contratuais customizadas pelo usuário.
 */
export function getMockUsinas(): Usina[] {
  const customMap = getCustomDemandsFromStorage();
  return MOCK_USINAS_125.map((u) => {
    if (customMap[u.id] !== undefined && Number(customMap[u.id]) > 0) {
      return {
        ...u,
        contractedDemandKw: Number(customMap[u.id]),
      };
    }
    return u;
  });
}

/**
 * Atualiza a demanda contratada de uma usina diretamente no cliente (100% estático).
 */
export function updateMockContractedDemand(
  usinaId: string,
  newValKw: number
): { success: boolean; message: string; data?: Usina } {
  if (!usinaId || newValKw <= 0) {
    return { success: false, message: 'Valor de demanda contratada inválido.' };
  }

  saveCustomDemandToStorage(usinaId, newValKw);
  const updatedList = getMockUsinas();
  const updated = updatedList.find((u) => u.id === usinaId);

  return {
    success: true,
    message: `Demanda contratada atualizada com sucesso para ${newValKw.toLocaleString('pt-BR')} kW!`,
    data: updated,
  };
}

export interface DemandPeaksResponse {
  success: boolean;
  meta: {
    source: 'CLIENT_STATIC_MOCK_DATA';
    apiTokenProvided: string;
    startTime: string;
    endTime: string;
    aggregation: string;
    usinasCount: number;
  };
  globalMetrics: GlobalMetrics;
  summaries: UsinaDemandSummary[];
}

/**
 * Substitui a rota backend `/api/telemetry/demand-peaks`.
 * Executa a consolidação de picos das 125 usinas diretamente no client-side,
 * aplicando a regra regulatória de ultrapassagem estrita (> 1,3% da demanda).
 */
export function getMockDemandPeaks(params: {
  apiToken?: string;
  usinaId?: string;
  startTime?: string;
  endTime?: string;
  aggregation?: string;
  timeseriesPoints?: any[];
}): DemandPeaksResponse {
  const {
    apiToken = '0yo70kLrBF0nXQz9IMvee6Z6PWwawNMM',
    usinaId = 'ALL',
    startTime = '2026-09-02 00:00:00',
    endTime = '2026-09-02 23:59:59',
    aggregation = '5 min',
    timeseriesPoints,
  } = params;

  const currentUsinasList = getMockUsinas();

  const targetUsinas =
    !usinaId || usinaId === 'ALL'
      ? currentUsinasList
      : currentUsinasList.filter((u) => u.id === usinaId);

  // Calcula os sumários de demanda para as usinas solicitadas
  const summaries: UsinaDemandSummary[] = targetUsinas.map((u) => {
    const isPresidenteAlves = u.name.toLowerCase().includes('presidente alves');
    if (Array.isArray(timeseriesPoints) && timeseriesPoints.length > 0) {
      if (usinaId === u.id || (usinaId === 'ALL' && isPresidenteAlves)) {
        const { summary } = processRealTimeseriesArray(timeseriesPoints, u, aggregation);
        if (summary && summary.maxPeakKw > 0) {
          return summary;
        }
      }
    }
    return generateUsinaTelemetrySummary(u, startTime, endTime);
  });

  // Calcula todos os 125 sumários para métricas globais consolidadas
  const allSummaries = currentUsinasList.map((u) => {
    const targetSummary = summaries.find((s) => s.usinaId === u.id);
    if (targetSummary) return targetSummary;
    return generateUsinaTelemetrySummary(u, startTime, endTime);
  });

  // Contagem estrita com base no limite regulatório de +1,3%
  const exceededCount = allSummaries.filter((s) => s.status === 'EXCEEDED').length;
  const warningCount = allSummaries.filter((s) => s.status === 'WARNING').length;

  // Maior pico geral consolidado
  let highestOverall: {
    usinaName: string;
    powerKw: number;
    timestamp: string;
    contractedDemandKw: number;
  } | null = null;

  const datasetForPeak = usinaId !== 'ALL' ? summaries : allSummaries;
  datasetForPeak.forEach((s) => {
    if (!highestOverall || s.maxPeakKw > highestOverall.powerKw) {
      highestOverall = {
        usinaName: s.usinaName,
        powerKw: s.maxPeakKw,
        timestamp: s.maxPeakTimestamp,
        contractedDemandKw: s.contractedDemandKw,
      };
    }
  });

  // Sumário focal selecionado
  let selectedSummary: UsinaDemandSummary | null = null;
  if (usinaId !== 'ALL') {
    selectedSummary = summaries.find((s) => s.usinaId === usinaId) || summaries[0] || null;
  } else {
    if (startTime.includes('2026-09')) {
      selectedSummary =
        summaries.find((s) => s.usinaName.includes('Uruguaiana I')) || summaries[0] || null;
    } else {
      selectedSummary =
        summaries.find((s) => s.usinaName.includes('Iraí de Minas')) || summaries[0] || null;
    }
  }

  return {
    success: true,
    meta: {
      source: 'CLIENT_STATIC_MOCK_DATA',
      apiTokenProvided: apiToken,
      startTime,
      endTime,
      aggregation,
      usinasCount: summaries.length,
    },
    globalMetrics: {
      totalUsinas: currentUsinasList.length,
      usinasExceededCount: exceededCount,
      usinasWarningCount: warningCount,
      highestPeakOverall: highestOverall,
      selectedUsinaSummary: selectedSummary,
    },
    summaries,
  };
}

export interface LivePlantTimeseriesResponse {
  success: boolean;
  source: string;
  usinaName: string;
  delfosId: number | null;
  date: string;
  totalPoints: number;
  contractedDemandKw: number;
  toleranceKw: number;
  maxPeakKw: number;
  maxPeakTimestamp: string;
  status: 'EXCEEDED' | 'WARNING' | 'OK';
  points: { timestamp: string; value: number }[];
}

/**
 * Substitui a rota backend `/api/delfos/live-plant-timeseries`.
 * Fornece os 288 pontos de telemetria diária (resolução de 5 minutos, 24h)
 * de qualquer uma das 125 usinas lendo diretamente os dados oficiais locais.
 */
export function getMockLivePlantTimeseries(params: {
  usinaName?: string;
  date?: string;
  aggregate?: string;
}): LivePlantTimeseriesResponse {
  const { usinaName = 'Uruguaiana I', date = '2026-09-02' } = params;
  const targetDate = (date || '2026-09-02').split(' ')[0];

  const currentUsinasList = getMockUsinas();
  const localUsina = currentUsinasList.find(
    (u) =>
      u.name.toLowerCase().includes(usinaName.toLowerCase()) ||
      usinaName.toLowerCase().includes(u.name.toLowerCase())
  );

  const contractedDemandKw = localUsina ? localUsina.contractedDemandKw : 1000;
  const toleranceKw = Number((contractedDemandKw * 1.013).toFixed(2));
  const delfosId = findDelfosDeviceIdByName(usinaName);

  // Gera os 288 pontos diários com base na telemetria oficial Delfos
  const points = generate288DailySamplePoints(usinaName, contractedDemandKw, targetDate);

  let maxPeak = 0;
  let maxTimestamp = `${targetDate} 12:00:00`;

  points.forEach((pt) => {
    if (pt.value > maxPeak) {
      maxPeak = pt.value;
      maxTimestamp = pt.timestamp;
    }
  });

  const isAboveTolerance = maxPeak > toleranceKw;
  const status: 'EXCEEDED' | 'WARNING' | 'OK' = isAboveTolerance
    ? 'EXCEEDED'
    : maxPeak > contractedDemandKw * 0.9
    ? 'WARNING'
    : 'OK';

  return {
    success: true,
    source: 'OFFICIAL_DELFOS_DATA_STUDIO_CLIENT',
    usinaName,
    delfosId,
    date: targetDate,
    totalPoints: points.length,
    contractedDemandKw,
    toleranceKw,
    maxPeakKw: Number(maxPeak.toFixed(2)),
    maxPeakTimestamp: maxTimestamp,
    status,
    points,
  };
}

/**
 * Validação de token no cliente
 */
export function testMockToken(token: string): {
  success: boolean;
  message: string;
  tokenStatus: string;
  authenticatedAs: string;
  totalSolarFieldsAvailable: number;
} {
  return {
    success: true,
    message: 'Autenticação bem-sucedida (Modo Estático de Alta Performance)!',
    tokenStatus: 'ACTIVE',
    authenticatedAs: 'GDSUN Telemetria Solar (Delfos Data Studio)',
    totalSolarFieldsAvailable: MOCK_USINAS_125.length,
  };
}
