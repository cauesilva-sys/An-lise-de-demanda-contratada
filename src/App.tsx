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

// ID oficial da sua planilha do Google Sheets
const SPREADSHEET_ID = '11YGvwcxt8-65qKXm-7db5n070FnkAApYajZ-Nl9l9fo';

// Fallbacks locais para contingência extrema (sem internet ou offline)
const FALLBACK_2026_PATH = '/assets/aistudio/Demanda_pico_por_usina_2026_-_Resumo_mensal__2__a9241f53.csv';
const FALLBACK_2025_PATH = '/assets/aistudio/Pico_Demanda_Contratada_Mensal_-_Demanda_pico_Ano_2025_419e411e.csv';
const FALLBACK_2024_PATH = '/assets/aistudio/Pico_Demanda_Contratada_Mensal_-_Demanda_pico_Ano_2024_6d4dad48.csv';

/**
 * Faz download do CSV de uma aba específica do Google Sheets pelo nome da aba
 */
async function fetchSheetCsvPorAno(ano: number, spreadsheetId: string): Promise<string | null> {
  const nomeAba = encodeURIComponent(`Demanda pico Ano ${ano}`);
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${nomeAba}&_t=${Date.now()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const txt = await res.text();
    // Se retornar página HTML (erro de permissão ou aba inexistente)
    if (txt.includes('<!DOCTYPE html>') || txt.includes('google.visualization.Query.setResponse')) {
      return null;
    }
    // Verifica se tem conteúdo suficiente além de quebras de linha
    if (txt.trim().length < 50) return null;
    return txt;
  } catch {
    return null;
  }
}

export default function App() {
  const [sheetResult, setSheetResult] = useState<SheetParseResult | null>(null);
  const [selectedUsinaId, setSelectedUsinaId] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>('Conectando ao Google Sheets...');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active view tab: 'dashboard' | 'report_over_3' | 'report_under_5'
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

  // Filter mode for selected period: 'all' | 'over_3' | 'under_5'
  const [filterMode, setFilterMode] = useState<PeriodFilterMode>('all');

  // Selected period for deviation reporting (padrão inicial)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  /**
   * Varre dinamicamente as abas da planilha (2024 até 2 anos à frente)
   * detectando automaticamente novos anos como 2027, 2028 sem alteração de código.
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentYear = new Date().getFullYear();
      const minYear = 2024;
      const maxYear = Math.max(currentYear + 2, 2027); // Garante a busca de 2024 até pelo menos 2027/2028

      const anosParaPesquisar: number[] = [];
      for (let y = minYear; y <= maxYear; y++) {
        anosParaPesquisar.push(y);
      }

      // 1. Tenta carregar todas as abas diretamente do Google Sheets em paralelo
      const sheetResponses = await Promise.all(
        anosParaPesquisar.map(async (ano) => {
          const csvText = await fetchSheetCsvPorAno(ano, SPREADSHEET_ID);
          return { ano, csvText };
        })
      );

      const parsedResults: SheetParseResult[] = [];

      for (const item of sheetResponses) {
        if (item.csvText) {
          try {
            const parsed = parseSheetCsv(item.csvText, `Demanda_pico_Ano_${item.ano}.csv`, item.ano);
            if (parsed && parsed.usinas.length > 0) {
              parsedResults.push(parsed);
            }
          } catch (e) {
            console.warn(`Erro ao processar aba do ano ${item.ano}:`, e);
          }
        }
      }

      // 2. Se nenhuma aba respondeu (ex: sem conexão à internet ou planilha offline), recorre aos fallbacks
      if (parsedResults.length === 0) {
        console.warn('Google Sheets indisponível no momento. Carregando arquivos de contingência local...');
        const fetchFallback = async (path: string) => {
          try {
            const res = await fetch(`${path}?_t=${Date.now()}`);
            if (res.ok) return await res.text();
          } catch {}
          return '';
        };

        const [fb2024, fb2025, fb2026] = await Promise.all([
          fetchFallback(FALLBACK_2024_PATH),
          fetchFallback(FALLBACK_2025_PATH),
          fetchFallback(FALLBACK_2026_PATH),
        ]);

        if (fb2024) parsedResults.push(parseSheetCsv(fb2024, 'Pico_Demanda_2024.csv', 2024));
        if (fb2025) parsedResults.push(parseSheetCsv(fb2025, 'Pico_Demanda_2025.csv', 2025));
        if (fb2026) parsedResults.push(parseSheetCsv(fb2026, 'Pico_Demanda_2026.csv', 2026));
      }

      if (parsedResults.length === 0) {
        throw new Error('Não foi possível carregar os dados do Google Sheets nem os arquivos locais.');
      }

      const merged = mergeSheetResults(parsedResults);
      if (merged.usinas.length === 0) {
        throw new Error('Nenhuma usina encontrada nos dados da planilha.');
      }

      setSheetResult(merged);

      const anosCarregados = merged.availableYears.sort((a, b) => b - a);
      const anoMaisRecente = anosCarregados[0] || 2026;

      setCurrentUrl(`Google Sheets Conectado (${anosCarregados.join(', ')}) · ${merged.usinas.length} Usinas`);

      // Atualiza o ano padrão para o mais recente disponível caso o atual não exista
      if (!anosCarregados.includes(selectedYear)) {
        setSelectedYear(anoMaisRecente);
      }

      // Seleção automática inicial da usina
      setSelectedUsinaId((prev) => {
        if (prev && merged.usinas.some((u) => u.id === prev)) {
          return prev;
        }
        const exceededInLatest = merged.usinas.find((u) => {
          const m = u.months.find((p) => p.year === anoMaisRecente && p.isExceeded);
          return !!m;
        });
        if (exceededInLatest) return exceededInLatest.id;

        const firstExceeded = merged.usinas.find((u) => u.isExceededAnyMonth);
        return firstExceeded ? firstExceeded.id : merged.usinas[0].id;
      });

      showToast(`Google Sheets sincronizado! Anos: ${anosCarregados.join(', ')} (${merged.usinas.length} usinas)`);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err?.message || 'Erro ao carregar dados operacionais.');
      showToast('Erro ao atualizar base de dados.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  // Carrega ao montar a página
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Upload local de CSV manual
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

  // Exportar matriz consolidada em CSV
  const handleExportCsv = () => {
    if (sheetResult && sheetResult.usinas.length > 0) {
      exportMonthlyRecordsToCsv(sheetResult.usinas);
      showToast('Download da matriz consolidada em CSV iniciado.');
    }
  };

  // Usina atualmente selecionada com cálculo de tolerâncias
  const selectedUsina: UsinaMonthlyRecord | null = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return null;
    const found = sheetResult.usinas.find((u) => u.id === selectedUsinaId) || sheetResult.usinas[0];
    if (!found) return null;

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

  // Gera opções de período dinamicamente a partir dos anos carregados
  const periodOptions: PeriodOption[] = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return [];
    return generatePeriodOptions(sheetResult.usinas, sheetResult.availableYears);
  }, [sheetResult]);

  // Período atual selecionado
  const currentPeriod = useMemo(() => {
    return (
      periodOptions.find((p) => p.monthIndex === selectedMonthIndex && p.year === selectedYear) ||
      periodOptions[0]
    );
  }, [periodOptions, selectedMonthIndex, selectedYear]);

  // Relatório 1: Ultrapassagem > 3%
  const overDemandItems = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return [];
    return getOverDemandReport(sheetResult.usinas, selectedMonthIndex, selectedYear);
  }, [sheetResult, selectedMonthIndex, selectedYear]);

  // Relatório 2: Subutilização < 5%
  const underDemandItems = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return [];
    return getUnderDemandReport(sheetResult.usinas, selectedMonthIndex, selectedYear, true);
  }, [sheetResult, selectedMonthIndex, selectedYear]);

  // Usinas filtradas com base no modo selecionado
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
        {/* Toast Global */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
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

        {/* Área Principal */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
          {/* Barra de Origem dos Dados */}
          <DataSourceToolbar
            sheetResult={sheetResult}
            isLoading={isLoading}
            onRefresh={() => fetchData()}
            onFileUpload={handleFileUpload}
            onExportCsv={handleExportCsv}
            currentUrl={currentUrl}
          />

          {/* Seletor de Período */}
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
              overDemandItems={overDemandItems}
              selectedUsinaId={selectedUsina?.id}
              onSelectUsina={(id) => {
                setSelectedUsinaId(id);
                showToast('Usina selecionada para foco no gráfico.');
              }}
            />
          )}

          {/* Banner de Erro */}
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

          {/* Estado de Carregamento */}
          {isLoading && !sheetResult && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-600">
                Sincronizando abas do Google Sheets em tempo real...
              </p>
              <p className="text-xs text-slate-400">
                Calculando demandas contratadas fixas, margem (+3%) e subutilização (&lt; 5%).
              </p>
            </div>
          )}

          {/* Conteúdo Carregado */}
          {sheetResult && selectedUsina && (
            <>
              {/* TAB 1: Dashboard & Gráficos */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
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

                  <section aria-label="Resumo da Usina">
                    <PlantSummaryCards
                      usina={selectedUsina}
                      totalUsinasCount={displayedUsinas.length}
                      currentUsinaIndex={currentUsinaIndex}
                      selectedYear={selectedYear}
                      selectedMonthIndex={selectedMonthIndex}
                    />
                  </section>

                  <section aria-label="Gráfico de Demanda">
                    <DemandChart
                      usina={selectedUsina}
                      selectedYear={selectedYear}
                      onSelectYear={(yr) => setSelectedYear(yr)}
                    />
                  </section>

                  <section aria-label="Detalhamento Mensal">
                    <MonthlyDetailTable
                      usina={selectedUsina}
                      selectedYear={selectedYear}
                      selectedMonthIndex={selectedMonthIndex}
                    />
                  </section>

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

        {/* Rodapé */}
        <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Monitor Operacional de Demanda de Usinas · Google Sheets Integrado em Tempo Real
            </span>
            <span className="font-mono text-slate-400">
              Critérios de Corte: Ultrapassagem &gt; +3% · Subutilização &lt; 5%
            </span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
