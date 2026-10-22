import React from 'react';
import { PeriodOption, PeriodFilterMode } from '../types/demand';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  BatteryWarning,
  CheckCircle,
  FileSpreadsheet,
  X,
  Filter,
} from 'lucide-react';

interface PeriodSelectorProps {
  periodOptions: PeriodOption[];
  selectedMonthIndex: number;
  selectedYear: number;
  onSelectPeriod: (monthIndex: number, year: number) => void;
  activeFilter: PeriodFilterMode;
  onToggleFilter: (filter: PeriodFilterMode) => void;
  onExportExcel: () => void;
  filteredCount?: number;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periodOptions,
  selectedMonthIndex,
  selectedYear,
  onSelectPeriod,
  activeFilter,
  onToggleFilter,
  onExportExcel,
  filteredCount,
}) => {
  const currentOption = periodOptions.find(
    (p) => p.monthIndex === selectedMonthIndex && p.year === selectedYear
  ) || periodOptions[0];

  const currentIndex = periodOptions.findIndex(
    (p) => p.monthIndex === selectedMonthIndex && p.year === selectedYear
  );

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prev = periodOptions[currentIndex - 1];
      onSelectPeriod(prev.monthIndex, prev.year);
    }
  };

  const handleNext = () => {
    if (currentIndex < periodOptions.length - 1) {
      const next = periodOptions[currentIndex + 1];
      onSelectPeriod(next.monthIndex, next.year);
    }
  };

  const isFiltered = activeFilter !== 'all';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Title & Controls */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Período de Análise
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                (Mês e Ano dos Dados)
              </span>
            </div>
            {/* Quick dropdown with prev/next buttons */}
            <div className="flex items-center gap-1.5 mt-1">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={`${selectedYear}-${selectedMonthIndex}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-').map(Number);
                  onSelectPeriod(m, y);
                }}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 font-bold text-sm rounded-lg px-3 py-1 outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
              >
                {periodOptions.map((opt) => (
                  <option key={opt.key} value={`${opt.year}-${opt.monthIndex}`}>
                    {opt.label} {opt.hasData ? `(${opt.totalUsinasCount} ativas)` : '(Sem medição)'}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= periodOptions.length - 1}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Interactive Filters & Excel Export */}
        {currentOption && (
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            {/* Instruction / Filter Label */}
            <div className="hidden xl:flex items-center gap-1 text-[11px] text-slate-400 font-medium mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtrar usinas:</span>
            </div>

            {/* Filter 1: Over-demand (> +3%) Button */}
            <button
              type="button"
              onClick={() => onToggleFilter(activeFilter === 'over_3' ? 'all' : 'over_3')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none ${
                activeFilter === 'over_3'
                  ? 'bg-red-600 text-white border-red-700 shadow-sm ring-2 ring-red-400 ring-offset-1'
                  : currentOption.exceededCount > 0
                  ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title={
                activeFilter === 'over_3'
                  ? 'Filtro ativo! Clique para voltar a exibir todas as usinas.'
                  : `Filtrar a lista para mostrar apenas as ${currentOption.exceededCount} usinas que ultrapassaram +3%`
              }
            >
              <AlertTriangle className={`w-4 h-4 shrink-0 ${activeFilter === 'over_3' ? 'text-white' : 'text-red-600'}`} />
              <span>
                <strong>{currentOption.exceededCount}</strong> {currentOption.exceededCount === 1 ? 'usina' : 'usinas'} &gt; +3%
              </span>
              {activeFilter === 'over_3' && (
                <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded text-[10px] uppercase font-bold tracking-wide">
                  Ativo
                </span>
              )}
            </button>

            {/* Filter 2: Underutilized (< 5%) Button */}
            <button
              type="button"
              onClick={() => onToggleFilter(activeFilter === 'under_5' ? 'all' : 'under_5')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none ${
                activeFilter === 'under_5'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-400 ring-offset-1'
                  : currentOption.underutilizedCount > 0
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title={
                activeFilter === 'under_5'
                  ? 'Filtro ativo! Clique para voltar a exibir todas as usinas.'
                  : `Filtrar a lista para mostrar apenas as ${currentOption.underutilizedCount} usinas com subutilização < 5%`
              }
            >
              <BatteryWarning className={`w-4 h-4 shrink-0 ${activeFilter === 'under_5' ? 'text-white' : 'text-amber-600'}`} />
              <span>
                <strong>{currentOption.underutilizedCount}</strong> {currentOption.underutilizedCount === 1 ? 'usina' : 'usinas'} &lt; 5%
              </span>
              {activeFilter === 'under_5' && (
                <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded text-[10px] uppercase font-bold tracking-wide">
                  Ativo
                </span>
              )}
            </button>

            {/* Reset / All plants button (when filtered) */}
            {isFiltered && (
              <button
                type="button"
                onClick={() => onToggleFilter('all')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="Limpar filtro e voltar a exibir todas as 125 usinas"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Ver Todas ({periodOptions[0]?.totalUsinasCount || 125})</span>
              </button>
            )}

            {/* DIRECT EXCEL DOWNLOAD BUTTON */}
            <button
              type="button"
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title={
                activeFilter === 'over_3'
                  ? `Baixar planilha Excel com as ${currentOption.exceededCount} usinas que ultrapassaram +3%`
                  : activeFilter === 'under_5'
                  ? `Baixar planilha Excel com as ${currentOption.underutilizedCount} usinas abaixo de 5%`
                  : `Baixar planilha Excel com o consolidado de todas as usinas de ${currentOption.label}`
              }
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>
                {activeFilter === 'over_3'
                  ? `Baixar em Excel (${currentOption.exceededCount} usinas > +3%)`
                  : activeFilter === 'under_5'
                  ? `Baixar em Excel (${currentOption.underutilizedCount} usinas < 5%)`
                  : 'Baixar em Excel'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Active Filter Notification Bar */}
      {isFiltered && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                activeFilter === 'over_3' ? 'bg-red-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-600 font-medium">
              Filtro ativo no período{' '}
              <strong className="text-slate-900">{currentOption.label}</strong>: Exibindo apenas as{' '}
              <strong className={activeFilter === 'over_3' ? 'text-red-700 font-bold' : 'text-amber-800 font-bold'}>
                {filteredCount ?? (activeFilter === 'over_3' ? currentOption.exceededCount : currentOption.underutilizedCount)} usinas
              </strong>{' '}
              {activeFilter === 'over_3' ? 'que ultrapassaram o limite de +3%' : 'com subutilização abaixo de 5%'}.
            </span>
          </div>

          <button
            type="button"
            onClick={() => onToggleFilter('all')}
            className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer text-xs"
          >
            Remover filtro e mostrar todas as usinas
          </button>
        </div>
      )}
    </div>
  );
};

