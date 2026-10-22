import React from 'react';
import { UsinaMonthlyRecord } from '../types/demand';
import { formatKw, MONTH_NAMES } from '../utils/demandParser';
import { Building2, ShieldCheck, ShieldAlert, Zap, TrendingUp, Calendar } from 'lucide-react';

interface PlantSummaryCardsProps {
  usina: UsinaMonthlyRecord;
  totalUsinasCount: number;
  currentUsinaIndex: number;
  selectedYear?: number;
  selectedMonthIndex?: number;
}

export const PlantSummaryCards: React.FC<PlantSummaryCardsProps> = ({
  usina,
  totalUsinasCount,
  currentUsinaIndex,
  selectedYear = 2025,
  selectedMonthIndex = 12,
}) => {
  const currentYearStats = usina.yearlyStats?.[selectedYear];
  const highestYearPeak = currentYearStats ? currentYearStats.highestPeakKw : usina.highestPeakKw;
  const highestYearMonth = currentYearStats ? currentYearStats.highestPeakMonth : usina.highestPeakMonth;
  const isExceededInYear = currentYearStats ? currentYearStats.isExceededAnyMonth : usina.isExceededAnyMonth;

  // Selected period data point
  const selectedPeriodPoint = usina.months.find(
    (m) => m.year === selectedYear && m.monthIndex === selectedMonthIndex
  );
  const selectedPeriodPower = selectedPeriodPoint?.powerKw ?? null;
  const isPeriodExceeded = selectedPeriodPoint?.isExceeded ?? false;
  const periodMonthName = MONTH_NAMES[selectedMonthIndex]?.full || `Mês ${selectedMonthIndex}`;

  const highestVsContractedPct = usina.contractedDemandKw > 0
    ? (highestYearPeak / usina.contractedDemandKw) * 100
    : 0;

  const excessKw = highestYearPeak > usina.toleranceLimitKw
    ? highestYearPeak - usina.toleranceLimitKw
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Nome da Usina Selecionada */}
      <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Usina Selecionada</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight leading-snug line-clamp-1" title={usina.name}>
            {usina.name}
          </h2>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>Usina {currentUsinaIndex + 1} de {totalUsinasCount}</span>
            <span aria-hidden="true">·</span>
            <span>{currentYearStats ? currentYearStats.activeMonthsCount : usina.activeMonthsCount} meses ativos em {selectedYear}</span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">Status em {selectedYear}:</span>
          {isExceededInYear ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              Ultrapassou Limite
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Em Conformidade
            </span>
          )}
        </div>
      </div>

      {/* Card 2: Demanda Contratada (kW) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Demanda Contratada</span>
            <Zap className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {formatKw(usina.contractedDemandKw, false)}
            <span className="text-xs font-sans font-medium text-slate-500 ml-1">kW</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Valor contratual fixo estabelecido com a concessionária (Coluna B).
          </p>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Base Contratual:</span>
          <span className="font-mono font-bold text-slate-700">100.0%</span>
        </div>
      </div>

      {/* Card 3: Limite de Tolerância (+3%) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Limite Tolerância (+3%)</span>
            <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              +3%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900 tracking-tight">
            {formatKw(usina.toleranceLimitKw, false)}
            <span className="text-xs font-sans font-medium text-amber-700 ml-1">kW</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Calculado automaticamente: Demanda Contratada × 1.03.
          </p>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Margem Regulamentar:</span>
          <span className="font-mono font-bold text-amber-700">
            +{formatKw(usina.toleranceLimitKw - usina.contractedDemandKw)}
          </span>
        </div>
      </div>

      {/* Card 4: Maior Pico do Ano & Mês Ativo */}
      <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Maior Pico em {selectedYear}
            </span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {formatKw(highestYearPeak, false)}
              <span className="text-xs font-sans font-medium text-slate-500 ml-1">kW</span>
            </div>
            {highestYearPeak > 0 && (
              <span className="text-xs font-medium text-slate-500">
                ({highestYearMonth})
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>
              {highestVsContractedPct > 0 ? `${highestVsContractedPct.toFixed(1)}% da demanda` : 'Sem medição'}
            </span>
            {excessKw > 0 && (
              <span className="font-mono font-bold text-red-600">
                +{formatKw(excessKw)} acima do limite
              </span>
            )}
          </div>
        </div>

        {/* Selected Period Reference */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {periodMonthName}/{selectedYear}:
          </span>
          <span className={`font-mono font-bold ${
            isPeriodExceeded ? 'text-red-600' : selectedPeriodPower ? 'text-blue-700' : 'text-slate-400'
          }`}>
            {selectedPeriodPower !== null ? formatKw(selectedPeriodPower) : 'Sem medição'}
          </span>
        </div>
      </div>
    </div>
  );
};
