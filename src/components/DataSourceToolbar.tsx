import React, { useState } from 'react';
import { SheetParseResult } from '../types/demand';
import { Database, Upload, Download, RefreshCw, FileText } from 'lucide-react';

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
  const [isCustomFile, setIsCustomFile] = useState(false);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCustomFile(true);
      onFileUpload(file);
    }
  };

  const handleResetDefault = () => {
    setIsCustomFile(false);
    onRefresh('/data/usinas_demanda_mensal.csv');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 mb-6">
      {/* Left: Local operational base info */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
          <Database className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="font-semibold text-slate-800">
            Base Operacional Integrada
          </span>
          <span className="text-slate-400 mx-1.5">·</span>
          <span>
            {sheetResult ? (
              <>
                <strong className="text-slate-900">{sheetResult.usinasCount} usinas</strong> monitoradas
                {isCustomFile ? ' (Arquivo customizado)' : ' (Dados locais consolidados)'}
              </>
            ) : (
              'Carregando base de dados...'
            )}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isCustomFile && (
          <button
            type="button"
            onClick={handleResetDefault}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline mr-1 cursor-pointer"
          >
            Restaurar Base Padrão
          </button>
        )}

        {/* Local File Upload Button */}
        <label className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span>Importar CSV Local</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
};
