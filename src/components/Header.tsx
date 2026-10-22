import React from 'react';
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Download,
  BarChart3,
  AlertTriangle,
  BatteryWarning,
} from 'lucide-react';

export type AppTab = 'dashboard' | 'report_over_3' | 'report_under_5';

interface HeaderProps {
  onRefresh: () => void;
  onExportCsv: () => void;
  isLoading: boolean;
  totalUsinas: number;
  exceededCount: number;
  underutilizedCount: number;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  onExportCsv,
  isLoading,
  totalUsinas,
  exceededCount,
  underutilizedCount,
  activeTab,
  onTabChange,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 px-4 lg:px-8 py-3 shadow-xs sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Context */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0">
            <Zap className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                Monitor Operacional de Demanda de Usinas
              </h1>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 hidden sm:inline-block">
                Base Local
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Análise de desempenho, controle de tolerância regulatória (+3%) e subutilização (&lt; 5%).
            </p>
          </div>
        </div>

        {/* Quick Actions & KPIs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Total Usinas */}
          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium">
            <span className="text-slate-500">Usinas:</span>
            <strong className="font-mono text-slate-900 font-bold">{totalUsinas}</strong>
          </div>

          {/* Exceeded Status Badge */}
          {exceededCount > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <span>{exceededCount} &gt; 3%</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Conformes</span>
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Recarregar</span>
          </button>

          {/* Export Full CSV */}
          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            title="Exportar base consolidada para Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Exportar Matriz</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Dashboard & Gráficos</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('report_over_3')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'report_over_3'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-red-700 hover:bg-red-50'
          }`}
          title="Relatório focado de usinas com ultrapassagem superior a 3% da demanda contratada"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-current" />
          <span>Ultrapassagem de Demanda +3%</span>
          {exceededCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'report_over_3'
                  ? 'bg-red-800 text-white'
                  : 'bg-red-100 text-red-800 font-bold'
              }`}
            >
              {exceededCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('report_under_5')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'report_under_5'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
          }`}
        >
          <BatteryWarning className="w-3.5 h-3.5 text-current" />
          <span>Reporte 2: Subutilização &lt; 5%</span>
          {underutilizedCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'report_under_5'
                  ? 'bg-amber-800 text-white'
                  : 'bg-amber-100 text-amber-900 font-bold'
              }`}
            >
              {underutilizedCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
