import { UsinaDemandSummary } from '../types';

export function exportDemandSummariesToCsv(
  summaries: UsinaDemandSummary[],
  startTime: string,
  endTime: string,
  apiToken?: string
) {
  // Cabeçalhos limpos na Linha 1 para compatibilidade nativa com Excel, Sheets e PowerBI
  const headers = [
    'Nome da Usina',
    'Demanda Contratada (kW)',
    'Maior Potência do Período (kW)',
    'Data do Pico',
    'Hora do Pico',
    'Data e Hora Completa do Pico',
    'Percentual da Demanda (%)',
    'Excedente (kW)',
    'Status Operacional',
  ];

  const rows = summaries.map((s) => {
    const rawTs = s.maxPeakTimestamp || '';
    const [datePart, timePart] = rawTs.split(' ');

    // Formata data brasileira DD/MM/AAAA
    let formattedDate = '--/--/----';
    if (datePart) {
      const parts = datePart.split('-');
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        formattedDate = datePart;
      }
    }

    const formattedTime = timePart || '00:00:00';
    const fullDateTime = `${formattedDate} ${formattedTime}`.trim();

    // Status operacional amigável
    let statusLabel = 'Dentro do Contrato (OK)';
    if (s.status === 'EXCEEDED') {
      statusLabel = 'Ultrapassou Demanda (>103%)';
    } else if (s.status === 'WARNING') {
      statusLabel = s.percentageOfContracted > 100
        ? 'Alerta de Tolerância (<=103%)'
        : 'Atenção (>90%)';
    }

    // Formatação numérica brasileira (vírgula decimal sem separador de milhar)
    // Permite que o Excel reconheça automaticamente como valor numérico para cálculos e gráficos
    const contractedStr = s.contractedDemandKw.toFixed(2).replace('.', ',');
    const peakStr = s.maxPeakKw.toFixed(2).replace('.', ',');
    const pctStr = `${s.percentageOfContracted.toFixed(1).replace('.', ',')}%`;
    const excessStr = s.excessKw > 0 ? s.excessKw.toFixed(2).replace('.', ',') : '0,00';

    return [
      `"${s.usinaName.replace(/"/g, '""')}"`,
      contractedStr,
      peakStr,
      `"${formattedDate}"`,
      `"${formattedTime}"`,
      `"${fullDateTime}"`,
      `"${pctStr}"`,
      excessStr,
      `"${statusLabel}"`,
    ];
  });

  // Linha 1 = Cabeçalhos (padrão CSV com separador ponto e vírgula para Excel em português)
  const csvContent =
    '\uFEFF' + // BOM UTF-8 para o Excel abrir com acentuação correta
    headers.join(';') +
    '\r\n' +
    rows.map((row) => row.join(';')).join('\r\n');

  // Usa Blob + URL.createObjectURL para suportar qualquer volume de dados com segurança
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const startClean = startTime.substring(0, 10).replace(/[^0-9-]/g, '');
  const endClean = endTime.substring(0, 10).replace(/[^0-9-]/g, '');
  const filename = startClean === endClean
    ? `demanda_usinas_${startClean}.csv`
    : `demanda_usinas_${startClean}_a_${endClean}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
