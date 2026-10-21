import React from 'react';
import { UsinaMonthlyRecord } from '../types/demand';
import { formatKw } from '../utils/demandParser';
import { Building2, ShieldCheck, ShieldAlert, Zap, TrendingUp } from 'lucide-react';

interface PlantSummaryCardsProps {
  usina: UsinaMonthlyRecord;
  totalUsinasCount: number;
  currentUsinaIndex: number;
}

export const PlantSummaryCards: React.FC<PlantSummaryCardsProps> = ({
  usina,
  totalUsinasCount,
  currentUsinaIndex,
}) => {
  const isExceeded = usina.isExceededAnyMonth;
  const highestVsContractedPct = usina.contractedDemandKw > 0
    ? (usina.highestPeakKw / usina.contractedDemandKw) * 100
    : 0;

  const excessKw = usina.highestPeakKw > usina.toleranceLimitKw
    ? usina.highestPeakKw - usina.toleranceLimitKw
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
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span>Usina {currentUsinaIndex + 1} de {totalUsinasCount}</span>
            <span aria-hidden="true">·</span>
            <span>{usina.activeMonthsCount} meses ativos</span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">Status Geral:</span>
          {isExceeded ? (
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
            Valor de contrato base estabelecido com a concessionária (Coluna B).
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
          <span className="text-slate-500">Margem adicional:</span>
          <span className="font-mono font-bold text-amber-700">
            +{formatKw(usina.toleranceLimitKw - usina.contractedDemandKw)}
          </span>
        </div>
      </div>

      {/* Card 4: Maior Pico do Ano */}
      <div className={`border rounded-xl p-4.5 shadow-xs flex flex-col justify-between ${
        usina.highestPeakKw > usina.toleranceLimitKw
          ? 'bg-red-50/50 border-red-200'
          : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Maior Pico do Ano</span>
            <TrendingUp className={`w-4 h-4 ${usina.highestPeakKw > usina.toleranceLimitKw ? 'text-red-600' : 'text-blue-600'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tight ${
            usina.highestPeakKw > usina.toleranceLimitKw ? 'text-red-700' : 'text-slate-900'
          }`}>
            {formatKw(usina.highestPeakKw, false)}
            <span className="text-xs font-sans font-medium text-slate-500 ml-1">kW</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registrado no mês de <strong>{usina.highestPeakMonth}</strong> ({highestVsContractedPct.toFixed(1)}% da contratada).
          </p>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Diferença vs. Limite:</span>
          {excessKw > 0 ? (
            <span className="font-mono font-bold text-red-700">
              +{formatKw(excessKw)} ({((excessKw / usina.toleranceLimitKw) * 100).toFixed(1)}% acima)
            </span>
          ) : (
            <span className="font-mono font-bold text-emerald-700">
              {formatKw(usina.toleranceLimitKw - usina.highestPeakKw)} de margem
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
