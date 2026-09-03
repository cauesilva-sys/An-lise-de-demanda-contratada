import React from 'react';
import { GlobalMetrics, UsinaDemandSummary } from '../types';
import { Zap, AlertTriangle, TrendingUp, Calendar, Clock, Building2, MousePointerClick, ShieldCheck } from 'lucide-react';

interface GlobalSummaryCardsProps {
  metrics: GlobalMetrics;
  selectedSummary: UsinaDemandSummary | null;
  onSelectUsina: (usinaId: string) => void;
  onSelectCategory?: (category: 'ALL' | 'EXCEEDED' | 'WARNING' | 'HIGHEST_PEAK') => void;
  activeCategory?: 'ALL' | 'EXCEEDED' | 'WARNING' | 'OK';
}

export const GlobalSummaryCards: React.FC<GlobalSummaryCardsProps> = ({
  metrics,
  selectedSummary,
  onSelectUsina,
  onSelectCategory,
  activeCategory = 'ALL',
}) => {
  const highest = metrics.highestPeakOverall;

  // Format date string from "YYYY-MM-DD HH:mm:ss" to "DD/MM/YYYY" and "HH:mm:ss"
  const formatTimestamp = (ts: string) => {
    if (!ts) return { date: '--/--/----', time: '--:--:--' };
    const [datePart, timePart] = ts.split(' ');
    if (!datePart) return { date: ts, time: '' };
    const [year, month, day] = datePart.split('-');
    return {
      date: `${day}/${month}/${year}`,
      time: timePart || '00:00:00',
    };
  };

  const highestFormatted = highest ? formatTimestamp(highest.timestamp) : null;
  const selectedFormatted = selectedSummary ? formatTimestamp(selectedSummary.maxPeakTimestamp) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Usinas / Usinas Monitoradas */}
      <div
        onClick={() => onSelectCategory && onSelectCategory('ALL')}
        className={`bg-white border rounded-xl p-5 shadow-xs hover:shadow-md cursor-pointer transition-all group relative overflow-hidden ${
          activeCategory === 'ALL'
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-slate-200 hover:border-slate-300'
        }`}
        title="Clique para restaurar e exibir todas as 125 usinas monitoradas"
      >
        <div className="flex items-center justify-between text-slate-500 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider group-hover:text-blue-600 transition-colors flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            Usinas Monitoradas
          </span>
          <div className="p-2 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-lg text-slate-700 transition-colors">
            <MousePointerClick className="w-4 h-4 opacity-75" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900">{metrics.totalUsinas}</span>
          <span className="text-xs text-slate-500 font-medium">usinas conectadas</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Status no Período:</span>
          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            {metrics.totalUsinas - metrics.usinasExceededCount} Regulares (≤ +1,3%)
          </span>
        </div>
        <div className="mt-2 text-[10px] text-blue-600 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>⚡ Clique para listar todas as usinas</span>
        </div>
      </div>

      {/* Card 2: Usinas Ultrapassadas / Em Infração (>1,3%) */}
      <div
        onClick={() => onSelectCategory && onSelectCategory('EXCEEDED')}
        className={`border rounded-xl p-5 shadow-xs hover:shadow-md cursor-pointer transition-all group relative overflow-hidden ${
          activeCategory === 'EXCEEDED'
            ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20'
            : metrics.usinasExceededCount > 0
            ? 'bg-red-50/60 border-red-200 hover:border-red-300'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
        title="Clique para filtrar apenas as usinas que ultrapassaram 1,3% da demanda contratada"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Ultrapassaram Demanda (&gt; 1,3%)
          </span>
          <div className="p-2 bg-red-100 group-hover:bg-red-600 group-hover:text-white rounded-lg text-red-600 transition-colors">
            <MousePointerClick className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-red-600">{metrics.usinasExceededCount}</span>
          <span className="text-xs text-red-700 font-bold">ultrapassaram &gt; 1,3%</span>
        </div>

        <div className="mt-3 pt-3 border-t border-red-100 flex items-center justify-between text-xs text-slate-500">
          <span>Outras em Alerta (&gt;90% / ≤1,3%):</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectCategory) onSelectCategory('WARNING');
            }}
            className="text-amber-700 font-bold bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition-colors flex items-center gap-1"
            title="Filtrar usinas em alerta (≥90% da demanda ou dentro da tolerância de +1,3%)"
          >
            <span>{metrics.usinasWarningCount} usinas</span>
            <MousePointerClick className="w-3 h-3 text-amber-600" />
          </button>
        </div>

        <div className="mt-2 text-[10px] text-red-700 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>⚡ Clique para filtrar ultrapassagens (&gt; 1,3%)</span>
        </div>
      </div>

      {/* Card 3: Maior Pico Geral Registrado */}
      <div
        onClick={() => onSelectCategory && onSelectCategory('HIGHEST_PEAK')}
        className={`bg-slate-900 text-white border rounded-xl p-5 shadow-xs hover:shadow-md cursor-pointer transition-all group relative overflow-hidden ${
          activeCategory === 'HIGHEST_PEAK'
            ? 'border-sky-400 ring-2 ring-sky-400/30'
            : 'border-slate-800 hover:border-slate-700'
        }`}
        title="Clique para selecionar diretamente a usina que atingiu o maior pico absoluto do período"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Maior Pico do Período
          </span>
          <div className="p-2 bg-sky-500/20 group-hover:bg-sky-500 group-hover:text-slate-900 rounded-lg text-sky-400 transition-colors">
            <MousePointerClick className="w-4 h-4" />
          </div>
        </div>

        {highest ? (
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">
                {highest.powerKw.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-sky-400">kW</span>
              <span className="text-[11px] text-slate-400">
                ({(highest.powerKw / 1000).toFixed(2)} MW)
              </span>
            </div>

            <p className="text-xs font-bold text-sky-200 mt-1 truncate group-hover:text-amber-300 transition-colors" title={highest.usinaName}>
              ⚡ {highest.usinaName}
            </p>

            <div className="mt-2.5 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-3 h-3 text-sky-400" />
                {highestFormatted?.date}
              </span>
              <span className="flex items-center gap-1 font-mono text-slate-300">
                <Clock className="w-3 h-3 text-sky-400" />
                {highestFormatted?.time}
              </span>
            </div>
            <div className="mt-1.5 text-[10px] text-amber-300 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>⚡ Clique para focar esta usina</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-2">Nenhum dado coletado</p>
        )}
      </div>

      {/* Card 4: Usina Selecionada no Momento / Em Tratamento */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Usina em Tratamento</span>
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {selectedSummary ? (
          <div>
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-sm font-bold text-slate-900 truncate" title={selectedSummary.usinaName}>
                {selectedSummary.usinaName}
              </h3>
              {selectedSummary.status === 'EXCEEDED' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase shadow-xs">
                  ULTRAPASSAGEM DETECTADA
                </span>
              ) : selectedSummary.status === 'WARNING' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                  ALERTA
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> OPERAÇÃO REGULAR
                </span>
              )}
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-xl font-black text-slate-900">
                  {selectedSummary.maxPeakKw.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-500 ml-1 font-medium">kW Peak</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Contrato:</span>
                <span className="text-xs font-bold text-slate-800 ml-1">
                  {selectedSummary.contractedDemandKw.toLocaleString('pt-BR')} kW
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Tolerância (+1.3%):</span>
              <span className="font-mono text-slate-800 font-bold">
                {selectedSummary.toleranceKw ? selectedSummary.toleranceKw.toLocaleString('pt-BR') : Math.round(selectedSummary.contractedDemandKw * 1.013).toLocaleString('pt-BR')} kW
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-2">Selecione uma usina no filtro</p>
        )}
      </div>
    </div>
  );
};
