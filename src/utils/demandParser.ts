import { MonthDataPoint, UsinaMonthlyRecord, SheetParseResult, YearlyPlantStats } from '../types/demand';
import { getDemandaFixa } from '../data/demandasFixas';

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
 * Parse Demanda Contratada (Coluna B) according to explicit specifications:
 * 1. Remova todos os pontos de milhar: .replace(/\./g, '')
 * 2. Substitua vírgula por ponto: .replace(',', '.')
 * 3. Converta o valor resultante com parseFloat()
 */
export function parseContractedDemand(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') {
    return isNaN(val) || val <= 0 ? 0 : val;
  }
  let str = String(val)
    .replace(/^"+|"+$/g, '')
    .trim();

  if (!str || str === '0' || str === '-' || str.toLowerCase() === 'n/a') {
    return 0;
  }

  // 1. Remova todos os pontos de milhar: .replace(/\./g, '')
  // 2. Substitua vírgula por ponto: .replace(',', '.')
  // 3. Converta o valor resultante com parseFloat()
  str = str.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) || num <= 0 ? 0 : num;
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
 * Detect year from text or filename
 */
export function detectYearFromContent(text: string, sourceUrl = '', fallback = 2025): number {
  const yearMatch = text.match(/(?:ano\s*(?:de)?\s*)(\d{4})/i)
    || sourceUrl.match(/(202[0-9])/i)
    || text.match(/\b(202[0-9])\b/);

  if (yearMatch && yearMatch[1]) {
    const yr = parseInt(yearMatch[1], 10);
    if (yr >= 2020 && yr <= 2035) return yr;
  }
  return fallback;
}

/**
 * Parse CSV Data supporting both:
 * 1. Sheet Matrix Format: Col A: Usina, Col B: Demanda Contratada, Col C..N: Meses (Janeiro a Dezembro)
 * 2. Log / Timeseries Format: Data, Usina, Potência Pico, Horário, Demanda Contratada, Status
 */
export function parseSheetCsv(csvContent: string, sourceUrl = '', overrideYear?: number): SheetParseResult {
  if (!csvContent || typeof csvContent !== 'string') {
    return createEmptyResult(sourceUrl, overrideYear || 2025);
  }

  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return createEmptyResult(sourceUrl, overrideYear || 2025);
  }

  // Scan up to 10 rows to locate actual header row (some sheets have title rows before header)
  let headerIndex = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const low = lines[i].toLowerCase();
    if (
      low.includes('usina') &&
      (low.includes('demanda') || low.includes('jan') || low.includes('fev') || low.includes('mar'))
    ) {
      headerIndex = i;
      break;
    }
  }

  // Detect year
  let detectedYear = overrideYear || 2025;
  if (!overrideYear) {
    const preHeaderLines = lines.slice(0, headerIndex + 1).join('\n');
    detectedYear = detectYearFromContent(preHeaderLines, sourceUrl, 2025);
  }

  const delimiter = detectDelimiter(lines[headerIndex]);
  const headerCols = parseCsvLine(lines[headerIndex], delimiter);

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
    return parseMatrixMonthlyFormat(lines.slice(headerIndex), delimiter, monthColIndices, sourceUrl, detectedYear);
  } else {
    return parseTimeseriesLogFormat(lines.slice(headerIndex), delimiter, sourceUrl, detectedYear);
  }
}

/**
 * Parser for Matrix Monthly Format (Col A: Usina, Col B: Demanda Contratada, Col C..N: Meses)
 */
function parseMatrixMonthlyFormat(
  lines: string[],
  delimiter: string,
  monthColIndices: { colIdx: number; monthIdx: number }[],
  sourceUrl: string,
  detectedYear: number
): SheetParseResult {
  const usinas: UsinaMonthlyRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (!cols || cols.length < 2) continue;

    const rawName = cols[0].replace(/^"+|"+$/g, '').trim();
    if (!rawName || rawName.toLowerCase().startsWith('total') || rawName.toLowerCase().startsWith('média')) {
      continue;
    }
    const cleanName = rawName.replace(/[:;\s]+$/, '').trim();

    // Regra 1: Obtenha a Demanda Contratada diretamente de demandasFixas[usinaSelecionada]
    const fixedDemand = getDemandaFixa(cleanName) ?? getDemandaFixa(rawName);

    // Regra 2: Se o nome não for localizado no mapa, utilize a conversão limpa da Coluna B como alternativa de segurança
    const fallbackDemand = parseContractedDemand(cols[1]);
    const contractedDemand = fixedDemand !== null && fixedDemand > 0 ? fixedDemand : fallbackDemand;

    // Regra 3: Limite Regulatório de +3% deve ser sempre: demandaContratada * 1.03
    const toleranceLimit = Math.round(contractedDemand * 1.03 * 100) / 100;
    // Limite de Subutilização de 5%: demandaContratada * 0.05
    const threshold5Pct = Math.round(contractedDemand * 0.05 * 100) / 100;

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
      const isUnderutilized = power === null || (threshold5Pct > 0 && power < threshold5Pct);
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
        year: detectedYear,
        monthIndex: m,
        monthName: MONTH_NAMES[m].full,
        monthShort: MONTH_NAMES[m].short,
        powerKw: power,
        rawPowerKw: power,
        contractedDemandKw: contractedDemand,
        toleranceLimitKw: toleranceLimit,
        threshold5PctKw: threshold5Pct,
        isExceeded,
        isUnderutilized,
        excessKw: excess,
        percentageOfContracted: pct,
      });
    }

    // Determine default operational responsible
    let responsible = 'Operação O&M Central';
    if (
      rawName.includes('Sul') ||
      rawName.includes('Alegrete') ||
      rawName.includes('Uruguaiana') ||
      rawName.includes('Borja') ||
      rawName.includes('Quarai') ||
      rawName.includes('Cedro')
    ) {
      responsible = 'Regional Sul (RS/SC)';
    } else if (
      rawName.includes('Minas') ||
      rawName.includes('Ibiá') ||
      rawName.includes('Guarda Mor') ||
      rawName.includes('Frutal') ||
      rawName.includes('Buritizeiro') ||
      rawName.includes('Araçuaí')
    ) {
      responsible = 'Regional Sudeste (MG)';
    } else if (
      rawName.includes('Pirapora') ||
      rawName.includes('Taubaté') ||
      rawName.includes('Andradina') ||
      rawName.includes('Guarantã') ||
      rawName.includes('Barretos') ||
      rawName.includes('Macaubal')
    ) {
      responsible = 'Regional Sudeste (SP)';
    } else if (rawName.includes('Niquelândia') || rawName.includes('Goiás') || rawName.includes('Tapera')) {
      responsible = 'Regional Centro-Oeste (GO)';
    } else if (
      rawName.includes('Lapa') ||
      rawName.includes('Brejinhos') ||
      rawName.includes('Apodi') ||
      rawName.includes('Peixe') ||
      rawName.includes('Bahia')
    ) {
      responsible = 'Regional Nordeste (BA/RN/PB)';
    }

    const yearlyStats: Record<number, YearlyPlantStats> = {
      [detectedYear]: {
        highestPeakKw: highestPeak,
        highestPeakMonth: highestMonth,
        highestPeakMonthIndex: highestMonthIdx,
        activeMonthsCount: countActive,
        exceededMonthsCount: exceededCount,
        averagePowerKw: countActive > 0 ? Math.round((sumActive / countActive) * 100) / 100 : 0,
        isExceededAnyMonth: exceededCount > 0,
      },
    };

    usinas.push({
      id: `usina-${i}-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: cleanName,
      responsible,
      contractedDemandKw: contractedDemand,
      toleranceLimitKw: toleranceLimit,
      threshold5PctKw: threshold5Pct,
      months: monthPoints,
      availableYears: [detectedYear],
      yearlyStats,
      highestPeakKw: highestPeak,
      highestPeakMonth: highestMonth,
      highestPeakMonthIndex: highestMonthIdx,
      highestPeakYear: detectedYear,
      isExceededAnyMonth: exceededCount > 0,
      exceededMonthsCount: exceededCount,
      activeMonthsCount: countActive,
      averagePowerKw: countActive > 0 ? Math.round((sumActive / countActive) * 100) / 100 : 0,
    });
  }

  // Sort plants alphabetically
  usinas.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return buildFinalResult(usinas, 'matrix_monthly', sourceUrl, [detectedYear]);
}

/**
 * Parser for Timeseries Log Format (Data, Usina, Potência Pico, Horário, Demanda Contratada, Status)
 */
function parseTimeseriesLogFormat(
  lines: string[],
  delimiter: string,
  sourceUrl: string,
  detectedYear: number
): SheetParseResult {
  const tempMap: {
    [plantName: string]: {
      contracted: number;
      months: { [month: number]: number };
      years: Set<number>;
    };
  } = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (cols.length < 3) continue;

    const dateStr = cols[0];
    const plantName = (cols[1] || '')
      .replace(/^"+|"+$/g, '')
      .replace(/: Active Power$/i, '')
      .trim();

    if (!plantName) continue;

    const power = parseNumericValue(cols[2]);

    // Priority: getDemandaFixa -> then fallback to cols[4]
    const fixedDemand = getDemandaFixa(plantName);
    const fallbackDemand = cols.length >= 5 ? parseContractedDemand(cols[4]) : 0;
    const contracted = fixedDemand !== null && fixedDemand > 0 ? fixedDemand : fallbackDemand;

    // Extract month and year from date
    let month: number | null = null;
    let rowYear = detectedYear;

    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length >= 2) {
        month = parseInt(parts[1], 10);
      }
      if (parts.length >= 3) {
        const y = parseInt(parts[2].slice(0, 4), 10);
        if (y >= 2020 && y <= 2035) rowYear = y;
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        month = parseInt(parts[1], 10);
      }
      if (parts.length >= 1) {
        const y = parseInt(parts[0], 10);
        if (y >= 2020 && y <= 2035) rowYear = y;
      }
    }

    if (!month || month < 1 || month > 12) continue;

    if (!tempMap[plantName]) {
      tempMap[plantName] = {
        contracted: contracted || 0,
        months: {},
        years: new Set<number>(),
      };
    }

    tempMap[plantName].years.add(rowYear);

    if (contracted > 0 && (tempMap[plantName].contracted === 0 || contracted > tempMap[plantName].contracted)) {
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

    // Priority: getDemandaFixa -> then data.contracted
    const fixedDemand = getDemandaFixa(name);
    const contractedDemand = fixedDemand !== null && fixedDemand > 0 ? fixedDemand : data.contracted;
    const toleranceLimit = Math.round(contractedDemand * 1.03 * 100) / 100;

    const monthPoints: MonthDataPoint[] = [];
    let highestPeak = 0;
    let highestMonth = 'Nenhum';
    let highestMonthIdx = 1;
    let exceededCount = 0;
    let sumActive = 0;
    let countActive = 0;

    const threshold5Pct = Math.round(contractedDemand * 0.05 * 100) / 100;

    for (let m = 1; m <= 12; m++) {
      const power = data.months[m] || null;
      const isExceeded = power !== null && toleranceLimit > 0 && power > toleranceLimit;
      const isUnderutilized = power === null || (threshold5Pct > 0 && power < threshold5Pct);
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
        year: detectedYear,
        monthIndex: m,
        monthName: MONTH_NAMES[m].full,
        monthShort: MONTH_NAMES[m].short,
        powerKw: power,
        rawPowerKw: power,
        contractedDemandKw: contractedDemand,
        toleranceLimitKw: toleranceLimit,
        threshold5PctKw: threshold5Pct,
        isExceeded,
        isUnderutilized,
        excessKw: excess,
        percentageOfContracted: pct,
      });
    }

    let responsible = 'Operação O&M Central';
    if (
      name.includes('Sul') ||
      name.includes('Alegrete') ||
      name.includes('Uruguaiana') ||
      name.includes('Borja') ||
      name.includes('Quarai') ||
      name.includes('Cedro')
    ) {
      responsible = 'Regional Sul (RS/SC)';
    } else if (
      name.includes('Minas') ||
      name.includes('Ibiá') ||
      name.includes('Guarda Mor') ||
      name.includes('Frutal') ||
      name.includes('Buritizeiro') ||
      name.includes('Araçuaí')
    ) {
      responsible = 'Regional Sudeste (MG)';
    } else if (
      name.includes('Pirapora') ||
      name.includes('Taubaté') ||
      name.includes('Andradina') ||
      name.includes('Guarantã') ||
      name.includes('Barretos') ||
      name.includes('Macaubal')
    ) {
      responsible = 'Regional Sudeste (SP)';
    } else if (name.includes('Niquelândia') || name.includes('Goiás') || name.includes('Tapera')) {
      responsible = 'Regional Centro-Oeste (GO)';
    } else if (
      name.includes('Lapa') ||
      name.includes('Brejinhos') ||
      name.includes('Apodi') ||
      name.includes('Peixe') ||
      name.includes('Bahia')
    ) {
      responsible = 'Regional Nordeste (BA/RN/PB)';
    }

    const yearlyStats: Record<number, YearlyPlantStats> = {
      [detectedYear]: {
        highestPeakKw: highestPeak,
        highestPeakMonth: highestMonth,
        highestPeakMonthIndex: highestMonthIdx,
        activeMonthsCount: countActive,
        exceededMonthsCount: exceededCount,
        averagePowerKw: countActive > 0 ? Math.round((sumActive / countActive) * 100) / 100 : 0,
        isExceededAnyMonth: exceededCount > 0,
      },
    };

    usinas.push({
      id: `usina-${i}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name,
      responsible,
      contractedDemandKw: contractedDemand,
      toleranceLimitKw: toleranceLimit,
      threshold5PctKw: threshold5Pct,
      months: monthPoints,
      availableYears: [detectedYear],
      yearlyStats,
      highestPeakKw: highestPeak,
      highestPeakMonth: highestMonth,
      highestPeakMonthIndex: highestMonthIdx,
      highestPeakYear: detectedYear,
      isExceededAnyMonth: exceededCount > 0,
      exceededMonthsCount: exceededCount,
      activeMonthsCount: countActive,
      averagePowerKw: countActive > 0 ? Math.round((sumActive / countActive) * 100) / 100 : 0,
    });
  }

  return buildFinalResult(usinas, 'timeseries_log', sourceUrl, [detectedYear]);
}

/**
 * Merge multiple SheetParseResults (e.g. 2024 and 2025) into a unified dataset
 */
export function mergeSheetResults(results: SheetParseResult[]): SheetParseResult {
  const validResults = results.filter((r) => r && r.usinas && r.usinas.length > 0);
  if (validResults.length === 0) return createEmptyResult('', 2025);
  if (validResults.length === 1) return validResults[0];

  const plantMap = new Map<string, UsinaMonthlyRecord>();
  const allYearsSet = new Set<number>();

  for (const res of validResults) {
    for (const yr of res.availableYears) {
      allYearsSet.add(yr);
    }

    for (const u of res.usinas) {
      const normKey = u.name.trim().replace(/[:;\s]+$/, '').toLowerCase();
      const existing = plantMap.get(normKey);

      if (!existing) {
        // Clone record
        const cloned: UsinaMonthlyRecord = {
          ...u,
          months: [...u.months],
          yearlyStats: { ...(u.yearlyStats || {}) },
          availableYears: [...(u.availableYears || [u.months[0]?.year || 2025])],
        };
        plantMap.set(normKey, cloned);
      } else {
        // Merge months, replacing or adding each month
        for (const m of u.months) {
          const idx = existing.months.findIndex(
            (em) => em.year === m.year && em.monthIndex === m.monthIndex
          );
          if (idx >= 0) {
            existing.months[idx] = m;
          } else {
            existing.months.push(m);
          }
        }

        // Merge yearly stats
        existing.yearlyStats = {
          ...(existing.yearlyStats || {}),
          ...(u.yearlyStats || {}),
        };

        // Merge available years
        const yearsSet = new Set([...(existing.availableYears || []), ...(u.availableYears || [])]);
        existing.availableYears = Array.from(yearsSet).sort((a, b) => a - b);
      }
    }
  }

  const mergedUsinas: UsinaMonthlyRecord[] = [];
  const allYears = Array.from(allYearsSet).sort((a, b) => a - b);

  for (const u of plantMap.values()) {
    // Sort months chronologically: year ascending, then monthIndex ascending
    u.months.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.monthIndex - b.monthIndex));

    // Recompute overall and yearly metrics
    let highestPeak = 0;
    let highestMonth = 'Nenhum';
    let highestMonthIdx = 1;
    let highestYear = allYears[allYears.length - 1] || 2025;
    let exceededCount = 0;
    let sumActive = 0;
    let countActive = 0;

    const yearlyStats: Record<number, YearlyPlantStats> = {};

    for (const yr of allYears) {
      const yearMonths = u.months.filter((m) => m.year === yr);
      let yPeak = 0;
      let yPeakMonth = 'Nenhum';
      let yPeakMonthIdx = 1;
      let yExceeded = 0;
      let ySum = 0;
      let yCount = 0;

      for (const m of yearMonths) {
        if (m.powerKw !== null && m.powerKw > 0) {
          ySum += m.powerKw;
          yCount++;
          if (m.powerKw > yPeak) {
            yPeak = m.powerKw;
            yPeakMonth = m.monthName;
            yPeakMonthIdx = m.monthIndex;
          }
        }
        if (m.isExceeded) {
          yExceeded++;
        }
      }

      yearlyStats[yr] = {
        highestPeakKw: yPeak,
        highestPeakMonth: yPeakMonth,
        highestPeakMonthIndex: yPeakMonthIdx,
        activeMonthsCount: yCount,
        exceededMonthsCount: yExceeded,
        averagePowerKw: yCount > 0 ? Math.round((ySum / yCount) * 100) / 100 : 0,
        isExceededAnyMonth: yExceeded > 0,
      };
    }

    for (const m of u.months) {
      if (m.powerKw !== null && m.powerKw > 0) {
        sumActive += m.powerKw;
        countActive++;
        if (m.powerKw > highestPeak) {
          highestPeak = m.powerKw;
          highestMonth = m.monthName;
          highestMonthIdx = m.monthIndex;
          highestYear = m.year;
        }
      }
      if (m.isExceeded) {
        exceededCount++;
      }
    }

    u.highestPeakKw = highestPeak;
    u.highestPeakMonth = highestMonth;
    u.highestPeakMonthIndex = highestMonthIdx;
    u.highestPeakYear = highestYear;
    u.exceededMonthsCount = exceededCount;
    u.isExceededAnyMonth = exceededCount > 0;
    u.activeMonthsCount = countActive;
    u.averagePowerKw = countActive > 0 ? Math.round((sumActive / countActive) * 100) / 100 : 0;
    u.yearlyStats = yearlyStats;
    u.availableYears = allYears;

    mergedUsinas.push(u);
  }

  // Sort plants alphabetically
  mergedUsinas.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  let totalExceededPlants = 0;
  let highestOverall: {
    usinaName: string;
    powerKw: number;
    month: string;
    contractedDemandKw: number;
  } | null = null;

  for (const u of mergedUsinas) {
    if (u.isExceededAnyMonth) totalExceededPlants++;
    if (u.highestPeakKw > 0) {
      if (!highestOverall || u.highestPeakKw > highestOverall.powerKw) {
        highestOverall = {
          usinaName: u.name,
          powerKw: u.highestPeakKw,
          month: `${u.highestPeakMonth}/${u.highestPeakYear}`,
          contractedDemandKw: u.contractedDemandKw,
        };
      }
    }
  }

  const availableMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => ({
    monthIndex: m,
    monthName: MONTH_NAMES[m].full,
    monthShort: MONTH_NAMES[m].short,
  }));

  return {
    usinas: mergedUsinas,
    usinasCount: mergedUsinas.length,
    exceededCount: totalExceededPlants,
    okCount: mergedUsinas.length - totalExceededPlants,
    highestOverallPeak: highestOverall,
    detectedFormat: 'matrix_monthly',
    lastFetchedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    sourceUrl: validResults.map((r) => r.sourceUrl).filter(Boolean).join(', ') || 'Bases Consolidadas 2024 / 2025',
    availableYears: allYears.length > 0 ? allYears : [2024, 2025],
    availableMonths,
  };
}

function buildFinalResult(
  usinas: UsinaMonthlyRecord[],
  format: 'matrix_monthly' | 'timeseries_log',
  sourceUrl: string,
  availableYears: number[] = [2025]
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
          month: `${u.highestPeakMonth}${u.highestPeakYear ? `/${u.highestPeakYear}` : ''}`,
          contractedDemandKw: u.contractedDemandKw,
        };
      }
    }
  }

  const availableMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => ({
    monthIndex: m,
    monthName: MONTH_NAMES[m].full,
    monthShort: MONTH_NAMES[m].short,
  }));

  return {
    usinas,
    usinasCount: usinas.length,
    exceededCount,
    okCount: usinas.length - exceededCount,
    highestOverallPeak: highestOverall,
    detectedFormat: format,
    lastFetchedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    sourceUrl,
    availableYears,
    availableMonths,
  };
}

function createEmptyResult(sourceUrl: string, defaultYear = 2025): SheetParseResult {
  const availableMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => ({
    monthIndex: m,
    monthName: MONTH_NAMES[m].full,
    monthShort: MONTH_NAMES[m].short,
  }));

  return {
    usinas: [],
    usinasCount: 0,
    exceededCount: 0,
    okCount: 0,
    highestOverallPeak: null,
    detectedFormat: 'matrix_monthly',
    lastFetchedAt: new Date().toLocaleTimeString('pt-BR'),
    sourceUrl,
    availableYears: [defaultYear],
    availableMonths,
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return includeUnit ? `${formatted} kW` : formatted;
}
