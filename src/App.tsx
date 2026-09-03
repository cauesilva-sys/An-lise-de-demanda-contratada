import React, { useState, useEffect, useCallback } from 'react';
import {
  Usina,
  UsinaDemandSummary,
  TelemetryFilter,
  GlobalMetrics,
} from './types';
import { Header } from './components/Header';
import { FiltersBar } from './components/FiltersBar';
import { GlobalSummaryCards } from './components/GlobalSummaryCards';
import { SelectedUsinaDetailCard } from './components/SelectedUsinaDetailCard';
import { UsinasTable } from './components/UsinasTable';
import { EditContractModal } from './components/EditContractModal';
import { ApiConfigModal } from './components/ApiConfigModal';
import { exportDemandSummariesToCsv } from './utils/exportCsv';
import { executeSingleDailyCollection } from './services/delfosApi';
import { AlertCircle, CheckCircle2, ShieldAlert, Sparkles, RotateCcw } from 'lucide-react';

export default function App() {
  const [apiToken, setApiToken] = useState<string>('0yo70kLrBF0nXQz9IMvee6Z6PWwawNMM');
  const [usinas, setUsinas] = useState<Usina[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastCollectionTime, setLastCollectionTime] = useState<string | null>(null);

  // Filter state - Default: Coleta Única Diária (ex: 2026-09-02 00:00:00 até 2026-09-02 23:59:59)
  const [filter, setFilter] = useState<TelemetryFilter>({
    usinaId: 'ALL', // Visão geral de todas as usinas
    startTime: '2026-09-02 00:00:00',
    endTime: '2026-09-02 23:59:59',
    timeShortcut: 'today',
    aggregation: '5 min',
    variable: 'Potência ativa',
    apiToken: '0yo70kLrBF0nXQz9IMvee6Z6PWwawNMM',
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusCategory, setStatusCategory] = useState<'ALL' | 'EXCEEDED' | 'WARNING' | 'OK'>('ALL');

  // Results state
  const [summaries, setSummaries] = useState<UsinaDemandSummary[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics>({
    totalUsinas: 0,
    usinasExceededCount: 0,
    usinasWarningCount: 0,
    highestPeakOverall: null,
    selectedUsinaSummary: null,
  });

  // Modal states
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    usinaId: string | null;
    usinaName: string;
    currentVal: number;
  }>({
    isOpen: false,
    usinaId: null,
    usinaName: '',
    currentVal: 0,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Disparada APENAS uma vez ao abrir o dashboard ou ao clicar em "Coletar Picos de Demanda"
  const fetchTelemetry = useCallback(
    async (currentFilter: TelemetryFilter, token: string) => {
      setIsLoading(true);
      try {
        const result = await executeSingleDailyCollection(
          currentFilter,
          token,
          currentFilter.usinaId
        );

        setSummaries(result.summaries);
        setGlobalMetrics(result.globalMetrics);
        setLastCollectionTime(result.collectionTimestamp);
      } catch (err) {
        console.error('Failed to fetch telemetry from Delfos:', err);
        showToast('Falha na comunicação com o servidor da Delfos.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch usinas list
  const fetchUsinas = useCallback(async () => {
    try {
      const res = await fetch('/api/usinas');
      const data = await res.json();
      if (data.success) {
        setUsinas(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch usinas list:', err);
    }
  }, []);

  // Carga Única ao abrir o dashboard
  useEffect(() => {
    fetchUsinas();
    fetchTelemetry(filter, apiToken);
  }, []);

  // Filter change handlers (sem disparar requisições de rede em loop)
  const handleFilterChange = (updated: Partial<TelemetryFilter>) => {
    setFilter((prev) => ({ ...prev, ...updated }));
  };

  // Disparo manual explícito do usuário
  const handleApplyFilters = () => {
    fetchTelemetry(filter, apiToken);
    showToast('Coleta única diária disparada para o período selecionado!');
  };

  const handleResetFilters = () => {
    const defaultFilter: TelemetryFilter = {
      usinaId: 'ALL',
      startTime: '2026-09-02 00:00:00',
      endTime: '2026-09-02 23:59:59',
      timeShortcut: 'today',
      aggregation: '5 min',
      variable: 'Potência ativa',
      apiToken: apiToken,
    };
    setFilter(defaultFilter);
    setSearchQuery('');
    fetchTelemetry(defaultFilter, apiToken);
    showToast('Filtros restaurados para a coleta diária padrão.');
  };

  // Filtragem estritamente local em memória ao clicar nos cards de categoria (sem loop na API!)
  const handleSelectCategory = (category: 'ALL' | 'EXCEEDED' | 'WARNING' | 'HIGHEST_PEAK' | 'OK') => {
    if (category === 'ALL') {
      setStatusCategory('ALL');
      setFilter((prev) => ({ ...prev, usinaId: 'ALL' }));
      showToast('Exibindo todas as usinas monitoradas.');
    } else if (category === 'EXCEEDED') {
      setStatusCategory('EXCEEDED');
      setFilter((prev) => ({ ...prev, usinaId: 'ALL' }));
      showToast('Filtrando usinas com ultrapassagem > 1,3% da demanda contratada.');
    } else if (category === 'WARNING') {
      setStatusCategory('WARNING');
      setFilter((prev) => ({ ...prev, usinaId: 'ALL' }));
      showToast('Filtrando usinas em alerta (≥90% ou resguardadas na tolerância de até +1,3%).');
    } else if (category === 'HIGHEST_PEAK') {
      setStatusCategory('ALL');
      if (globalMetrics.highestPeakOverall) {
        const peakUsina = summaries.find(
          (s) => s.usinaName === globalMetrics.highestPeakOverall?.usinaName
        );
        if (peakUsina) {
          handleSelectUsina(peakUsina.usinaId);
          showToast(`Focando usina do maior pico: ${peakUsina.usinaName}.`);
        }
      }
    } else if (category === 'OK') {
      setStatusCategory('OK');
      setFilter((prev) => ({ ...prev, usinaId: 'ALL' }));
      showToast('Filtrando usinas em operação regular.');
    }
  };

  // Seleção estritamente local em memória ao clicar em uma usina (sem disparar requisição repetida na API!)
  const handleSelectUsina = (usinaId: string) => {
    setFilter((prev) => ({ ...prev, usinaId }));

    if (usinaId !== 'ALL') {
      const found = summaries.find((s) => s.usinaId === usinaId);
      if (found) {
        setGlobalMetrics((prev) => ({
          ...prev,
          selectedUsinaSummary: found,
        }));
        showToast(`Exibindo detalhes da usina ${found.usinaName}.`);
      }
    } else {
      showToast('Exibindo visão geral de todas as usinas.');
    }
  };

  // Edit Contracted Demand Handler
  const handleOpenEditContract = (usinaId: string, currentVal: number, usinaName: string) => {
    setEditModal({
      isOpen: true,
      usinaId,
      usinaName,
      currentVal,
    });
  };

  const handleSaveContractedDemand = async (usinaId: string, newValKw: number) => {
    try {
      const res = await fetch(`/api/usinas/${usinaId}/contracted-demand`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractedDemandKw: newValKw }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        await fetchUsinas();
        await fetchTelemetry(filter, apiToken);
      } else {
        alert(data.error || 'Erro ao atualizar contrato');
      }
    } catch (err) {
      console.error('Error updating contracted demand:', err);
      alert('Erro de conexão ao salvar demanda.');
    }
  };

  // Save Token
  const handleSaveToken = (newToken: string) => {
    setApiToken(newToken);
    setFilter((prev) => ({ ...prev, apiToken: newToken }));
    fetchTelemetry({ ...filter, apiToken: newToken }, newToken);
    showToast('Nova chave de API salva e aplicada na coleta!');
  };

  // Export CSV
  const handleExportCsv = () => {
    if (summaries.length === 0) {
      alert('Nenhum dado disponível para exportação.');
      return;
    }
    exportDemandSummariesToCsv(summaries, filter.startTime, filter.endTime, apiToken);
    showToast('Relatório em CSV baixado com sucesso!');
  };

  const focalUsinaSummary = React.useMemo(() => {
    if (filter.usinaId !== 'ALL') {
      return summaries.find((s) => s.usinaId === filter.usinaId) || globalMetrics.selectedUsinaSummary;
    }
    if (statusCategory === 'EXCEEDED') {
      return summaries.find((s) => s.status === 'EXCEEDED') || globalMetrics.selectedUsinaSummary;
    }
    if (statusCategory === 'WARNING') {
      return summaries.find((s) => s.status === 'WARNING') || globalMetrics.selectedUsinaSummary;
    }
    return globalMetrics.selectedUsinaSummary;
  }, [summaries, filter.usinaId, statusCategory, globalMetrics.selectedUsinaSummary]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-700 font-sans selection:bg-blue-600 selection:text-white pb-16">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-800 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        apiToken={apiToken}
        onOpenApiModal={() => setIsApiModalOpen(true)}
        onRefresh={() => fetchTelemetry(filter, apiToken)}
        onExportCsv={handleExportCsv}
        isLoading={isLoading}
        exceededCount={globalMetrics.usinasExceededCount}
        lastCollectionTime={lastCollectionTime}
      />

      {/* App Body */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">
        {/* Indicador visual de "Processando dados da Delfos..." */}
        {isLoading && (
          <div className="bg-blue-600 text-white p-4 rounded-xl shadow-md flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <RotateCcw className="w-5 h-5 animate-spin text-white" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight">Processando dados da Delfos...</div>
                <div className="text-xs text-blue-100">
                  Coleta única diária sob demanda: 288 leituras (5 min) • Sinal: Potência Ativa (kW)
                </div>
              </div>
            </div>
            <div className="text-right font-mono text-xs text-blue-100 hidden sm:block">
              <div>Rota: <span className="font-bold text-white">POST /timeseries</span></div>
              <div>Intervalo: <span className="font-bold text-white">{filter.startTime.split(' ')[0]}</span></div>
            </div>
          </div>
        )}

        {/* Global Overview Cards */}
        <GlobalSummaryCards
          metrics={globalMetrics}
          selectedSummary={globalMetrics.selectedUsinaSummary}
          onSelectUsina={handleSelectUsina}
          onSelectCategory={handleSelectCategory}
          activeCategory={statusCategory}
        />

        {/* Filters Controls */}
        <FiltersBar
          usinas={usinas}
          filter={filter}
          onFilterChange={handleFilterChange}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLoading={isLoading}
        />

        {/* Selected Usina Focal Detail Card */}
        <SelectedUsinaDetailCard
          summary={focalUsinaSummary}
          onEditContract={handleOpenEditContract}
          startTime={filter.startTime}
          endTime={filter.endTime}
        />

        {/* Full Table of All Plants */}
        <UsinasTable
          summaries={summaries}
          selectedUsinaId={filter.usinaId}
          onSelectUsina={handleSelectUsina}
          onEditContract={handleOpenEditContract}
          searchQuery={searchQuery}
          statusCategory={statusCategory}
          onSelectCategory={handleSelectCategory}
        />
      </main>

      {/* Modals */}
      <EditContractModal
        isOpen={editModal.isOpen}
        usinaId={editModal.usinaId}
        usinaName={editModal.usinaName}
        currentValueKw={editModal.currentVal}
        onClose={() => setEditModal({ isOpen: false, usinaId: null, usinaName: '', currentVal: 0 })}
        onSave={handleSaveContractedDemand}
      />

      <ApiConfigModal
        isOpen={isApiModalOpen}
        apiToken={apiToken}
        onClose={() => setIsApiModalOpen(false)}
        onSaveToken={handleSaveToken}
      />
    </div>
  );
}
