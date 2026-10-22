import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SheetParseResult, UsinaMonthlyRecord, PeriodOption, PeriodFilterMode } from './types/demand';
import { parseSheetCsv, mergeSheetResults } from './utils/demandParser';
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

const CSV_2024_PATH = '/data/usinas_demanda_2024.csv';
const CSV_2025_PATH = '/data/usinas_demanda_2025.csv';
const FALLBACK_2024_PATH = '/assets/aistudio/Pico_Demanda_Contratada_Mensal_-_Demanda_pico_Ano_2024_6d4dad48.csv';
const FALLBACK_2025_PATH = '/assets/aistudio/Pico_Demanda_Contratada_Mensal_-_Demanda_pico_Ano_2025_419e411e.csv';

export default function App() {
  const [sheetResult, setSheetResult] = useState<SheetParseResult | null>(null);
  const [selectedUsinaId, setSelectedUsinaId] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>('Planilhas 2024 & 2025 Consolidadas');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active view tab: 'dashboard' | 'report_over_3' | 'report_under_5'
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

  // Filter mode for selected period: 'all' | 'over_3' | 'under_5'
  const [filterMode, setFilterMode] = useState<PeriodFilterMode>('all');

  // Selected period for deviation reporting (default to Dezembro 2025, highest operational coverage)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(12);
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  /**
   * Fetch data for 2024 and 2025 in parallel and merge into unified dataset
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchWithFallback = async (primary: string, fallback: string) => {
        try {
          const res = await fetch(`${primary}?_t=${Date.now()}`);
          if (res.ok) return await res.text();
        } catch {}
        try {
          const res = await fetch(`${fallback}?_t=${Date.now()}`);
          if (res.ok) return await res.text();
        } catch {}
        return '';
      };

      const [text2024, text2025] = await Promise.all([
        fetchWithFallback(CSV_2024_PATH, FALLBACK_2024_PATH),
        fetchWithFallback(CSV_2025_PATH, FALLBACK_2025_PATH),
      ]);

      const parsedResults: SheetParseResult[] = [];
      if (text2024) {
        parsedResults.push(parseSheetCsv(text2024, 'Pico_Demanda_2024.csv', 2024));
      }
      if (text2025) {
        parsedResults.push(parseSheetCsv(text2025, 'Pico_Demanda_2025.csv', 2025));
      }

      if (parsedResults.length === 0) {
        // Fallback attempt with legacy file if neither 2024 nor 2025 loaded
        const legResp = await fetch(`/data/usinas_demanda_mensal.csv?_t=${Date.now()}`);
        if (legResp.ok) {
          const legText = await legResp.text();
          parsedResults.push(parseSheetCsv(legText, 'usinas_demanda_mensal.csv'));
        }
      }

      if (parsedResults.length === 0) {
        throw new Error('Não foi possível carregar as planilhas de demanda de 2024 e 2025.');
      }

      const merged = mergeSheetResults(parsedResults);
      if (merged.usinas.length === 0) {
        throw new Error('Nenhuma usina encontrada no formato das planilhas.');
      }

      setSheetResult(merged);
      setCurrentUrl('Planilhas 2024 & 2025 Consolidadas (125 Usinas)');

      // Auto-select initial plant
      setSelectedUsinaId((prev) => {
        if (prev && merged.usinas.some((u) => u.id === prev)) {
          return prev;
        }
        const firstExceeded = merged.usinas.find((u) => u.isExceededAnyMonth);
        return firstExceeded ? firstExceeded.id : merged.usinas[0].id;
      });

      showToast(`Dados de 2024 e 2025 atualizados com sucesso! (${merged.usinas.length} usinas)`);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err?.message || 'Erro ao carregar dados operacionais.');
      showToast('Erro ao atualizar base de dados.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

        const merged = sheetResult ? mergeSheetResults([sheetResult, parsed]) : parsed;
        setSheetResult(merged);

        const firstExceeded = merged.usinas.find((u) => u.isExceededAnyMonth);
        setSelectedUsinaId(firstExceeded ? firstExceeded.id : merged.usinas[0].id);
        showToast(`Arquivo "${file.name}" importado e integrado com sucesso (${merged.usinas.length} usinas).`);
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

  // Generate dynamic period options from loaded plants (both 2025 and 2024)
  const periodOptions: PeriodOption[] = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return [];
    return generatePeriodOptions(sheetResult.usinas, sheetResult.availableYears);
  }, [sheetResult]);

  // Current period option
  const currentPeriod = useMemo(() => {
    return (
      periodOptions.find((p) => p.monthIndex === selectedMonthIndex && p.year === selectedYear) ||
      periodOptions[0]
    );
  }, [periodOptions, selectedMonthIndex, selectedYear]);

  // Report 1: Over-demand (> 3%) for selected period (year and month)
  const overDemandItems = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return [];
    return getOverDemandReport(sheetResult.usinas, selectedMonthIndex, selectedYear);
  }, [sheetResult, selectedMonthIndex, selectedYear]);

  // Report 2: Under-demand (< 5%) for selected period (year and month)
  const underDemandItems = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return [];
    return getUnderDemandReport(sheetResult.usinas, selectedMonthIndex, selectedYear, true);
  }, [sheetResult, selectedMonthIndex, selectedYear]);

  // Filtered usinas based on active period filter (matching both selectedMonthIndex AND selectedYear)
  const displayedUsinas = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return [];
    if (filterMode === 'all') return sheetResult.usinas;

    if (filterMode === 'over_3') {
      return sheetResult.usinas.filter((u) => {
        const fixedDemand = getDemandaFixa(u.name);
        const contractedDemand = fixedDemand !== null && fixedDemand > 0 ? fixedDemand : u.contractedDemandKw;
        const toleranceLimit = Math.round(contractedDemand * 1.03 * 100) / 100;
        const monthData = u.months.find((m) => m.monthIndex === selectedMonthIndex && m.year === selectedYear);
        return monthData && monthData.powerKw !== null && monthData.powerKw > toleranceLimit;
      });
    }

    if (filterMode === 'under_5') {
      return sheetResult.usinas.filter((u) => {
        const fixedDemand = getDemandaFixa(u.name);
        const contractedDemand = fixedDemand !== null && fixedDemand > 0 ? fixedDemand : u.contractedDemandKw;
        const threshold5Pct = Math.round(contractedDemand * 0.05 * 100) / 100;
        const monthData = u.months.find((m) => m.monthIndex === selectedMonthIndex && m.year === selectedYear);
        const powerKw = monthData?.powerKw ?? null;
        return powerKw === null || powerKw === 0 || (threshold5Pct > 0 && powerKw < threshold5Pct);
      });
    }

    return sheetResult.usinas;
  }, [sheetResult, filterMode, selectedMonthIndex, selectedYear]);

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
          {/* Operational Data Bar */}
          <DataSourceToolbar
            sheetResult={sheetResult}
            isLoading={isLoading}
            onRefresh={() => fetchData()}
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
                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 rounded font-bold text-red-800 transition-colors cursor-pointer"
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
                Processando dados operacionais de 2024 e 2025...
              </p>
              <p className="text-xs text-slate-400">
                Calculando demandas contratadas fixas, margem de +3% e corte de 5% por usina, ano e mês.
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
                      selectedYear={selectedYear}
                      selectedMonthIndex={selectedMonthIndex}
                    />
                  </section>

                  {/* 3 & 4. Gráfico Combinado (Recharts) com Destaque Vermelho e Seletor de Ano */}
                  <section aria-label="Gráfico de Demanda">
                    <DemandChart
                      usina={selectedUsina}
                      selectedYear={selectedYear}
                      onSelectYear={(yr) => setSelectedYear(yr)}
                    />
                  </section>

                  {/* Detalhamento Mensal da Usina */}
                  <section aria-label="Detalhamento Mensal">
                    <MonthlyDetailTable
                      usina={selectedUsina}
                      selectedYear={selectedYear}
                      selectedMonthIndex={selectedMonthIndex}
                    />
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
              Monitor Operacional de Demanda de Usinas · Anos 2024 e 2025
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
