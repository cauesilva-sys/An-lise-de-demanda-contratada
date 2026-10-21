import { MonthDataPoint, UsinaMonthlyRecord, SheetParseResult } from '../types/demand';

export const MONTH_NAMES: { [key: number]: { full: string; short: string } } = {
  1: { full: 'Janeiro', short: 'Jan' },
  2: { full: 'Fevereiro', short: 'Fev' },
  3: { full: 'Março', short: 'Mar' },
  4: { full: 'Abril', short: 'Abr' },
  5: { full: 'Maio', short: 'Mai' },
  6: { full: 'Junho', short: 'Jun' },
  7: { full: 'Julho', short: 'Jul' },
  8: { full: 'Agosto', short: 'Ago' },
  9: { full: 'Setembro', short: 'Set' },
  10: { full: 'Outubro', short: 'Out' },
  11: { full: 'Novembro', short: 'Nov' },
  12: { full: 'Dezembro', short: 'Dez' },
};

/**
 * Split CSV line respecting double quotes
 */
export function parseCsvLine(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Convert string value to float:
 * - Removes thousands separators (e.g. "3.500" -> 3500)
 * - Converts decimal commas to dots (e.g. "2499,5118" -> 2499.5118)
 * - Returns null for empty, zero, or non-numeric values so they are ignored in charts
 */
export function parseNumericValue(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') {
    return isNaN(val) || val <= 0 ? null : val;
  }
  let str = String(val)
    .replace(/^"+|"+$/g, '')
    .trim();

  if (!str || str === '0' || str === '#VALUE!' || str.toLowerCase() === 'n/a' || str === '-') {
    return null;
  }

  // If there is both a dot and a comma (e.g. "3.500,25" or "1.234.567,89")
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    // Only comma present (e.g. "2499,5118" or "988,8")
    str = str.replace(',', '.');
  } else if (str.includes('.')) {
    // Only dot present: check if thousands separator (e.g. "3.500", "2.575", "10.000")
    if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
      str = str.replace(/\./g, '');
    }
  }

  const num = parseFloat(str);
  return isNaN(num) || num <= 0 ? null : num;
}

/**
 * Identify month index (1..12) from column header name or date
 */
function identifyMonthIndex(headerName: string): number | null {
  const normalized = headerName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (normalized.includes('jan')) return 1;
  if (normalized.includes('fev') || normalized.includes('feb')) return 2;
  if (normalized.includes('mar')) return 3;
  if (normalized.includes('abr') || normalized.includes('apr')) return 4;
  if (normalized.includes('mai') || normalized.includes('may')) return 5;
  if (normalized.includes('jun')) return 6;
  if (normalized.includes('jul')) return 7;
  if (normalized.includes('ago') || normalized.includes('aug')) return 8;
  if (normalized.includes('set') || normalized.includes('sep')) return 9;
  if (normalized.includes('out') || normalized.includes('oct')) return 10;
  if (normalized.includes('nov')) return 11;
  if (normalized.includes('dez') || normalized.includes('dec')) return 12;

  return null;
}

/**
 * Detect delimiter: comma, semicolon, tab
 */
function detectDelimiter(headerLine: string): string {
  const commas = (headerLine.match(/,/g) || []).length;
  const semicolons = (headerLine.match(/;/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;

  if (semicolons > commas && semicolons > tabs) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

/**
 * Parse CSV Data supporting both:
 * 1. Sheet Matrix Format: Col A: Usina, Col B: Demanda Contratada, Col C..N: Meses (Janeiro a Dezembro)
 * 2. Log / Timeseries Format: Data, Usina, Potência Pico, Horário, Demanda Contratada, Status
 */
export function parseSheetCsv(csvContent: string, sourceUrl = ''): SheetParseResult {
  if (!csvContent || typeof csvContent !== 'string') {
    return createEmptyResult(sourceUrl);
  }

  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return createEmptyResult(sourceUrl);
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerCols = parseCsvLine(lines[0], delimiter);

  // Check if header contains month names in columns C..N
  const monthColIndices: { colIdx: number; monthIdx: number }[] = [];
  for (let c = 2; c < headerCols.length; c++) {
    const month = identifyMonthIndex(headerCols[c]);
    if (month !== null) {
      monthColIndices.push({ colIdx: c, monthIdx: month });
    }
  }

  const isMatrixFormat = monthColIndices.length >= 3;

  if (isMatrixFormat) {
    return parseMatrixMonthlyFormat(lines, delimiter, monthColIndices, sourceUrl);
  } else {
    return parseTimeseriesLogFormat(lines, delimiter, sourceUrl);
  }
}

/**
 * Parser for Matrix Monthly Format (Col A: Usina, Col B: Demanda Contratada, Col C..N: Meses)
 */
function parseMatrixMonthlyFormat(
  lines: string[],
  delimiter: string,
  monthColIndices: { colIdx: number; monthIdx: number }[],
  sourceUrl: string
): SheetParseResult {
  const usinas: UsinaMonthlyRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (!cols || cols.length < 2) continue;

    const rawName = cols[0].replace(/^"+|"+$/g, '').trim();
    if (!rawName || rawName.toLowerCase().startsWith('total') || rawName.toLowerCase().startsWith('média')) {
      continue;
    }

    const contractedDemand = parseNumericValue(cols[1]) || 0;
    const toleranceLimit = Math.round(contractedDemand * 1.03 * 100) / 100;

    // Build map for each month 1..12
    const monthValues: { [m: number]: number | null } = {};
    for (let m = 1; m <= 12; m++) {
      monthValues[m] = null;
    }

    // Populate detected month columns
    for (const mapping of monthColIndices) {
      if (mapping.colIdx < cols.length) {
        const val = parseNumericValue(cols[mapping.colIdx]);
        // Ignore empty or 0 as required
        if (val !== null && val > 0) {
          monthValues[mapping.monthIdx] = Math.round(val * 100) / 100;
        }
      }
    }

    const monthPoints: MonthDataPoint[] = [];
    let highestPeak = 0;
    let highestMonth = 'Nenhum';
    let highestMonthIdx = 1;
    let exceededCount = 0;
    let sumActive = 0;
    let countActive = 0;

    for (let m = 1; m <= 12; m++) {
      const power = monthValues[m];
      const isExceeded = power !== null && toleranceLimit > 0 && power > toleranceLimit;
      const excess = isExceeded && power !== null ? Math.round((power - toleranceLimit) * 100) / 100 : 0;
      const pct = power !== null && contractedDemand > 0 ? Math.round((power / contractedDemand) * 1000) / 10 : 0;

      if (power !== null && power > highestPeak) {
        highestPeak = power;
        highestMonth = MONTH_NAMES[m].full;
        highestMonthIdx = m;
      }

      if (isExceeded) {
        exceededCount++;
      }

      if (power !== null) {
        sumActive += power;
        countActive++;
      }

      monthPoints.push({
        monthIndex: m,
        monthName: MONTH_NAMES[m].full,
        monthShort: MONTH_NAMES[m].short,
        powerKw: power,
        contractedDemandKw: contractedDemand,
        toleranceLimitKw: toleranceLimit,
        isExceeded,
        excessKw: excess,
        percentageOfContracted: pct,
      });
    }

    usinas.push({
      id: `usina-${i}-${rawName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: rawName,
      contractedDemandKw: contractedDemand,
      toleranceLimitKw: toleranceLimit,
      months: monthPoints,
      highestPeakKw: highestPeak,
      highestPeakMonth: highestMonth,
      highestPeakMonthIndex: highestMonthIdx,
      isExceededAnyMonth: exceededCount > 0,
      exceededMonthsCount: exceededCount,
      activeMonthsCount: countActive,
      averagePowerKw: countActive > 0 ? Math.round((sumActive / countActive) * 100) / 100 : 0,
    });
  }

  // Sort plants alphabetically
  usinas.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return buildFinalResult(usinas, 'matrix_monthly', sourceUrl);
}

/**
 * Parser for Timeseries Log Format (Data, Usina, Potência Pico, Horário, Demanda Contratada, Status)
 */
function parseTimeseriesLogFormat(
  lines: string[],
  delimiter: string,
  sourceUrl: string
): SheetParseResult {
  const tempMap: {
    [plantName: string]: {
      contracted: number;
      months: { [month: number]: number };
    };
  } = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (cols.length < 3) continue;

    const dateStr = cols[0]; // e.g. "19/10/2026" or "2026-10-19"
    let plantName = (cols[1] || '')
      .replace(/^"+|"+$/g, '')
      .replace(/: Active Power$/i, '')
      .trim();

    if (!plantName) continue;

    const power = parseNumericValue(cols[2]);
    const contracted = cols.length >= 5 ? parseNumericValue(cols[4]) : null;

    // Extract month from date
    let month: number | null = null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length >= 2) {
        month = parseInt(parts[1], 10);
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        month = parseInt(parts[1], 10);
      }
    }

    if (!month || month < 1 || month > 12) continue;

    if (!tempMap[plantName]) {
      tempMap[plantName] = {
        contracted: contracted || 0,
        months: {},
      };
    }

    if (contracted && tempMap[plantName].contracted === 0) {
      tempMap[plantName].contracted = contracted;
    }

    if (power !== null && power > 0) {
      const currentPeak = tempMap[plantName].months[month] || 0;
      if (power > currentPeak) {
        tempMap[plantName].months[month] = Math.round(power * 100) / 100;
      }
    }
  }

  const usinas: UsinaMonthlyRecord[] = [];
  const plantNames = Object.keys(tempMap).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  for (let i = 0; i < plantNames.length; i++) {
    const name = plantNames[i];
    const data = tempMap[name];
    const contractedDemand = data.contracted;
    const toleranceLimit = Math.round(contractedDemand * 1.03 * 100) / 100;

    const monthPoints: MonthDataPoint[] = [];
    let highestPeak = 0;
    let highestMonth = 'Nenhum';
    let highestMonthIdx = 1;
    let exceededCount = 0;
    let sumActive = 0;
    let countActive = 0;

    for (let m = 1; m <= 12; m++) {
      const power = data.months[m] || null;
      const isExceeded = power !== null && toleranceLimit > 0 && power > toleranceLimit;
      const excess = isExceeded && power !== null ? Math.round((power - toleranceLimit) * 100) / 100 : 0;
      const pct = power !== null && contractedDemand > 0 ? Math.round((power / contractedDemand) * 1000) / 10 : 0;

      if (power !== null && power > highestPeak) {
        highestPeak = power;
        highestMonth = MONTH_NAMES[m].full;
        highestMonthIdx = m;
      }

      if (isExceeded) {
        exceededCount++;
      }

      if (power !== null) {
        sumActive += power;
        countActive++;
      }

      monthPoints.push({
        monthIndex: m,
        monthName: MONTH_NAMES[m].full,
        monthShort: MONTH_NAMES[m].short,
        powerKw: power,
        contractedDemandKw: contractedDemand,
        toleranceLimitKw: toleranceLimit,
        isExceeded,
        excessKw: excess,
        percentageOfContracted: pct,
      });
    }

    usinas.push({
      id: `usina-${i}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name,
      contractedDemandKw: contractedDemand,
      toleranceLimitKw: toleranceLimit,
      months: monthPoints,
      highestPeakKw: highestPeak,
      highestPeakMonth: highestMonth,
      highestPeakMonthIndex: highestMonthIdx,
      isExceededAnyMonth: exceededCount > 0,
      exceededMonthsCount: exceededCount,
      activeMonthsCount: countActive,
      averagePowerKw: countActive > 0 ? Math.round((sumActive / countActive) * 100) / 100 : 0,
    });
  }

  return buildFinalResult(usinas, 'timeseries_log', sourceUrl);
}

function buildFinalResult(
  usinas: UsinaMonthlyRecord[],
  format: 'matrix_monthly' | 'timeseries_log',
  sourceUrl: string
): SheetParseResult {
  let exceededCount = 0;
  let highestOverall: {
    usinaName: string;
    powerKw: number;
    month: string;
    contractedDemandKw: number;
  } | null = null;

  for (const u of usinas) {
    if (u.isExceededAnyMonth) {
      exceededCount++;
    }
    if (u.highestPeakKw > 0) {
      if (!highestOverall || u.highestPeakKw > highestOverall.powerKw) {
        highestOverall = {
          usinaName: u.name,
          powerKw: u.highestPeakKw,
          month: u.highestPeakMonth,
          contractedDemandKw: u.contractedDemandKw,
        };
      }
    }
  }

  return {
    usinas,
    usinasCount: usinas.length,
    exceededCount,
    okCount: usinas.length - exceededCount,
    highestOverallPeak: highestOverall,
    detectedFormat: format,
    lastFetchedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    sourceUrl,
  };
}

function createEmptyResult(sourceUrl: string): SheetParseResult {
  return {
    usinas: [],
    usinasCount: 0,
    exceededCount: 0,
    okCount: 0,
    highestOverallPeak: null,
    detectedFormat: 'matrix_monthly',
    lastFetchedAt: new Date().toLocaleTimeString('pt-BR'),
    sourceUrl,
  };
}

/**
 * Format kW numeric values in Brazilian notation (e.g. 2.500,12 kW)
 */
export function formatKw(val: number | null | undefined, includeUnit = true): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '—';
  }
  const formatted = val.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
  return includeUnit ? `${formatted} kW` : formatted;
}
