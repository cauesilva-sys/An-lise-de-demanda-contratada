import React, { useState, useMemo } from 'react';
import { OverDemandReportItem } from '../types/demand';
import { formatKw } from '../utils/demandParser';
import { exportOverDemandToCsv, copyReportToClipboard } from '../utils/deviationReports';
import {
  AlertTriangle,
  Download,
  Copy,
  Check,
  Search,
  CheckSquare,
  Square,
  TrendingUp,
  ShieldAlert,
  Flame,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';

interface OverDemandReportProps {
  reportItems: OverDemandReportItem[];
  periodLabel: string;
  onSelectUsinaForChart?: (usinaId: string) => void;
  onToast: (msg: string) => void;
}

type SortField = 'name' | 'excess' | 'peak' | 'contracted' | 'pct';
type SortOrder = 'asc' | 'desc';

export const OverDemandReport: React.FC<OverDemandReportProps> = ({
  reportItems,
  periodLabel,
  onSelectUsinaForChart,
  onToast,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Default: all selected for batch monitoring
    return new Set(reportItems.map((item) => item.id));
  });
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('excess');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isCopied, setIsCopied] = useState(false);

  // Sync selectedIds when reportItems change
  React.useEffect(() => {
    setSelectedIds(new Set(reportItems.map((item) => item.id)));
  }, [reportItems]);

  // Filtered & Sorted items
  const processedItems = useMemo(() => {
    let list = [...reportItems];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.usinaName.toLowerCase().includes(q) ||
          item.responsible.toLowerCase().includes(q)
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
        case 'excess':
          valA = a.excessKw;
          valB = b.excessKw;
          break;
        case 'peak':
          valA = a.measuredPeakKw;
          valB = b.measuredPeakKw;
          break;
        case 'contracted':
          valA = a.contractedDemandKw;
          valB = b.contractedDemandKw;
          break;
        case 'pct':
          valA = a.excessPercentage;
          valB = b.excessPercentage;
          break;
      }

      return sortOrder === 'asc'
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

    return list;
  }, [reportItems, search, sortField, sortOrder]);

  // Batch selection handlers
  const handleSelectAll = () => {
    setSelectedIds(new Set(processedItems.map((item) => item.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleInvertSelection = () => {
    const next = new Set<string>();
    for (const item of processedItems) {
      if (!selectedIds.has(item.id)) {
        next.add(item.id);
      }
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // KPI Calculations
  const totalExcessKw = useMemo(() => {
    return reportItems.reduce((acc, curr) => acc + curr.excessKw, 0);
  }, [reportItems]);

  const highestExcessItem = useMemo(() => {
    if (reportItems.length === 0) return null;
    return [...reportItems].sort((a, b) => b.excessKw - a.excessKw)[0];
  }, [reportItems]);

  const avgExcessKw = useMemo(() => {
    if (reportItems.length === 0) return 0;
    return Math.round((totalExcessKw / reportItems.length) * 100) / 100;
  }, [reportItems, totalExcessKw]);

  // Export handlers
  const handleExportSelected = () => {
    const selectedItems = reportItems.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) {
      onToast('Nenhuma usina selecionada para exportação.');
      return;
    }
    exportOverDemandToCsv(selectedItems, periodLabel);
    onToast(`${selectedItems.length} usinas exportadas em formato compatível com Excel!`);
  };

  const handleCopyTable = async () => {
    const selectedItems = reportItems.filter((i) => selectedIds.has(i.id));
    const targetItems = selectedItems.length > 0 ? selectedItems : reportItems;

    const headers = [
      'Usina',
      'Responsável / Regional',
      'Período',
      'Demanda Contratada (kW)',
      'Limite +3% (kW)',
      'Pico Medido (kW)',
      'Excesso (kW)',
      '% Acima do Limite',
      '% Demanda Contratada',
    ];

    const rows = targetItems.map((i) => [
      i.usinaName,
      i.responsible,
      i.periodLabel,
      i.contractedDemandKw,
      i.toleranceLimitKw,
      i.measuredPeakKw,
      i.excessKw,
      `${i.excessPercentage.toFixed(1)}%`,
      `${i.utilizationPercentage.toFixed(1)}%`,
    ]);

    const success = await copyReportToClipboard(headers, rows);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      onToast('Tabela copiada para a área de transferência! Cole diretamente no Excel.');
    } else {
      onToast('Não foi possível copiar automaticamente para o Excel.');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const allVisibleSelected =
    processedItems.length > 0 &&
    processedItems.every((item) => selectedIds.has(item.id));

  return (
    <div className="space-y-6">
      {/* Top Banner & Context */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 text-white rounded-2xl p-5 border border-red-900/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Relatório 1: Superação de Demanda Acima de 3%
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  {periodLabel}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Listagem oficial de usinas que ultrapassaram a tolerância regulatória de <strong>+3%</strong> sobre a Demanda Contratada. Selecione individualmente ou em lote para acompanhamento operacional e exportação.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyTable}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold border border-slate-700 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Copiar tabela formatada para colar no Excel"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              <span>{isCopied ? 'Copiado para Excel!' : 'Copiar Tabela (Excel)'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportSelected}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              title="Baixar planilha CSV das usinas selecionadas"
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
              Usinas com Desvio
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-red-400">
                {reportItems.length}
              </span>
              <span className="text-xs text-slate-400">usinas</span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Excesso Acumulado
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-amber-400">
                {formatKw(totalExcessKw)}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Média de Excesso
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold font-mono text-slate-200">
                {formatKw(avgExcessKw)}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Maior Desvio Individual
            </span>
            <div className="mt-1 truncate">
              {highestExcessItem ? (
                <div>
                  <span className="text-xs font-bold text-red-300 block truncate">
                    {highestExcessItem.usinaName}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    +{formatKw(highestExcessItem.excessKw)} ({highestExcessItem.excessPercentage.toFixed(1)}%)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-500">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar: Search and Batch selection */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search */}
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar usina ou regional..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Batch Selection Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Seleção em Lote:</span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-300 font-semibold transition-colors"
            >
              Todas ({processedItems.length})
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-300 font-semibold transition-colors"
            >
              Nenhuma
            </button>
            <button
              type="button"
              onClick={handleInvertSelection}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-300 font-semibold transition-colors"
            >
              Inverter
            </button>
            <div className="ml-2 pl-3 border-l border-slate-200 font-bold text-blue-700">
              {selectedIds.size} de {reportItems.length} selecionadas
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          {processedItems.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400">
              <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">
                {reportItems.length === 0
                  ? `Nenhuma usina ultrapassou a margem de +3% em ${periodLabel}.`
                  : 'Nenhuma usina encontrada com os termos da pesquisa.'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Todas as usinas monitoradas operaram dentro do limite regulatório acordado.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold select-none">
                  <th className="py-3 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => {
                        if (e.target.checked) handleSelectAll();
                        else handleDeselectAll();
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Selecionar visíveis"
                    />
                  </th>
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
                  <th className="py-3 px-3.5 text-right">Limite +3% (kW)</th>
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
                    onClick={() => handleSort('excess')}
                    className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5 text-red-700">
                      <span>Excesso (kW)</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-red-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('pct')}
                    className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5 text-red-700">
                      <span>% Acima Limite</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-red-500" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-center">Status / Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {processedItems.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isChecked ? 'bg-red-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectUsinaForChart && onSelectUsinaForChart(item.usinaId)}
                            className="font-bold text-slate-900 hover:text-blue-600 text-left flex items-center gap-1 group cursor-pointer"
                            title="Ver gráfico detalhado desta usina"
                          >
                            <span>{item.usinaName}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                          </button>
                        </div>
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
                        {formatKw(item.toleranceLimitKw)}
                      </td>

                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">
                        {formatKw(item.measuredPeakKw)}
                      </td>

                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-red-600 bg-red-50/50">
                        +{formatKw(item.excessKw)}
                      </td>

                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-red-600">
                        +{item.excessPercentage.toFixed(1)}%
                      </td>

                      <td className="py-2.5 px-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          <AlertTriangle className="w-3 h-3" />
                          Superou Tolerância
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <span>
            Exibindo <strong>{processedItems.length}</strong> de <strong>{reportItems.length}</strong> usinas com superação em {periodLabel}.
          </span>
          <span className="font-medium text-slate-600">
            Dica: Selecione as usinas desejadas com as caixas de seleção e clique em "Exportar Excel" ou "Copiar Tabela".
          </span>
        </div>
      </div>
    </div>
  );
};
