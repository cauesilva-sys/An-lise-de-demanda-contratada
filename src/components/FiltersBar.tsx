import React from 'react';
import { Usina, TelemetryFilter } from '../types';
import { Calendar, Filter, Clock, Search, Layers, RotateCcw } from 'lucide-react';

interface FiltersBarProps {
  usinas: Usina[];
  filter: TelemetryFilter;
  onFilterChange: (updated: Partial<TelemetryFilter>) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isLoading?: boolean;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  usinas,
  filter,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  searchQuery,
  onSearchChange,
  isLoading = false,
}) => {
  const handleShortcutSelect = (shortcut: string) => {
    const baseDateStr = '2026-09-02';
    const now = new Date(`${baseDateStr}T23:59:59`);
    let start = new Date(now);

    if (shortcut === 'today') {
      onFilterChange({
        timeShortcut: 'today',
        startTime: `${baseDateStr} 00:00:00`,
        endTime: `${baseDateStr} 23:59:59`,
      });
      return;
    } else if (shortcut === '7d') {
      start.setDate(now.getDate() - 7);
    } else if (shortcut === '30d') {
      start.setDate(now.getDate() - 30);
    } else if (shortcut === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (shortcut === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const endLast = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const formatStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
          d.getMinutes()
        ).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

      onFilterChange({
        timeShortcut: shortcut,
        startTime: formatStr(start),
        endTime: formatStr(endLast),
      });
      return;
    }

    const formatStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
        d.getMinutes()
      ).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

    onFilterChange({
      timeShortcut: shortcut,
      startTime: formatStr(start),
      endTime: formatStr(now),
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 lg:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filtros de Coleta e Período de Demanda</span>
        </div>
        <button
          onClick={onResetFilters}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Padrão</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Usina Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            Usina em Tratamento
          </label>
          <select
            value={filter.usinaId}
            onChange={(e) => onFilterChange({ usinaId: e.target.value })}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">🌟 Todas as Usinas (Visão Geral)</option>
            {usinas.map((u) => (
              <option key={u.id} value={u.id}>
                ⚡ {u.name} ({u.contractedDemandKw} kW Contratado)
              </option>
            ))}
          </select>
        </div>

        {/* Aggregation */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Agregação dos Dados
          </label>
          <select
            value={filter.aggregation}
            onChange={(e) => onFilterChange({ aggregation: e.target.value })}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1 min">1 min (Alta Resolução)</option>
            <option value="5 min">5 min (Padrão Data Studio)</option>
            <option value="7 min">⚡ 7 min (Amostragem Fina Solicitada)</option>
            <option value="15 min">15 min (Padrão CCEE/Distribuidora)</option>
            <option value="1 hora">1 hora (Média Horária)</option>
          </select>
        </div>

        {/* Time Shortcut */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Atalho de Período
          </label>
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => handleShortcutSelect('today')}
              className={`py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                filter.timeShortcut === 'today'
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Hoje (Diário)
            </button>
            <button
              type="button"
              onClick={() => handleShortcutSelect('7d')}
              className={`py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                filter.timeShortcut === '7d'
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              7 Dias
            </button>
            <button
              type="button"
              onClick={() => handleShortcutSelect('30d')}
              className={`py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                filter.timeShortcut === '30d'
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              30 Dias
            </button>
            <button
              type="button"
              onClick={() => handleShortcutSelect('this_month')}
              className={`py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                filter.timeShortcut === 'this_month'
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Este Mês
            </button>
          </div>
        </div>

        {/* Search Query */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-blue-600" />
            Buscar Usina por Nome
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Ex: Iraí, Guaíra, Paracatu..."
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Date Range Inputs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-100 items-end">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-500">Data e Hora Inicial (AAAA-MM-DD HH:mm:ss)</label>
          <input
            type="text"
            value={filter.startTime}
            onChange={(e) => onFilterChange({ startTime: e.target.value, timeShortcut: 'custom' })}
            placeholder="2026-09-02 00:00:00"
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-500">Data e Hora Final (AAAA-MM-DD HH:mm:ss)</label>
          <input
            type="text"
            value={filter.endTime}
            onChange={(e) => onFilterChange({ endTime: e.target.value, timeShortcut: 'custom' })}
            placeholder="2026-09-02 23:59:59"
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <button
            onClick={onApplyFilters}
            disabled={isLoading}
            className={`w-full font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 ${
              isLoading
                ? 'bg-blue-500 text-white cursor-wait opacity-90'
                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-white" />
                <span>Processando dados da Delfos...</span>
              </>
            ) : (
              <>
                <Filter className="w-4 h-4" />
                <span>Coletar Picos de Demanda</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
