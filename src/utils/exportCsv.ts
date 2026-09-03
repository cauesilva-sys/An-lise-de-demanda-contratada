import { UsinaDemandSummary } from '../types';

export function exportDemandSummariesToCsv(
  summaries: UsinaDemandSummary[],
  startTime: string,
  endTime: string,
  apiToken: string
) {
  const headers = [
    'Usina',
    'Tipo de Dispositivo',
    'Demanda Contratada (kW)',
    'Pico Maximo Registrado (kW)',
    'Data Exata do Pico',
    'Hora Exata do Pico',
    'Excedente (kW)',
    'Uso do Contrato (%)',
    'Status de Infracao',
  ];

  const rows = summaries.map((s) => {
    const [datePart, timePart] = s.maxPeakTimestamp ? s.maxPeakTimestamp.split(' ') : ['', ''];
    const formattedDate = datePart ? datePart.split('-').reverse().join('/') : '--/--/----';
    const formattedTime = timePart || '00:00:00';

    return [
      `"${s.usinaName}"`,
      `"${s.deviceType}"`,
      s.contractedDemandKw,
      s.maxPeakKw.toFixed(2),
      `"${formattedDate}"`,
      `"${formattedTime}"`,
      s.excessKw.toFixed(2),
      `${s.percentageOfContracted.toFixed(1)}%`,
      `"${s.status === 'EXCEEDED' ? 'ULTRAPASSOU DEMANDA' : s.status === 'WARNING' ? 'ATENÇÃO (>90%)' : 'DENTRO DO CONTRATO'}"`,
    ];
  });

  const metaHeader = [
    `# Relatório de Auditoria de Demanda de Usinas Solares`,
    `# Período Analisado: ${startTime} até ${endTime}`,
    `# Chave Token API: ${apiToken}`,
    `# Data de Geracao: ${new Date().toLocaleString('pt-BR')}`,
    '',
  ];

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    metaHeader.join('\n') +
    headers.join(';') +
    '\n' +
    rows.map((e) => e.join(';')).join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `relatorio_demanda_usinas_${startTime.substring(0, 10)}_a_${endTime.substring(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
