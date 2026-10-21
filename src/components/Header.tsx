import React from 'react';
import { Zap, ShieldAlert, ShieldCheck, RefreshCw, Download, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  onExportCsv: () => void;
  isLoading: boolean;
  totalUsinas: number;
  exceededCount: number;
  lastCollectionTime?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  onExportCsv,
  isLoading,
  totalUsinas,
  exceededCount,
  lastCollectionTime,
}) => {
  const okCount = totalUsinas - exceededCount;

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 px-4 lg:px-8 py-3.5 shadow-xs sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Context */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0">
            <Zap className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                Monitor de Demanda de Usinas
              </h1>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hidden sm:inline-block">
                Tempo Real
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Acompanhamento de picos de potência ativa (kW) vs. demanda contratada com limite regulatório (+3%).
            </p>
          </div>
        </div>

        {/* Fleet KPI Badges & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Total Usinas */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium">
            <span className="text-slate-500">Usinas:</span>
            <strong className="font-mono text-slate-900 font-bold">{totalUsinas}</strong>
          </div>

          {/* Exceeded Status Badge */}
          {exceededCount > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <span>{exceededCount} {exceededCount === 1 ? 'ultrapassou' : 'ultrapassaram'}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Conformes</span>
            </div>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
            title="Atualizar dados da planilha"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Carregando...' : 'Atualizar'}</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-2xs shrink-0"
            title="Baixar planilha consolidada em CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
};
