import React, { useState, useMemo } from 'react';
import { UsinaMonthlyRecord } from '../types/demand';
import { formatKw } from '../utils/demandParser';
import { Search, ArrowUpDown, ShieldAlert, ShieldCheck, Eye, Layers } from 'lucide-react';

interface AllPlantsRankingTableProps {
  usinas: UsinaMonthlyRecord[];
  selectedUsinaId: string;
  onSelectUsina: (usinaId: string) => void;
}

type SortField = 'name' | 'contracted' | 'tolerance' | 'highestPeak' | 'utilization' | 'exceededCount';
type SortOrder = 'asc' | 'desc';

export const AllPlantsRankingTable: React.FC<AllPlantsRankingTableProps> = ({
  usinas,
  selectedUsinaId,
  onSelectUsina,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'EXCEEDED' | 'OK'>('ALL');
  const [sortField, setSortField] = useState<SortField>('exceededCount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const processedList = useMemo(() => {
    let list = [...usinas];

    // Filter
    if (filter === 'EXCEEDED') {
      list = list.filter((u) => u.isExceededAnyMonth);
    } else if (filter === 'OK') {
      list = list.filter((u) => !u.isExceededAnyMonth);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          return sortOrder === 'asc' ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
        case 'contracted':
          valA = a.contractedDemandKw;
          valB = b.contractedDemandKw;
          break;
        case 'tolerance':
          valA = a.toleranceLimitKw;
          valB = b.toleranceLimitKw;
          break;
        case 'highestPeak':
          valA = a.highestPeakKw;
          valB = b.highestPeakKw;
          break;
        case 'utilization':
          valA = a.contractedDemandKw > 0 ? a.highestPeakKw / a.contractedDemandKw : 0;
          valB = b.contractedDemandKw > 0 ? b.highestPeakKw / b.contractedDemandKw : 0;
          break;
        case 'exceededCount':
          valA = a.exceededMonthsCount;
          valB = b.exceededMonthsCount;
          break;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });

    return list;
  }, [usinas, search, filter, sortField, sortOrder]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Table Header & Controls */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Visão Geral de Todas as Usinas ({usinas.length})
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Clique em qualquer linha da tabela para visualizar o gráfico combinado e cards de resumo.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar usina..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 w-48"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                filter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todas ({usinas.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('EXCEEDED')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                filter === 'EXCEEDED'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
              }`}
            >
              Ultrapassaram ({usinas.filter((u) => u.isExceededAnyMonth).length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('OK')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                filter === 'OK'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              Conformes ({usinas.filter((u) => !u.isExceededAnyMonth).length})
            </button>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 text-slate-600 font-semibold tracking-wider uppercase text-[11px]">
            <tr>
              <th className="py-2.5 px-4 cursor-pointer hover:text-slate-900 select-none" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  <span>Usina</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-4 text-right cursor-pointer hover:text-slate-900 select-none" onClick={() => handleSort('contracted')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Demanda Contratada</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-4 text-right cursor-pointer hover:text-slate-900 select-none" onClick={() => handleSort('tolerance')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Limite (+3%)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-4 text-right cursor-pointer hover:text-slate-900 select-none" onClick={() => handleSort('highestPeak')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Maior Pico</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-4 text-right cursor-pointer hover:text-slate-900 select-none" onClick={() => handleSort('utilization')}>
                <div className="flex items-center justify-end gap-1">
                  <span>% Utilização</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-4 text-center cursor-pointer hover:text-slate-900 select-none" onClick={() => handleSort('exceededCount')}>
                <div className="flex items-center justify-center gap-1">
                  <span>Status Geral</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {processedList.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Nenhuma usina encontrada com os filtros selecionados.
                </td>
              </tr>
            ) : (
              processedList.map((u) => {
                const isSelected = u.id === selectedUsinaId;
                const utilizationPct = u.contractedDemandKw > 0
                  ? (u.highestPeakKw / u.contractedDemandKw) * 100
                  : 0;

                return (
                  <tr
                    key={u.id}
                    onClick={() => onSelectUsina(u.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/90 font-medium'
                        : u.isExceededAnyMonth
                        ? 'hover:bg-red-50/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="truncate max-w-xs">{u.name}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                      {formatKw(u.contractedDemandKw)}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono text-amber-700 font-medium">
                      {formatKw(u.toleranceLimitKw)}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      <span className={u.highestPeakKw > u.toleranceLimitKw ? 'text-red-600' : 'text-slate-900'}>
                        {formatKw(u.highestPeakKw)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1 font-sans">({u.highestPeakMonth})</span>
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono">
                      <span className={utilizationPct > 103 ? 'text-red-600 font-bold' : 'text-slate-700'}>
                        {utilizationPct.toFixed(1)}%
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      {u.isExceededAnyMonth ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          {u.exceededMonthsCount} {u.exceededMonthsCount === 1 ? 'mês > +3%' : 'meses > +3%'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Conforme
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectUsina(u.id);
                        }}
                        className={`p-1 rounded-md transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                        }`}
                        title="Visualizar gráfico desta usina"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
