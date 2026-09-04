import React, { useState, useEffect, useRef } from 'react';
import { Usina, TelemetryFilter, UsinaDemandSummary } from '../types';
import {
  Calendar,
  Filter,
  Clock,
  Search,
  Layers,
  RotateCcw,
  Sparkles,
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
} from 'lucide-react';

export interface MonthOption {
  key: string;
  label: string;
  shortLabel: string;
  year: number;
  month: number; // 1-12
  isCurrent: boolean;
  daysInMonth: number;
}

export const AVAILABLE_MONTHS: MonthOption[] = [
  {
    key: '09/2026',
    label: '09/2026 • Setembro (Mês Atual - Acumulado até Hoje)',
    shortLabel: '09/2026 (Atual)',
    year: 2026,
    month: 9,
    isCurrent: true,
    daysInMonth: 30,
  },
  {
    key: '08/2026',
    label: '08/2026 • Agosto (Consolidado)',
    shortLabel: '08/2026',
    year: 2026,
    month: 8,
    isCurrent: false,
    daysInMonth: 31,
  },
  {
    key: '07/2026',
    label: '07/2026 • Julho (Consolidado)',
    shortLabel: '07/2026',
    year: 2026,
    month: 7,
    isCurrent: false,
    daysInMonth: 31,
  },
  {
    key: '06/2026',
    label: '06/2026 • Junho (Consolidado)',
    shortLabel: '06/2026',
    year: 2026,
    month: 6,
    isCurrent: false,
    daysInMonth: 30,
  },
  {
    key: '05/2026',
    label: '05/2026 • Maio (Consolidado)',
    shortLabel: '05/2026',
    year: 2026,
    month: 5,
    isCurrent: false,
    daysInMonth: 31,
  },
  {
    key: '04/2026',
    label: '04/2026 • Abril (Consolidado)',
    shortLabel: '04/2026',
    year: 2026,
    month: 4,
    isCurrent: false,
    daysInMonth: 30,
  },
  {
    key: '03/2026',
    label: '03/2026 • Março (Consolidado)',
    shortLabel: '03/2026',
    year: 2026,
    month: 3,
    isCurrent: false,
    daysInMonth: 31,
  },
  {
    key: '02/2026',
    label: '02/2026 • Fevereiro (Consolidado)',
    shortLabel: '02/2026',
    year: 2026,
    month: 2,
    isCurrent: false,
    daysInMonth: 28,
  },
  {
    key: '01/2026',
    label: '01/2026 • Janeiro (Consolidado)',
    shortLabel: '01/2026',
    year: 2026,
    month: 1,
    isCurrent: false,
    daysInMonth: 31,
  },
];

interface FiltersBarProps {
  usinas: Usina[];
  summaries?: UsinaDemandSummary[];
  filter: TelemetryFilter;
  onFilterChange: (updated: Partial<TelemetryFilter>) => void;
  onApplyFilters: (customFilter?: TelemetryFilter) => void;
  onResetFilters: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectUsina?: (usinaId: string) => void;
  isLoading?: boolean;
  lastCollectionTime?: string | null;
  onOpenWhatsApp?: () => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  usinas,
  summaries,
  filter,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  searchQuery,
  onSearchChange,
  onSelectUsina,
  isLoading = false,
  lastCollectionTime,
  onOpenWhatsApp,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown de busca ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Usinas filtradas para o dropdown de busca
  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return usinas
      .filter((u) => u.name.toLowerCase().includes(q) || u.location.toLowerCase().includes(q))
      .slice(0, 8);
  }, [usinas, searchQuery]);

  // Ação de carregar imediatamente a usina selecionada
  const handleSelectSearchResult = (targetUsina: Usina) => {
    onFilterChange({ usinaId: targetUsina.id });
    if (onSelectUsina) {
      onSelectUsina(targetUsina.id);
    } else {
      onApplyFilters({ ...filter, usinaId: targetUsina.id });
    }
    onSearchChange(targetUsina.name);
    setIsSearchOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        handleSelectSearchResult(searchResults[0]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  const selectedUsinaObj = usinas.find((u) => u.id === filter.usinaId);
  // Helper para obter a data/hora atual formatada
  const getNowFormatted = () => {
    const now = new Date();
    // Se estiver no ano 2026 para os dados de referência
    const d = String(now.getDate()).padStart(2, '0');
    const m = '09';
    const y = '2026';
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  };

  // Identifica o mês atualmente ativo a partir do filter.startTime ou filter.selectedMonth
  const activeMonthKey = React.useMemo(() => {
    if (filter.selectedMonth) return filter.selectedMonth;
    if (filter.startTime && filter.startTime.length >= 7) {
      const y = filter.startTime.substring(0, 4);
      const m = filter.startTime.substring(5, 7);
      return `${m}/${y}`;
    }
    return '09/2026';
  }, [filter.selectedMonth, filter.startTime]);

  const activeMonthObj = AVAILABLE_MONTHS.find((m) => m.key === activeMonthKey);

  // Seleciona um mês completo (ex: 08/2026 ou 09/2026)
  const handleSelectMonth = (monthKey: string) => {
    const mObj = AVAILABLE_MONTHS.find((m) => m.key === monthKey);
    if (!mObj) return;

    const pad = (n: number) => String(n).padStart(2, '0');
    const y = mObj.year;
    const m = pad(mObj.month);

    let startStr = `${y}-${m}-01 00:00:00`;
    let endStr = `${y}-${m}-${pad(mObj.daysInMonth)} 23:59:59`;

    // Se for o mês atual em andamento (09/2026), a coleta vai do dia 01/09 até o momento atual
    if (mObj.isCurrent) {
      endStr = getNowFormatted();
    }

    const updated: TelemetryFilter = {
      ...filter,
      selectedMonth: monthKey,
      timeShortcut: 'month',
      startTime: startStr,
      endTime: endStr,
    };

    onFilterChange(updated);
    onApplyFilters(updated);
  };

  // Atualiza a coleta acumulada do mês atual até agora
  const handleUpdateCurrentAccumulated = () => {
    const nowStr = getNowFormatted();
    const updated: TelemetryFilter = {
      ...filter,
      selectedMonth: '09/2026',
      timeShortcut: 'month',
      startTime: '2026-09-01 00:00:00',
      endTime: nowStr,
    };

    onFilterChange(updated);
    onApplyFilters(updated);
  };

  const handleShortcutSelect = (shortcut: string) => {
    if (shortcut === 'today') {
      const updated: TelemetryFilter = {
        ...filter,
        timeShortcut: 'today',
        selectedMonth: undefined,
        startTime: '2026-09-02 00:00:00',
        endTime: '2026-09-02 23:59:59',
      };
      onFilterChange(updated);
      onApplyFilters(updated);
      return;
    }

    if (shortcut === 'this_month') {
      handleSelectMonth('09/2026');
      return;
    }

    if (shortcut === 'last_month') {
      handleSelectMonth('08/2026');
      return;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 lg:p-5 shadow-sm space-y-4">
      {/* Header do Painel de Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filtro de Período & Coleta Acumulada de Demanda</span>
          <span className="text-[11px] font-medium text-slate-400 hidden md:inline">
            (Histórico mensal desde 01/2026 e sincronização contínua)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenWhatsApp && (
            <button
              onClick={onOpenWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-slate-900 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-[0.98]"
              title="Copiar resumo formatado para envio no WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Resumo</span>
            </button>
          )}

          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium px-2 py-1 rounded-md hover:bg-slate-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>
        </div>
      </div>

      {/* Linha Principal de Controles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Seletor de Mês e Histórico */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Filtro de Mês (Desde 01/2026)
            </span>
            {activeMonthObj?.isCurrent && (
              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                Acumulado
              </span>
            )}
          </label>
          <select
            value={activeMonthKey}
            onChange={(e) => handleSelectMonth(e.target.value)}
            className="w-full bg-white border border-blue-300 text-slate-900 text-xs rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          >
            {AVAILABLE_MONTHS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Usina em Tratamento */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            Usina em Tratamento
          </label>
          <select
            value={filter.usinaId}
            onChange={(e) => {
              const val = e.target.value;
              onFilterChange({ usinaId: val });
              if (onSelectUsina) {
                onSelectUsina(val);
              } else {
                onApplyFilters({ ...filter, usinaId: val });
              }
            }}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">🌟 Todas as Usinas (Visão Geral de Demanda)</option>
            {usinas.map((u) => (
              <option key={u.id} value={u.id}>
                ⚡ {u.name} ({u.contractedDemandKw} kW Contratado)
              </option>
            ))}
          </select>
        </div>

        {/* Agregação de Amostragem */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Agregação dos Dados
          </label>
          <select
            value={filter.aggregation}
            onChange={(e) => onFilterChange({ aggregation: e.target.value })}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="5 min">5 min (Padrão Oficial Delfos / 288 pts)</option>
            <option value="7 min">⚡ 7 min (Amostragem Fina com Janela)</option>
            <option value="15 min">15 min (Padrão CCEE / Faturamento)</option>
            <option value="1 hora">1 hora (Média Horária)</option>
            <option value="1 min">1 min (Alta Resolução)</option>
          </select>
        </div>

        {/* Busca Rápida por Nome e Carregamento Direto */}
        <div className="space-y-1.5 relative" ref={searchContainerRef}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              Buscar Usina por Nome
            </label>
            {filter.usinaId !== 'ALL' && selectedUsinaObj && (
              <button
                type="button"
                onClick={() => {
                  onFilterChange({ usinaId: 'ALL' });
                  if (onSelectUsina) onSelectUsina('ALL');
                  onSearchChange('');
                }}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-colors"
                title="Voltar para visão de todas as usinas"
              >
                ✕ Ver Todas
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) setIsSearchOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Ex: Caracará, Niquelândia, Canas..."
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl pl-3 pr-20 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />

            <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    setIsSearchOpen(false);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 p-1"
                  title="Limpar busca"
                >
                  ✕
                </button>
              )}
              {searchResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectSearchResult(searchResults[0])}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-all flex items-center gap-0.5"
                  title={`Carregar usina ${searchResults[0].name} para tratamento`}
                >
                  <span>Carregar</span>
                </button>
              )}
            </div>

            {/* Dropdown Flutuante de Autocomplete e Carregamento Direto */}
            {isSearchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
                <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>{searchResults.length} usina(s) encontrada(s)</span>
                  <span className="text-[10px] text-slate-400">Clique ou aperte [Enter] para carregar</span>
                </div>
                {searchResults.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {searchResults.map((u) => {
                      const sum = summaries?.find((s) => s.usinaId === u.id);
                      const isCurrentlyLoaded = filter.usinaId === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleSelectSearchResult(u)}
                          className={`p-2.5 hover:bg-blue-50/80 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                            isCurrentlyLoaded ? 'bg-blue-50/50 border-l-4 border-blue-600' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                ⚡ {u.name}
                              </span>
                              {isCurrentlyLoaded && (
                                <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase">
                                  Carregada
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>Contrato: <strong className="text-slate-700">{u.contractedDemandKw.toLocaleString('pt-BR')} kW</strong></span>
                              <span>•</span>
                              <span>{u.location}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {sum && (
                              <div className="text-right">
                                <div className="text-xs font-bold text-slate-800 font-mono">
                                  {sum.maxPeakKw.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kW
                                </div>
                                <div className="text-[10px]">
                                  {sum.status === 'EXCEEDED' ? (
                                    <span className="text-red-600 font-bold">Ultrapassou</span>
                                  ) : sum.status === 'WARNING' ? (
                                    <span className="text-amber-600 font-semibold">Alerta</span>
                                  ) : (
                                    <span className="text-emerald-600 font-semibold">Regular</span>
                                  )}
                                </div>
                              </div>
                            )}
                            <button
                              type="button"
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1"
                            >
                              <span>Carregar</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Nenhuma usina encontrada com o nome "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Indicador de Usina Ativa em Tratamento */}
          {filter.usinaId !== 'ALL' && selectedUsinaObj && (
            <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-medium bg-blue-50/70 border border-blue-100 rounded-lg px-2 py-1">
              <Zap className="w-3 h-3 text-blue-600 shrink-0" />
              <span className="truncate">Usina carregada no painel: <strong>{selectedUsinaObj.name}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Barra Informativa da Coleta Acumulada e Atalhos Rápidos */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Status do Período e Coleta */}
        <div className="flex items-center gap-2 text-slate-700">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              activeMonthObj?.isCurrent ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
            }`}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-900">
              {activeMonthObj ? activeMonthObj.shortLabel : activeMonthKey}:
            </span>
            {activeMonthObj?.isCurrent ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span>Coleta acumulada em andamento (01/09 até a data e hora atual)</span>
              </span>
            ) : (
              <span className="text-slate-600">Mês consolidado / período fechado</span>
            )}

            {lastCollectionTime && (
              <span className="text-slate-400 font-mono text-[11px] ml-1">
                (Última sincronização: {lastCollectionTime})
              </span>
            )}
          </div>
        </div>

        {/* Botões Rápidos de Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleUpdateCurrentAccumulated}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition-all active:scale-[0.98]"
            title="Puxa todas as medições desde 01/09 até a data e hora atual"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar Acumulado (09/2026 até Agora)</span>
          </button>

          <div className="hidden sm:flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              type="button"
              onClick={() => handleSelectMonth('08/2026')}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                activeMonthKey === '08/2026'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              08/2026
            </button>
            <button
              type="button"
              onClick={() => handleSelectMonth('07/2026')}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                activeMonthKey === '07/2026'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              07/2026
            </button>
            <button
              type="button"
              onClick={() => handleShortcutSelect('today')}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                filter.timeShortcut === 'today'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Hoje (Diário)
            </button>
          </div>
        </div>
      </div>

      {/* Linha de Inputs de Data e Hora com botão Coletar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100 items-end">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>Data e Hora Inicial (AAAA-MM-DD HH:mm:ss)</span>
            <span className="text-[10px] text-slate-400 font-mono">Início do Período</span>
          </label>
          <input
            type="text"
            value={filter.startTime}
            onChange={(e) => onFilterChange({ startTime: e.target.value, timeShortcut: 'custom' })}
            placeholder="2026-08-01 00:00:00"
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>Data e Hora Final (AAAA-MM-DD HH:mm:ss)</span>
            <span className="text-[10px] text-slate-400 font-mono">Fim / Momento Atual</span>
          </label>
          <input
            type="text"
            value={filter.endTime}
            onChange={(e) => onFilterChange({ endTime: e.target.value, timeShortcut: 'custom' })}
            placeholder="2026-08-31 23:59:59"
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        <div>
          <button
            onClick={() => onApplyFilters()}
            disabled={isLoading}
            className={`w-full font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 ${
              isLoading
                ? 'bg-blue-500 text-white cursor-wait opacity-90'
                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-white" />
                <span>Processando Coleta Delfos...</span>
              </>
            ) : (
              <>
                <Filter className="w-4 h-4" />
                <span>Coletar Picos de Demanda do Período</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
