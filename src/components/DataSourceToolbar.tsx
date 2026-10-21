import React, { useState } from 'react';
import { SheetParseResult } from '../types/demand';
import { RefreshCw, Link as LinkIcon, Upload, Download, Check, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface DataSourceToolbarProps {
  sheetResult: SheetParseResult | null;
  isLoading: boolean;
  onRefresh: (customUrl?: string) => Promise<void>;
  onFileUpload: (file: File) => void;
  onExportCsv: () => void;
  currentUrl: string;
}

export const DataSourceToolbar: React.FC<DataSourceToolbarProps> = ({
  sheetResult,
  isLoading,
  onRefresh,
  onFileUpload,
  onExportCsv,
  currentUrl,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleApplyUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      await onRefresh(inputUrl.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleResetDefault = async () => {
    const defaultUrl = '/data/usinas_demanda_mensal.csv';
    setInputUrl(defaultUrl);
    await onRefresh(defaultUrl);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl p-4 shadow-sm border border-slate-800 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Status and timestamp */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Fonte de Dados em Tempo Real (Google Sheets CSV)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Sincronização ativa" />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Última busca via <code className="text-slate-300 font-mono">fetch</code> às <strong>{sheetResult?.lastFetchedAt || '—'}</strong>
              {sheetResult ? ` · ${sheetResult.usinasCount} usinas carregadas` : ''}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh / Coletar Button */}
          <button
            type="button"
            onClick={() => onRefresh(currentUrl)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Buscar versão mais recente da planilha"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Atualizando...' : 'Recarregar Planilha'}</span>
          </button>

          {/* Toggle URL connection bar */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700"
          >
            <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
            <span>Configurar Link / URL</span>
          </button>

          {/* Upload Local File Button */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Importar CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </label>

          {/* Export current CSV button */}
          <button
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700"
            title="Exportar dados consolidados em CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Expandable Google Sheets Link Configuration */}
      {isExpanded && (
        <form onSubmit={handleApplyUrl} className="mt-4 pt-3.5 border-t border-slate-800 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Link CSV do Google Sheets (ou endpoint CSV):
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Ex: https://docs.google.com/spreadsheets/d/.../pub?output=csv ou /data/usinas_demanda_mensal.csv"
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center justify-center gap-1.5"
              >
                {saveSuccess ? <Check className="w-4 h-4" /> : null}
                <span>{saveSuccess ? 'Conectado!' : 'Conectar e Atualizar'}</span>
              </button>
              <button
                type="button"
                onClick={handleResetDefault}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors shrink-0"
              >
                Restaurar Padrão
              </button>
            </div>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Dica de Publicação no Google Sheets:</strong> Na sua planilha, clique em <em>Arquivo &gt; Compartilhar &gt; Publicar na Web</em>, selecione a aba desejada, escolha formato <strong>Valores separados por vírgula (.csv)</strong> e cole o link gerado acima. O aplicativo fará o parse automático das colunas de Usina, Demanda Contratada e Meses do ano.
            </span>
          </div>
        </form>
      )}
    </div>
  );
};
