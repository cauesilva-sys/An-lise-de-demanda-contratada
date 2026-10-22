import { UsinaMonthlyRecord, PeriodOption, OverDemandReportItem, UnderDemandReportItem } from '../types/demand';
import { MONTH_NAMES, formatKw } from './demandParser';

/**
 * Generate period options (months and year) with aggregated metrics
 */
export function generatePeriodOptions(
  usinas: UsinaMonthlyRecord[],
  availableYears?: number[]
): PeriodOption[] {
  const options: PeriodOption[] = [];

  // Determine available years: prefer parameter or extract from usinas
  let yearsToUse = availableYears && availableYears.length > 0 ? availableYears : [2025, 2024];
  if (!availableYears || availableYears.length === 0) {
    const extractedYears = new Set<number>();
    for (const u of usinas) {
      if (u.availableYears) {
        u.availableYears.forEach((y) => extractedYears.add(y));
      }
      for (const m of u.months) {
        if (m.year) extractedYears.add(m.year);
      }
    }
    if (extractedYears.size > 0) {
      yearsToUse = Array.from(extractedYears).sort((a, b) => b - a); // 2025, 2024 descending
    }
  } else {
    yearsToUse = [...yearsToUse].sort((a, b) => b - a);
  }

  for (const year of yearsToUse) {
    for (let m = 1; m <= 12; m++) {
      const monthName = MONTH_NAMES[m]?.full || `Mês ${m}`;
      const monthShort = MONTH_NAMES[m]?.short || `M${m}`;
      const key = `${year}-${String(m).padStart(2, '0')}`;
      const label = `${monthName} / ${year}`;

      let totalUsinasCount = 0;
      let exceededCount = 0;
      let underutilizedCount = 0;
      let totalExcessKw = 0;

      for (const u of usinas) {
        const monthData = u.months.find((p) => p.monthIndex === m && p.year === year);
        if (monthData) {
          if (monthData.powerKw !== null && monthData.powerKw > 0) {
            totalUsinasCount++;
          }
          if (monthData.isExceeded) {
            exceededCount++;
            totalExcessKw += monthData.excessKw;
          }
          if (monthData.isUnderutilized) {
            underutilizedCount++;
          }
        }
      }

      options.push({
        year,
        monthIndex: m,
        monthName,
        monthShort,
        label,
        key,
        hasData: totalUsinasCount > 0,
        totalUsinasCount,
        exceededCount,
        underutilizedCount,
        totalExcessKw: Math.round(totalExcessKw * 100) / 100,
      });
    }
  }

  return options;
}

/**
 * Filter plants that exceeded the contracted demand +3% margin in the selected period
 */
export function getOverDemandReport(
  usinas: UsinaMonthlyRecord[],
  monthIndex: number,
  year = 2025
): OverDemandReportItem[] {
  const report: OverDemandReportItem[] = [];
  const monthName = MONTH_NAMES[monthIndex]?.full || `Mês ${monthIndex}`;
  const periodLabel = `${monthName} / ${year}`;

  for (const u of usinas) {
    const monthData = u.months.find((p) => p.monthIndex === monthIndex && p.year === year);
    if (!monthData || monthData.powerKw === null) continue;

    // Check if exceeded tolerance limit (+3%)
    if (monthData.isExceeded && monthData.toleranceLimitKw > 0) {
      const measuredPeakKw = monthData.powerKw;
      const contractedDemandKw = u.contractedDemandKw;
      const toleranceLimitKw = monthData.toleranceLimitKw;
      const excessKw = Math.round((measuredPeakKw - toleranceLimitKw) * 100) / 100;
      const excessPercentage = Math.round(((measuredPeakKw - toleranceLimitKw) / toleranceLimitKw) * 1000) / 10;
      const utilizationPercentage = Math.round((measuredPeakKw / contractedDemandKw) * 1000) / 10;

      report.push({
        id: `${u.id}-over-${year}-${monthIndex}`,
        usinaId: u.id,
        usinaName: u.name,
        responsible: u.responsible || 'Operação Central',
        periodLabel,
        monthName,
        year,
        contractedDemandKw,
        toleranceLimitKw,
        measuredPeakKw,
        excessKw,
        excessPercentage,
        utilizationPercentage,
        selected: true, // Default to selected for batch monitoring
      });
    }
  }

  // Sort by highest excess in kW descending
  return report.sort((a, b) => b.excessKw - a.excessKw);
}

/**
 * Filter plants with generation under 5% of contracted demand or 0 kW / offline
 */
export function getUnderDemandReport(
  usinas: UsinaMonthlyRecord[],
  monthIndex: number,
  year = 2025,
  includeZeroOrOffline = true
): UnderDemandReportItem[] {
  const report: UnderDemandReportItem[] = [];
  const monthName = MONTH_NAMES[monthIndex]?.full || `Mês ${monthIndex}`;
  const periodLabel = `${monthName} / ${year}`;

  for (const u of usinas) {
    const monthData = u.months.find((p) => p.monthIndex === monthIndex && p.year === year);
    const contractedDemandKw = u.contractedDemandKw;
    const threshold5PctKw = u.threshold5PctKw || Math.round(contractedDemandKw * 0.05 * 100) / 100;

    const powerKw = monthData?.powerKw ?? null;
    const isZeroOrOffline = powerKw === null || powerKw === 0;

    if (isZeroOrOffline) {
      if (includeZeroOrOffline) {
        report.push({
          id: `${u.id}-under-${year}-${monthIndex}`,
          usinaId: u.id,
          usinaName: u.name,
          responsible: u.responsible || 'Operação Central',
          periodLabel,
          monthName,
          year,
          contractedDemandKw,
          threshold5PctKw,
          measuredPeakKw: 0,
          deficitKw: threshold5PctKw,
          utilizationPercentage: 0,
          statusDiagnosis: 'offline',
          statusLabel: 'Sem Injeção / 0 kW',
          recommendedAction: 'Verificar status do alimentador, disjuntor geral da subestação e link de telemetria.',
        });
      }
    } else if (powerKw < threshold5PctKw) {
      const measuredPeakKw = powerKw;
      const deficitKw = Math.round((threshold5PctKw - measuredPeakKw) * 100) / 100;
      const utilizationPercentage = Math.round((measuredPeakKw / contractedDemandKw) * 1000) / 10;
      const isCritical = utilizationPercentage < 2.0;

      report.push({
        id: `${u.id}-under-${monthIndex}`,
        usinaId: u.id,
        usinaName: u.name,
        responsible: u.responsible || 'Operação Central',
        periodLabel,
        monthName,
        year,
        contractedDemandKw,
        threshold5PctKw,
        measuredPeakKw,
        deficitKw,
        utilizationPercentage,
        statusDiagnosis: isCritical ? 'critical_low' : 'low',
        statusLabel: isCritical ? 'Subutilização Severa (< 2%)' : 'Abaixo de 5% de Demanda',
        recommendedAction: isCritical
          ? 'Inspecionar inversores em trip, strings desconectadas e transformador elevador.'
          : 'Checar rastreadores (trackers), sujidade/soiling de módulos e irradiância local.',
      });
    }
  }

  // Sort by lowest utilization percentage first (most critical first)
  return report.sort((a, b) => a.utilizationPercentage - b.utilizationPercentage);
}

/**
 * Export Over-Demand (> 3%) Report to Excel-compatible CSV (BOM, semicolon, comma decimal)
 */
export function exportOverDemandToCsv(items: OverDemandReportItem[], periodLabel: string) {
  const safeFilename = `relatorio_superacao_demanda_3pct_${periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
  const header = [
    'Usina',
    'Responsável / Regional',
    'Período',
    'Demanda Contratada (kW)',
    'Limite +3% (kW)',
    'Pico Medido (kW)',
    'Excesso de Demanda (kW)',
    '% Acima do Limite',
    '% da Demanda Contratada',
    'Status Operacional',
  ];

  const rows = [header.join(';')];

  for (const item of items) {
    const row = [
      `"${item.usinaName}"`,
      `"${item.responsible}"`,
      `"${item.periodLabel}"`,
      item.contractedDemandKw.toString().replace('.', ','),
      item.toleranceLimitKw.toString().replace('.', ','),
      item.measuredPeakKw.toString().replace('.', ','),
      item.excessKw.toString().replace('.', ','),
      `${item.excessPercentage.toFixed(1).replace('.', ',')}%`,
      `${item.utilizationPercentage.toFixed(1).replace('.', ',')}%`,
      '"Superou Limite Regulatório (+3%)"',
    ];
    rows.push(row.join(';'));
  }

  downloadCsv(rows.join('\r\n'), safeFilename);
}

/**
 * Export Under-Demand (< 5%) Report to Excel-compatible CSV (BOM, semicolon, comma decimal)
 */
export function exportUnderDemandToCsv(items: UnderDemandReportItem[], periodLabel: string) {
  const safeFilename = `relatorio_subutilizacao_demanda_5pct_${periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
  const header = [
    'Usina',
    'Responsável / Regional',
    'Período',
    'Demanda Contratada (kW)',
    'Corte 5% da Demanda (kW)',
    'Pico Medido (kW)',
    'Déficit vs Corte 5% (kW)',
    '% da Demanda Contratada',
    'Diagnóstico',
    'Ação Recomendada de Campo',
  ];

  const rows = [header.join(';')];

  for (const item of items) {
    const row = [
      `"${item.usinaName}"`,
      `"${item.responsible}"`,
      `"${item.periodLabel}"`,
      item.contractedDemandKw.toString().replace('.', ','),
      item.threshold5PctKw.toString().replace('.', ','),
      item.measuredPeakKw.toString().replace('.', ','),
      item.deficitKw.toString().replace('.', ','),
      `${item.utilizationPercentage.toFixed(1).replace('.', ',')}%`,
      `"${item.statusLabel}"`,
      `"${item.recommendedAction}"`,
    ];
    rows.push(row.join(';'));
  }

  downloadCsv(rows.join('\r\n'), safeFilename);
}

/**
 * Export Consolidated Monthly Period Summary to Excel-compatible CSV
 */
export function exportPeriodSummaryToCsv(
  usinas: UsinaMonthlyRecord[],
  monthIndex: number,
  year = 2025
) {
  const monthName = MONTH_NAMES[monthIndex]?.full || `Mês ${monthIndex}`;
  const periodLabel = `${monthName} / ${year}`;
  const safeFilename = `demanda_usinas_${periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
  const header = [
    'Usina',
    'Responsável / Regional',
    'Período',
    'Demanda Contratada (kW)',
    'Limite +3% (kW)',
    'Corte 5% (kW)',
    'Pico Medido (kW)',
    'Excesso vs Limite (kW)',
    '% da Demanda Contratada',
    'Status Operacional',
  ];

  const rows = [header.join(';')];

  for (const u of usinas) {
    const monthData = u.months.find((m) => m.monthIndex === monthIndex && m.year === year);
    const powerKw = monthData?.powerKw ?? null;
    const contracted = u.contractedDemandKw;
    const tolerance = u.toleranceLimitKw;
    const threshold5 = u.threshold5PctKw;
    const excess = powerKw !== null && powerKw > tolerance ? Math.round((powerKw - tolerance) * 100) / 100 : 0;
    const pct = powerKw !== null && contracted > 0 ? ((powerKw / contracted) * 100).toFixed(1) : '0,0';

    let status = 'Conforme';
    if (powerKw === null || powerKw === 0) {
      status = 'Sem Injeção / Offline';
    } else if (powerKw > tolerance) {
      status = 'Ultrapassou Limite (+3%)';
    } else if (powerKw < threshold5) {
      status = 'Subutilização (< 5%)';
    }

    const row = [
      `"${u.name}"`,
      `"${u.responsible || 'Operação Central'}"`,
      `"${periodLabel}"`,
      contracted.toString().replace('.', ','),
      tolerance.toString().replace('.', ','),
      threshold5.toString().replace('.', ','),
      powerKw !== null ? powerKw.toString().replace('.', ',') : '0',
      excess.toString().replace('.', ','),
      `${pct.replace('.', ',')}%`,
      `"${status}"`,
    ];
    rows.push(row.join(';'));
  }

  downloadCsv(rows.join('\r\n'), safeFilename);
}

/**
 * Copy tab-delimited text to clipboard for direct 1-click paste into Excel
 */
export async function copyReportToClipboard(
  headers: string[],
  rows: (string | number)[][]
): Promise<boolean> {
  const tsvLines = [
    headers.join('\t'),
    ...rows.map((row) =>
      row
        .map((cell) => {
          if (typeof cell === 'number') {
            return cell.toString().replace('.', ',');
          }
          return String(cell).replace(/\r?\n|\t/g, ' ');
        })
        .join('\t')
    ),
  ].join('\r\n');

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(tsvLines);
      return true;
    } else {
      // Fallback textarea
      const el = document.createElement('textarea');
      el.value = tsvLines;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    }
  } catch (err) {
    console.error('Clipboard copy error:', err);
    return false;
  }
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
