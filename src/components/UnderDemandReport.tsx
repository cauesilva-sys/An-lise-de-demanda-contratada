import React, { useState, useMemo } from 'react';
import { UnderDemandReportItem } from '../types/demand';
import { formatKw } from '../utils/demandParser';
import { exportUnderDemandToCsv, copyReportToClipboard } from '../utils/deviationReports';
import {
  BatteryWarning,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  AlertOctagon,
  PowerOff,
  Wrench,
  ArrowUpDown,
  ExternalLink,
  Info,
} from 'lucide-react';

interface UnderDemandReportProps {
  reportItems: UnderDemandReportItem[];
  periodLabel: string;
  onSelectUsinaForChart?: (usinaId: string) => void;
  onToast: (msg: string) => void;
}

type DiagnosisFilter = 'ALL' | 'OFFLINE' | 'CRITICAL' | 'LOW';
type SortField = 'name' | 'contracted' | 'peak' | 'pct' | 'deficit';
type SortOrder = 'asc' | 'desc';

export const UnderDemandReport: React.FC<UnderDemandReportProps> = ({
  reportItems,
  periodLabel,
  onSelectUsinaForChart,
  onToast,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<DiagnosisFilter>('ALL');
  const [includeOffline, setIncludeOffline] = useState(true);
  const [sortField, setSortField] = useState<SortField>('pct');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isCopied, setIsCopied] = useState(false);

  // Filter & Sort
  const processedItems = useMemo(() => {
    let list = [...reportItems];

    if (!includeOffline) {
      list = list.filter((i) => i.statusDiagnosis !== 'offline');
    }

    if (filterType === 'OFFLINE') {
      list = list.filter((i) => i.statusDiagnosis === 'offline');
    } else if (filterType === 'CRITICAL') {
      list = list.filter((i) => i.statusDiagnosis === 'critical_low');
    } else if (filterType === 'LOW') {
      list = list.filter((i) => i.statusDiagnosis === 'low');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.usinaName.toLowerCase().includes(q) ||
          i.responsible.toLowerCase().includes(q) ||
          i.statusLabel.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortField) {
        case 'name':
          valA = a.usinaName.toLowerCase();
          valB = b.usinaName.toLowerCase();
          return sortOrder === 'asc'
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        case 'contracted':
          valA = a.contractedDemandKw;
          valB = b.contractedDemandKw;
          break;
        case 'peak':
          valA = a.measuredPeakKw;
          valB = b.measuredPeakKw;
          break;
        case 'pct':
          valA = a.utilizationPercentage;
          valB = b.utilizationPercentage;
          break;
        case 'deficit':
          valA = a.deficitKw;
          valB = b.deficitKw;
          break;
      }

      return sortOrder === 'asc'
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

    return list;
  }, [reportItems, includeOffline, filterType, search, sortField, sortOrder]);

  // KPIs
  const totalSubutilized = reportItems.length;
  const offlineCount = reportItems.filter((i) => i.statusDiagnosis === 'offline').length;
  const criticalCount = reportItems.filter((i) => i.statusDiagnosis === 'critical_low').length;
  const lowCount = reportItems.filter((i) => i.statusDiagnosis === 'low').length;

  const totalDeficitKw = useMemo(() => {
    return reportItems.reduce((acc, curr) => acc + curr.deficitKw, 0);
  }, [reportItems]);

  // Export handlers
  const handleExportCsv = () => {
    if (processedItems.length === 0) {
      onToast('Nenhum dado para exportação no filtro atual.');
      return;
    }
    exportUnderDemandToCsv(processedItems, periodLabel);
    onToast(`Relatório de subutilização exportado com sucesso (${processedItems.length} registros)!`);
  };

  const handleCopyTable = async () => {
    if (processedItems.length === 0) {
      onToast('Nenhum dado na tabela para copiar.');
      return;
    }

    const headers = [
      'Usina',
      'Responsável / Regional',
      'Período',
      'Demanda Contratada (kW)',
      'Corte 5% da Demanda (kW)',
      'Pico Medido (kW)',
      'Déficit vs 5% (kW)',
      '% Utilização',
      'Diagnóstico',
      'Ação Recomendada',
    ];

    const rows = processedItems.map((i) => [
      i.usinaName,
      i.responsible,
      i.periodLabel,
      i.contractedDemandKw,
      i.threshold5PctKw,
      i.measuredPeakKw,
      i.deficitKw,
      `${i.utilizationPercentage.toFixed(1)}%`,
      i.statusLabel,
      i.recommendedAction,
    ]);

    const success = await copyReportToClipboard(headers, rows);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      onToast('Tabela copiada em formato Excel (TSV)! Cole diretamente no Excel ou Sheets.');
    } else {
      onToast('Não foi possível copiar para a área de transferência.');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Context */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 text-white rounded-2xl p-5 border border-amber-900/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <BatteryWarning className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Relatório 2: Subutilização Abaixo de 5% de Demanda
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {periodLabel}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Identificação de usinas com desempenho crítico ou sem injeção (<strong>pico medido &lt; 5% da demanda contratada</strong>). Casos de alta prioridade para manutenção de campo, religamento ou auditoria de telemetria.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyTable}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold border border-slate-700 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Copiar tabela formatada com tabulações para o Excel"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              <span>{isCopied ? 'Copiado para Excel!' : 'Copiar Tabela (Excel)'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              title="Baixar planilha CSV compatível com Excel"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel (.csv)</span>
            </button>
          </div>
        </div>

        {/* KPI Mini-Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Subutilizadas
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-amber-400">
                {totalSubutilized}
              </span>
              <span className="text-xs text-slate-400">usinas</span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Sem Geração / 0 kW
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-rose-400">
                {offlineCount}
              </span>
              <span className="text-xs text-slate-400">desconectadas</span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Geração Crítica (&lt; 2%)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-amber-300">
                {criticalCount}
              </span>
              <span className="text-xs text-slate-400">em trip/queda</span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Déficit Total vs 5%
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-slate-200">
                {formatKw(totalDeficitKw)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search */}
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar usina, regional ou diagnóstico..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Filter Buttons & Offline Toggle */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Diagnosis Filters */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterType === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Todas ({reportItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('OFFLINE')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterType === 'OFFLINE'
                    ? 'bg-rose-600 text-white'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                Offline ({offlineCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('CRITICAL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterType === 'CRITICAL'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                Crítica &lt; 2% ({criticalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('LOW')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterType === 'LOW'
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-800 hover:bg-blue-50'
                }`}
              >
                2% a 5% ({lowCount})
              </button>
            </div>

            {/* Offline toggle */}
            <label className="flex items-center gap-1.5 text-slate-600 ml-1 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={includeOffline}
                onChange={(e) => setIncludeOffline(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Incluir usinas 0 kW</span>
            </label>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          {processedItems.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400">
              <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">
                Nenhuma usina encontrada com os critérios selecionados.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Todas as usinas geraram acima de 5% da demanda contratada em {periodLabel}.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold select-none">
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-3.5 cursor-pointer hover:bg-slate-200/60 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Usina</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5">Responsável / Regional</th>
                  <th
                    onClick={() => handleSort('contracted')}
                    className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Demanda (kW)</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-right">Corte 5% (kW)</th>
                  <th
                    onClick={() => handleSort('peak')}
                    className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Pico Medido (kW)</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('pct')}
                    className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5 text-amber-800">
                      <span>% Utilização</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-center">Diagnóstico Operacional</th>
                  <th className="py-3 px-3.5">Ação Recomendada de Campo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {processedItems.map((item) => {
                  const isOffline = item.statusDiagnosis === 'offline';
                  const isCritical = item.statusDiagnosis === 'critical_low';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">
                        <button
                          type="button"
                          onClick={() => onSelectUsinaForChart && onSelectUsinaForChart(item.usinaId)}
                          className="hover:text-blue-600 text-left flex items-center gap-1 group cursor-pointer"
                          title="Ver gráfico da usina"
                        >
                          <span>{item.usinaName}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                        </button>
                      </td>

                      <td className="py-2.5 px-3.5 text-slate-600">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[11px] font-medium text-slate-700 border border-slate-200">
                          {item.responsible}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-700 font-semibold">
                        {formatKw(item.contractedDemandKw)}
                      </td>

                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-500">
                        {formatKw(item.threshold5PctKw)}
                      </td>

                      <td className="py-2.5 px-3.5 text-right font-mono font-bold">
                        {isOffline ? (
                          <span className="text-rose-600">0 kW (Off)</span>
                        ) : (
                          <span className="text-amber-700">{formatKw(item.measuredPeakKw)}</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 text-right font-mono font-bold">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                            isOffline
                              ? 'bg-rose-100 text-rose-800'
                              : isCritical
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {item.utilizationPercentage.toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-center">
                        {isOffline && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <PowerOff className="w-3 h-3" />
                            Sem Injeção / 0 kW
                          </span>
                        )}
                        {isCritical && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertOctagon className="w-3 h-3 text-amber-700" />
                            Subutilização Severa (&lt; 2%)
                          </span>
                        )}
                        {!isOffline && !isCritical && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <BatteryWarning className="w-3 h-3 text-blue-600" />
                            Abaixo de 5%
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 text-slate-600 text-[11px] leading-snug">
                        <div className="flex items-start gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{item.recommendedAction}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info & Excel instruction */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Listando <strong>{processedItems.length}</strong> usinas para tratamento independente de subutilização em {periodLabel}.
            </span>
          </div>
          <div className="font-medium text-slate-600">
            Exportação direta: clique em <strong>"Exportar Excel (.csv)"</strong> ou use <strong>"Copiar Tabela (Excel)"</strong> e cole no Excel (Ctrl+V).
          </div>
        </div>
      </div>
    </div>
  );
};
