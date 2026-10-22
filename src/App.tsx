import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SheetParseResult, UsinaMonthlyRecord, PeriodOption, PeriodFilterMode } from './types/demand';
import { parseSheetCsv } from './utils/demandParser';
import { exportMonthlyRecordsToCsv } from './utils/exportMonthlyCsv';
import {
  generatePeriodOptions,
  getOverDemandReport,
  getUnderDemandReport,
  exportOverDemandToCsv,
  exportUnderDemandToCsv,
  exportPeriodSummaryToCsv,
} from './utils/deviationReports';
import { Header, AppTab } from './components/Header';
import { PeriodSelector } from './components/PeriodSelector';
import { DataSourceToolbar } from './components/DataSourceToolbar';
import { OverDemandReport } from './components/OverDemandReport';
import { UnderDemandReport } from './components/UnderDemandReport';
import { PlantSelector } from './components/PlantSelector';
import { PlantSummaryCards } from './components/PlantSummaryCards';
import { DemandChart } from './components/DemandChart';
import { MonthlyDetailTable } from './components/MonthlyDetailTable';
import { AllPlantsRankingTable } from './components/AllPlantsRankingTable';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getDemandaFixa } from './data/demandasFixas';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

const DEFAULT_CSV_URL = '/data/usinas_demanda_mensal.csv';
const FALLBACK_CSV_URL = '/assets/aistudio/Demanda_pico_por_usina_6c804d9d';

export default function App() {
  const [sheetResult, setSheetResult] = useState<SheetParseResult | null>(null);
  const [selectedUsinaId, setSelectedUsinaId] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>(DEFAULT_CSV_URL);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active view tab: 'dashboard' | 'report_over_3' | 'report_under_5'
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

  // Filter mode for selected period: 'all' | 'over_3' | 'under_5'
  const [filterMode, setFilterMode] = useState<PeriodFilterMode>('all');

  // Selected period for deviation reporting (defaults to Outubro 2026 or latest with data)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  /**
   * Fetch data locally from CSV file
   */
  const fetchData = useCallback(async (targetUrl?: string) => {
    setIsLoading(true);
    setError(null);
    const urlToFetch = targetUrl || currentUrl;

    try {
      let csvText = '';
      const resp = await fetch(`${urlToFetch}?_t=${Date.now()}`);

      if (!resp.ok) {
        // Fallback attempt
        const fbResp = await fetch(`${FALLBACK_CSV_URL}?_t=${Date.now()}`);
        if (!fbResp.ok) throw new Error('Não foi possível carregar o arquivo CSV.');
        csvText = await fbResp.text();
      } else {
        csvText = await resp.text();
      }

      const parsed = parseSheetCsv(csvText, urlToFetch);
      if (parsed.usinas.length === 0) {
        throw new Error('Nenhuma usina encontrada no formato da base de dados.');
      }

      setSheetResult(parsed);
      setCurrentUrl(urlToFetch);

      // Auto-select initial plant
      setSelectedUsinaId((prev) => {
        if (prev && parsed.usinas.some((u) => u.id === prev)) {
          return prev;
        }
        const firstExceeded = parsed.usinas.find((u) => u.isExceededAnyMonth);
        return firstExceeded ? firstExceeded.id : parsed.usinas[0].id;
      });

      showToast(`Base operacional carregada com sucesso! (${parsed.usinas.length} usinas)`);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err?.message || 'Erro ao carregar dados operacionais.');
      showToast('Erro ao atualizar base de dados.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUrl]);

  // Load data on page mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle local CSV file upload
  const handleFileUpload = (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseSheetCsv(text, file.name);
        if (parsed.usinas.length === 0) {
          throw new Error('O arquivo CSV enviado não contém usinas válidas.');
        }
        setSheetResult(parsed);
        const firstExceeded = parsed.usinas.find((u) => u.isExceededAnyMonth);
        setSelectedUsinaId(firstExceeded ? firstExceeded.id : parsed.usinas[0].id);
        showToast(`Arquivo "${file.name}" carregado (${parsed.usinas.length} usinas).`);
      } catch (err: any) {
        setError(err?.message || 'Falha ao processar arquivo CSV.');
        showToast('Erro ao processar arquivo.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Export consolidated CSV matrix
  const handleExportCsv = () => {
    if (sheetResult && sheetResult.usinas.length > 0) {
      exportMonthlyRecordsToCsv(sheetResult.usinas);
      showToast('Download da matriz consolidada em CSV iniciado.');
    }
  };

  // Find currently selected usina, guaranteeing Demanda Contratada is taken from demandasFixas
  const selectedUsina: UsinaMonthlyRecord | null = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return null;
    const found = sheetResult.usinas.find((u) => u.id === selectedUsinaId) || sheetResult.usinas[0];
    if (!found) return null;

    // Regra: Demanda Contratada diretamente de demandasFixas
    const fixedDemand = getDemandaFixa(found.name);
    const contractedDemand = fixedDemand !== null && fixedDemand > 0 ? fixedDemand : found.contractedDemandKw;
    const toleranceLimit = Math.round(contractedDemand * 1.03 * 100) / 100;
    const threshold5Pct = Math.round(contractedDemand * 0.05 * 100) / 100;

    if (contractedDemand !== found.contractedDemandKw) {
      const updatedMonths = found.months.map((m) => {
        const isExceeded = m.powerKw !== null && m.powerKw > toleranceLimit;
        const isUnderutilized = m.powerKw === null || (threshold5Pct > 0 && m.powerKw < threshold5Pct);
        const excess = isExceeded && m.powerKw !== null ? Math.round((m.powerKw - toleranceLimit) * 100) / 100 : 0;
        const pct = m.powerKw !== null && contractedDemand > 0 ? Math.round((m.powerKw / contractedDemand) * 1000) / 10 : 0;
        return {
          ...m,
          contractedDemandKw: contractedDemand,
          toleranceLimitKw: toleranceLimit,
          threshold5PctKw: threshold5Pct,
          isExceeded,
          isUnderutilized,
          excessKw: excess,
          percentageOfContracted: pct,
        };
      });

      const exceededCount = updatedMonths.filter((m) => m.isExceeded).length;

      return {
        ...found,
        contractedDemandKw: contractedDemand,
        toleranceLimitKw: toleranceLimit,
        threshold5PctKw: threshold5Pct,
        months: updatedMonths,
        isExceededAnyMonth: exceededCount > 0,
        exceededMonthsCount: exceededCount,
      };
    }

    return found;
  }, [sheetResult, selectedUsinaId]);

  // Generate dynamic period options from loaded plants
  const periodOptions: PeriodOption[] = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return [];
    return generatePeriodOptions(sheetResult.usinas, selectedYear);
  }, [sheetResult, selectedYear]);

  // Current period option
  const currentPeriod = useMemo(() => {
    return (
      periodOptions.find((p) => p.monthIndex === selectedMonthIndex && p.year === selectedYear) ||
      periodOptions[0]
    );
  }, [periodOptions, selectedMonthIndex, selectedYear]);

  // Report 1: Over-demand (> 3%) for selected period
  const overDemandItems = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return [];
    return getOverDemandReport(sheetResult.usinas, selectedMonthIndex, selectedYear);
  }, [sheetResult, selectedMonthIndex, selectedYear]);

  // Report 2: Under-demand (< 5%) for selected period
  const underDemandItems = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return [];
    return getUnderDemandReport(sheetResult.usinas, selectedMonthIndex, selectedYear, true);
  }, [sheetResult, selectedMonthIndex, selectedYear]);

  // Filtered usinas based on active period filter:
  // When filterMode === 'over_3': only plants that exceeded +3% in selectedMonthIndex
  // When filterMode === 'under_5': only plants that had power < 5% or 0 in selectedMonthIndex
  // When filterMode === 'all': all usinas
  const displayedUsinas = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return [];
    if (filterMode === 'all') return sheetResult.usinas;

    if (filterMode === 'over_3') {
      return sheetResult.usinas.filter((u) => {
        const fixedDemand = getDemandaFixa(u.name);
        const contractedDemand = fixedDemand !== null && fixedDemand > 0 ? fixedDemand : u.contractedDemandKw;
        const toleranceLimit = Math.round(contractedDemand * 1.03 * 100) / 100;
        const monthData = u.months.find((m) => m.monthIndex === selectedMonthIndex);
        return monthData && monthData.powerKw !== null && monthData.powerKw > toleranceLimit;
      });
    }

    if (filterMode === 'under_5') {
      return sheetResult.usinas.filter((u) => {
        const fixedDemand = getDemandaFixa(u.name);
        const contractedDemand = fixedDemand !== null && fixedDemand > 0 ? fixedDemand : u.contractedDemandKw;
        const threshold5Pct = Math.round(contractedDemand * 0.05 * 100) / 100;
        const monthData = u.months.find((m) => m.monthIndex === selectedMonthIndex);
        const powerKw = monthData?.powerKw ?? null;
        return powerKw === null || powerKw === 0 || (threshold5Pct > 0 && powerKw < threshold5Pct);
      });
    }

    return sheetResult.usinas;
  }, [sheetResult, filterMode, selectedMonthIndex]);

  // Auto-select first usina in filtered list if current selection is not included
  useEffect(() => {
    if (displayedUsinas.length > 0 && !displayedUsinas.some((u) => u.id === selectedUsinaId)) {
      setSelectedUsinaId(displayedUsinas[0].id);
    }
  }, [displayedUsinas, selectedUsinaId]);

  const currentUsinaIndex = useMemo(() => {
    if (!displayedUsinas || !selectedUsina) return 0;
    const idx = displayedUsinas.findIndex((u) => u.id === selectedUsina.id);
    return idx >= 0 ? idx : 0;
  }, [displayedUsinas, selectedUsina]);

  const handleExportActiveExcel = () => {
    if (!sheetResult || sheetResult.usinas.length === 0) return;
    const periodLabel = currentPeriod?.label || `${selectedMonthIndex}/${selectedYear}`;

    if (filterMode === 'over_3') {
      exportOverDemandToCsv(overDemandItems, periodLabel);
      showToast(`Exportação de ${overDemandItems.length} usinas acima de +3% concluída em Excel.`);
    } else if (filterMode === 'under_5') {
      exportUnderDemandToCsv(underDemandItems, periodLabel);
      showToast(`Exportação de ${underDemandItems.length} usinas abaixo de 5% concluída em Excel.`);
    } else {
      exportPeriodSummaryToCsv(sheetResult.usinas, selectedMonthIndex, selectedYear);
      showToast(`Resumo operacional de ${periodLabel} exportado para Excel.`);
    }
  };

  const handleSelectUsinaForChart = (usinaId: string) => {
    setSelectedUsinaId(usinaId);
    setActiveTab('dashboard');
    showToast('Exibindo gráfico e detalhes da usina selecionada.');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        {/* Global Toast */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header with Navigation Tabs */}
        <Header
          onRefresh={() => fetchData()}
          onExportCsv={handleExportCsv}
          isLoading={isLoading}
          totalUsinas={sheetResult?.usinasCount || 0}
          exceededCount={currentPeriod?.exceededCount || 0}
          underutilizedCount={currentPeriod?.underutilizedCount || 0}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
          {/* Operational Data Bar (clean, no bulky real-time banner) */}
          <DataSourceToolbar
            sheetResult={sheetResult}
            isLoading={isLoading}
            onRefresh={(url) => fetchData(url)}
            onFileUpload={handleFileUpload}
            onExportCsv={handleExportCsv}
            currentUrl={currentUrl}
          />

          {/* Period Selector (Month / Year) */}
          {periodOptions.length > 0 && (
            <PeriodSelector
              periodOptions={periodOptions}
              selectedMonthIndex={selectedMonthIndex}
              selectedYear={selectedYear}
              onSelectPeriod={(m, y) => {
                setSelectedMonthIndex(m);
                setSelectedYear(y);
              }}
              activeFilter={filterMode}
              onToggleFilter={(mode) => setFilterMode(mode)}
              onExportExcel={handleExportActiveExcel}
              filteredCount={displayedUsinas.length}
            />
          )}

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchData()}
                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 rounded font-bold text-red-800 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && !sheetResult && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-600">
                Processando dados operacionais e calculando limites de demanda...
              </p>
              <p className="text-xs text-slate-400">
                Calculando demandas contratadas fixas, margem de +3% e corte de 5%.
              </p>
            </div>
          )}

          {/* Loaded Content */}
          {sheetResult && selectedUsina && (
            <>
              {/* TAB 1: Dashboard & Gráficos */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* 1. Filtro de Usina (Dropdown com busca) */}
                  <section aria-label="Filtro de Usina">
                    <PlantSelector
                      usinas={displayedUsinas}
                      selectedUsinaId={selectedUsina.id}
                      onSelectUsina={(id) => setSelectedUsinaId(id)}
                      activeFilter={filterMode}
                      onClearFilter={() => setFilterMode('all')}
                      periodLabel={currentPeriod?.label}
                      totalOriginalCount={sheetResult.usinas.length}
                    />
                  </section>

                  {/* 2. Resumo / Cards no Topo */}
                  <section aria-label="Resumo da Usina">
                    <PlantSummaryCards
                      usina={selectedUsina}
                      totalUsinasCount={displayedUsinas.length}
                      currentUsinaIndex={currentUsinaIndex}
                    />
                  </section>

                  {/* 3 & 4. Gráfico Combinado (Recharts) com Destaque Vermelho */}
                  <section aria-label="Gráfico de Demanda">
                    <DemandChart usina={selectedUsina} />
                  </section>

                  {/* Detalhamento Mensal da Usina */}
                  <section aria-label="Detalhamento Mensal">
                    <MonthlyDetailTable usina={selectedUsina} />
                  </section>

                  {/* Visão Geral da Frota / Tabela de Usinas */}
                  <section aria-label="Ranking de Usinas da Frota">
                    <AllPlantsRankingTable
                      usinas={displayedUsinas}
                      selectedUsinaId={selectedUsina.id}
                      onSelectUsina={(id) => setSelectedUsinaId(id)}
                      activeFilter={filterMode}
                      periodLabel={currentPeriod?.label}
                      onClearFilter={() => setFilterMode('all')}
                    />
                  </section>
                </div>
              )}

              {/* TAB 2: Reporte 1 - Superação > 3% */}
              {activeTab === 'report_over_3' && (
                <section aria-label="Relatório de Superação Acima de 3%">
                  <OverDemandReport
                    reportItems={overDemandItems}
                    periodLabel={currentPeriod?.label || `${selectedMonthIndex}/${selectedYear}`}
                    onSelectUsinaForChart={handleSelectUsinaForChart}
                    onToast={showToast}
                  />
                </section>
              )}

              {/* TAB 3: Reporte 2 - Subutilização < 5% */}
              {activeTab === 'report_under_5' && (
                <section aria-label="Relatório de Subutilização Abaixo de 5%">
                  <UnderDemandReport
                    reportItems={underDemandItems}
                    periodLabel={currentPeriod?.label || `${selectedMonthIndex}/${selectedYear}`}
                    onSelectUsinaForChart={handleSelectUsinaForChart}
                    onToast={showToast}
                  />
                </section>
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Monitor Operacional de Demanda de Usinas © 2026 · Relatórios de Desvio Operacional
            </span>
            <span className="font-mono text-slate-400">
              Critérios de Corte: Superação &gt; +3% · Subutilização &lt; 5%
            </span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
