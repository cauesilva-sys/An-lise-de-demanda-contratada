import { UsinaMonthlyRecord } from '../types/demand';

export function exportMonthlyRecordsToCsv(usinas: UsinaMonthlyRecord[], filename = 'monitor_demanda_usinas.csv') {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const header = ['Usina', 'Demanda Contratada (kW)', 'Limite +3% (kW)', ...months, 'Maior Pico (kW)', 'Mês Maior Pico', 'Ultrapassou Limite'];

  const rows = [header.join(';')];

  for (const u of usinas) {
    const row = [
      `"${u.name}"`,
      u.contractedDemandKw.toString().replace('.', ','),
      u.toleranceLimitKw.toString().replace('.', ','),
    ];

    for (let m = 1; m <= 12; m++) {
      const point = u.months.find((p) => p.monthIndex === m);
      const val = point?.powerKw !== null && point?.powerKw !== undefined
        ? point.powerKw.toString().replace('.', ',')
        : '';
      row.push(val);
    }

    row.push(u.highestPeakKw.toString().replace('.', ','));
    row.push(`"${u.highestPeakMonth}"`);
    row.push(u.isExceededAnyMonth ? '"SIM (Alerta)"' : '"NÃO (Conforme)"');

    rows.push(row.join(';'));
  }

  const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
