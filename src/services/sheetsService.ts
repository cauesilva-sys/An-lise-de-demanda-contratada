// ID oficial extraído da sua folha de cálculo Google Sheets
export const SPREADSHEET_ID = '11YGvwcxt8-65qKXm-7db5n070FnkAApYajZ-Nl9l9fo';

export interface UsinaDemandaItem {
  usina: string;
  ano: number;
  meses: { [mes: string]: number };
}

export interface DemandaAnoData {
  ano: number;
  dados: UsinaDemandaItem[];
}

// Leitor CSV nativo robusto (não necessita de bibliotecas externas)
function parseCsvLinhas(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (insideQuote && next === '"') {
        cur += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (c === ',' && !insideQuote) {
      row.push(cur.trim());
      cur = '';
    } else if ((c === '\r' || c === '\n') && !insideQuote) {
      if (c === '\r' && next === '\n') i++;
      row.push(cur.trim());
      if (row.some((cell) => cell.length > 0)) lines.push(row);
      row = [];
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur.trim());
    if (row.some((cell) => cell.length > 0)) lines.push(row);
  }
  return lines;
}

/**
 * Procura os dados de um ano pelo nome exato do separador: 'Demanda pico Ano 2026'
 */
async function fetchAnoSheet(ano: number, spreadsheetId: string): Promise<DemandaAnoData | null> {
  const nomeAba = encodeURIComponent(`Demanda pico Ano ${ano}`);
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${nomeAba}&t=${Date.now()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const csvText = await res.text();
    if (csvText.includes('<!DOCTYPE html>') || csvText.includes('google.visualization.Query.setResponse')) {
      return null;
    }

    const rows = parseCsvLinhas(csvText);
    if (rows.length < 3) return null;

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // As usinas iniciam na linha 3 da folha (índice 2)
    const dadosUsinas: UsinaDemandaItem[] = rows.slice(2)
      .filter((r) => r[0] && r[0].trim() !== '' && !r[0].toLowerCase().includes('todos os campos'))
      .map((r) => {
        const valoresMeses: { [mes: string]: number } = {};
        meses.forEach((m, idx) => {
          const valStr = r[idx + 1] ? r[idx + 1].replace(/\./g, '').replace(',', '.') : '0';
          valoresMeses[m] = parseFloat(valStr) || 0;
        });

        return {
          usina: r[0].trim(),
          ano,
          meses: valoresMeses,
        };
      });

    return {
      ano,
      dados: dadosUsinas,
    };
  } catch {
    return null;
  }
}

/**
 * Efetua a varredura dinâmica a partir de 2024 até aos anos seguintes (2027, 2028, etc.)
 */
export async function carregarTodosOsAnosDinamicos(spreadsheetId = SPREADSHEET_ID): Promise<DemandaAnoData[]> {
  const anoInicial = 2024;
  const anoLimite = new Date().getFullYear() + 2;
  
  const anosParaTestar: number[] = [];
  for (let y = anoInicial; y <= anoLimite; y++) {
    anosParaTestar.push(y);
  }

  const resultados = await Promise.all(anosParaTestar.map((ano) => fetchAnoSheet(ano, spreadsheetId)));

  return resultados
    .filter((item): item is DemandaAnoData => item !== null && item.dados.length > 0)
    .sort((a, b) => b.ano - a.ano);
}
