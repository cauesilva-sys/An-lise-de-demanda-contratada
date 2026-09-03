import React from 'react';
import { Zap, ShieldAlert, Key, RefreshCw, FileSpreadsheet, Sliders, Clock } from 'lucide-react';

interface HeaderProps {
  apiToken: string;
  onOpenApiModal: () => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  isLoading: boolean;
  exceededCount: number;
  lastCollectionTime?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  apiToken,
  onOpenApiModal,
  onRefresh,
  onExportCsv,
  isLoading,
  exceededCount,
  lastCollectionTime,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 px-4 lg:px-8 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title & Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
            <Zap className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Monitor de Demanda de Usinas
              </h1>
              {exceededCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {exceededCount} {exceededCount === 1 ? 'usina ultrapassou' : 'usinas ultrapassaram'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Análise numérica de picos de potência ativa (kW), data, hora e verificação de demanda contratada
            </p>
          </div>
        </div>

        {/* Actions & Last Collection Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Badge informativo da última coleta manual/automática */}
          {lastCollectionTime && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono shadow-2xs" title="Data e hora da última requisição na API Delfos">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-500 font-sans font-medium">Última coleta:</span>
              <strong className="text-slate-900 font-bold">{lastCollectionTime}</strong>
            </div>
          )}

          {/* Refresh / Coletar Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 shadow-sm"
            title="Disparar nova coleta sob demanda"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Atualizar</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar CSV / Relatório</span>
          </button>
        </div>
      </div>
    </header>
  );
};

