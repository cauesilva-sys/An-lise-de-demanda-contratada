import React from 'react';
import { PeriodOption, PeriodFilterMode, OverDemandReportItem } from '../types/demand';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  BatteryWarning,
  FileSpreadsheet,
  X,
  Filter,
  CheckCircle2,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { formatKw } from '../utils/demandParser';

interface PeriodSelectorProps {
  periodOptions: PeriodOption[];
  selectedMonthIndex: number;
  selectedYear: number;
  onSelectPeriod: (monthIndex: number, year: number) => void;
  activeFilter: PeriodFilterMode;
  onToggleFilter: (filter: PeriodFilterMode) => void;
  onExportExcel: () => void;
  filteredCount?: number;
  overDemandItems?: OverDemandReportItem[];
  selectedUsinaId?: string;
  onSelectUsina?: (usinaId: string) => void;
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
  overDemandItems = [],
  selectedUsinaId,
  onSelectUsina,
}) => {
  const currentOption =
    periodOptions.find((p) => p.monthIndex === selectedMonthIndex && p.year === selectedYear) ||
    periodOptions[0];

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

  const availableYears = React.useMemo(() => {
    const set = new Set<number>();
    periodOptions.forEach((p) => set.add(p.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [periodOptions]);

  const isFiltered = activeFilter !== 'all';
  const isOver3Active = activeFilter === 'over_3';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 mb-6 transition-all">
      {/* Top Row: Year, Month, Controls, Filter Buttons & Excel Export */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Period Picker & Year Toggles */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shrink-0 shadow-2xs">
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

            {/* Quick dropdown with prev/next buttons and year toggle */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {availableYears.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  {availableYears.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => onSelectPeriod(selectedMonthIndex, yr)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        selectedYear === yr
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1">
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
                      {opt.label} {opt.hasData ? `(${opt.totalUsinasCount} com medição)` : '(Sem medição)'}
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
        </div>

        {/* Right: Interactive Filters & Direct Excel Export */}
        {currentOption && (
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div className="hidden xl:flex items-center gap-1 text-[11px] text-slate-400 font-medium mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtrar período:</span>
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
                  : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
              }`}
              title={
                activeFilter === 'over_3'
                  ? 'Filtro focado ativo! Clique para voltar a exibir todas as usinas.'
                  : `Filtrar a lista para focar apenas nas ${currentOption.exceededCount} usinas que ultrapassaram +3%`
              }
            >
              <AlertTriangle className={`w-4 h-4 shrink-0 ${activeFilter === 'over_3' ? 'text-white' : 'text-red-600'}`} />
              <span>
                <strong>{currentOption.exceededCount}</strong> {currentOption.exceededCount === 1 ? 'usina' : 'usinas'} &gt; +3%
              </span>
              {activeFilter === 'over_3' && (
                <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded text-[10px] uppercase font-bold tracking-wide">
                  Focado
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
                  : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
              }`}
              title={
                activeFilter === 'under_5'
                  ? 'Filtro ativo! Clique para voltar a exibir todas as usinas.'
                  : `Filtrar a lista para focar nas ${currentOption.underutilizedCount} usinas com subutilização < 5%`
              }
            >
              <BatteryWarning className={`w-4 h-4 shrink-0 ${activeFilter === 'under_5' ? 'text-white' : 'text-amber-600'}`} />
              <span>
                <strong>{currentOption.underutilizedCount}</strong> {currentOption.underutilizedCount === 1 ? 'usina' : 'usinas'} &lt; 5%
              </span>
              {activeFilter === 'under_5' && (
                <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded text-[10px] uppercase font-bold tracking-wide">
                  Focado
                </span>
              )}
            </button>

            {/* Reset / All plants button (when filtered) */}
            {isFiltered && (
              <button
                type="button"
                onClick={() => onToggleFilter('all')}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="Limpar filtro e voltar a exibir todas as usinas"
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
                  ? `Baixar planilha Excel com as ${currentOption.exceededCount} usinas que ultrapassaram +3% em ${currentOption.label}`
                  : activeFilter === 'under_5'
                  ? `Baixar planilha Excel com as ${currentOption.underutilizedCount} usinas abaixo de 5% em ${currentOption.label}`
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

      {/* DYNAMIC FOCUSED SECTION DIRECTLY BELOW THE MONTH:
          "Ao clicar nas usinas que ultrapassaram a demanda contratada, exiba apenas as usinas selecionadas
          em uma linha/seção logo abaixo do respectivo mês, facilitando a visualização focada." */}
      {isOver3Active && (
        <div className="mt-3.5 pt-3 border-t border-red-100 bg-red-50/70 rounded-xl p-3.5 border animate-in fade-in slide-in-from-top-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
              <h3 className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                <span>Usinas com Ultrapassagem da Demanda Contratada (+3%)</span>
                <span className="font-semibold text-red-700">· {currentOption.label}</span>
              </h3>
              <span className="text-[10px] font-bold bg-red-200/80 text-red-900 px-2 py-0.5 rounded-full border border-red-300">
                {overDemandItems.length} {overDemandItems.length === 1 ? 'usina' : 'usinas'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-red-800 font-medium hidden md:inline">
                Clique em uma usina para visualização individual do gráfico
              </span>
              <button
                type="button"
                onClick={() => onToggleFilter('all')}
                className="text-[11px] font-bold text-red-800 hover:text-red-950 underline cursor-pointer ml-1"
              >
                Mostrar todas as usinas
              </button>
            </div>
          </div>

          {/* Plant chips/cards row */}
          {overDemandItems.length > 0 ? (
            <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              {overDemandItems.map((item) => {
                const isSelected = selectedUsinaId === item.usinaId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectUsina && onSelectUsina(item.usinaId)}
                    className={`flex flex-col justify-between shrink-0 min-w-[210px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-red-500 shadow-md ring-2 ring-red-400 ring-offset-1'
                        : 'bg-white/90 hover:bg-white border-red-200 hover:border-red-400 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-900 block truncate" title={item.usinaName}>
                          {item.usinaName}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {item.responsible}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.2 rounded shrink-0">
                          Foco
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-[11px] border-t border-slate-100 pt-1.5 font-mono">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[10px] text-slate-500 font-sans">Contratada:</span>
                        <span className="font-semibold">{formatKw(item.contractedDemandKw)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[10px] text-slate-500 font-sans">Limite (+3%):</span>
                        <span>{formatKw(item.toleranceLimitKw)}</span>
                      </div>
                      <div className="flex items-center justify-between text-red-700 font-bold bg-red-50/80 px-1.5 py-0.5 rounded">
                        <span className="text-[10px] font-sans">Pico Medido:</span>
                        <span>{formatKw(item.measuredPeakKw)}</span>
                      </div>
                      <div className="flex items-center justify-between text-red-800 text-[10px]">
                        <span className="font-sans font-medium">Excesso faturável:</span>
                        <span className="font-bold">+{formatKw(item.excessKw)} (+{item.excessPercentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-red-800 py-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Nenhuma usina ultrapassou a margem de +3% em <strong>{currentOption.label}</strong>.</span>
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC FOCUSED SECTION FOR UNDERUTILIZATION (<5%) */}
      {activeFilter === 'under_5' && (
        <div className="mt-3.5 pt-3 border-t border-amber-100 bg-amber-50/70 rounded-xl p-3.5 border animate-in fade-in slide-in-from-top-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse shrink-0" />
              <h3 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <span>Usinas com Subutilização de Demanda (&lt; 5%)</span>
                <span className="font-semibold text-amber-800">· {currentOption.label}</span>
              </h3>
              <span className="text-[10px] font-bold bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300">
                {currentOption.underutilizedCount} usinas
              </span>
            </div>

            <button
              type="button"
              onClick={() => onToggleFilter('all')}
              className="text-[11px] font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer self-start sm:self-auto"
            >
              Mostrar todas as usinas
            </button>
          </div>
          <p className="text-xs text-amber-900/90 leading-relaxed">
            Exibindo na tabela abaixo apenas as usinas cuja demanda medida ficou abaixo de 5% da demanda contratada (ou sem injeção / 0 kW).
          </p>
        </div>
      )}
    </div>
  );
};
