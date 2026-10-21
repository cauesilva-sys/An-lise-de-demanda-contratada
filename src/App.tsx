import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SheetParseResult, UsinaMonthlyRecord } from './types/demand';
import { parseSheetCsv } from './utils/demandParser';
import { exportMonthlyRecordsToCsv } from './utils/exportMonthlyCsv';
import { Header } from './components/Header';
import { DataSourceToolbar } from './components/DataSourceToolbar';
import { PlantSelector } from './components/PlantSelector';
import { PlantSummaryCards } from './components/PlantSummaryCards';
import { DemandChart } from './components/DemandChart';
import { MonthlyDetailTable } from './components/MonthlyDetailTable';
import { AllPlantsRankingTable } from './components/AllPlantsRankingTable';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AlertCircle, CheckCircle2, RefreshCw, HelpCircle } from 'lucide-react';

const DEFAULT_CSV_URL = '/data/usinas_demanda_mensal.csv';
const FALLBACK_CSV_URL = '/assets/aistudio/Demanda_pico_por_usina_6c804d9d';

export default function App() {
  const [sheetResult, setSheetResult] = useState<SheetParseResult | null>(null);
  const [selectedUsinaId, setSelectedUsinaId] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>(() => {
    return localStorage.getItem('usinas_sheets_url') || DEFAULT_CSV_URL;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  /**
   * Fetch data from CSV endpoint or Google Sheets URL
   * Automatically adds cache-busting timestamp so the latest version is always reflected on page load
   */
  const fetchData = useCallback(async (targetUrl?: string) => {
    setIsLoading(true);
    setError(null);
    const urlToFetch = targetUrl || currentUrl;

    try {
      let csvText = '';

      // If user provided a remote Google Sheets URL, proxy through /api/fetch-sheet or direct fetch
      if (urlToFetch.startsWith('http://') || urlToFetch.startsWith('https://')) {
        try {
          const proxyResp = await fetch(`/api/fetch-sheet?url=${encodeURIComponent(urlToFetch)}&_t=${Date.now()}`);
          if (proxyResp.ok) {
            csvText = await proxyResp.text();
          } else {
            // Direct fetch attempt
            const directResp = await fetch(`${urlToFetch}${urlToFetch.includes('?') ? '&' : '?'}_t=${Date.now()}`);
            if (!directResp.ok) throw new Error(`HTTP ${directResp.status}`);
            csvText = await directResp.text();
          }
        } catch {
          // Direct fetch attempt
          const directResp = await fetch(`${urlToFetch}${urlToFetch.includes('?') ? '&' : '?'}_t=${Date.now()}`);
          if (!directResp.ok) throw new Error(`Falha ao obter dados da planilha (${directResp.status})`);
          csvText = await directResp.text();
        }
      } else {
        // Local public CSV fetch
        const resp = await fetch(`${urlToFetch}?_t=${Date.now()}`);
        if (!resp.ok) {
          // Try fallback URL
          const fbResp = await fetch(`${FALLBACK_CSV_URL}?_t=${Date.now()}`);
          if (!fbResp.ok) throw new Error('Não foi possível carregar o arquivo CSV.');
          csvText = await fbResp.text();
        } else {
          csvText = await resp.text();
        }
      }

      const parsed = parseSheetCsv(csvText, urlToFetch);
      if (parsed.usinas.length === 0) {
        throw new Error('Nenhuma usina encontrada no formato da planilha.');
      }

      setSheetResult(parsed);
      setCurrentUrl(urlToFetch);
      localStorage.setItem('usinas_sheets_url', urlToFetch);

      // Auto-select initial plant: retain previous selection if exists, else first plant with alert or first plant
      setSelectedUsinaId((prev) => {
        if (prev && parsed.usinas.some((u) => u.id === prev)) {
          return prev;
        }
        const firstExceeded = parsed.usinas.find((u) => u.isExceededAnyMonth);
        return firstExceeded ? firstExceeded.id : parsed.usinas[0].id;
      });

      showToast(`Dados atualizados com sucesso! ${parsed.usinas.length} usinas carregadas.`);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err?.message || 'Erro ao carregar dados da planilha.');
      showToast('Erro ao atualizar dados da planilha.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUrl]);

  // Load fresh data whenever the page loads
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
        showToast(`Arquivo "${file.name}" carregado com sucesso (${parsed.usinas.length} usinas).`);
      } catch (err: any) {
        setError(err?.message || 'Falha ao processar arquivo CSV.');
        showToast('Erro ao processar arquivo.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Export current data to CSV
  const handleExportCsv = () => {
    if (sheetResult && sheetResult.usinas.length > 0) {
      exportMonthlyRecordsToCsv(sheetResult.usinas);
      showToast('Download do arquivo CSV iniciado.');
    }
  };

  // Find currently selected usina
  const selectedUsina: UsinaMonthlyRecord | null = useMemo(() => {
    if (!sheetResult || sheetResult.usinas.length === 0) return null;
    return sheetResult.usinas.find((u) => u.id === selectedUsinaId) || sheetResult.usinas[0];
  }, [sheetResult, selectedUsinaId]);

  const currentUsinaIndex = useMemo(() => {
    if (!sheetResult || !selectedUsina) return 0;
    return sheetResult.usinas.findIndex((u) => u.id === selectedUsina.id);
  }, [sheetResult, selectedUsina]);

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

        {/* Header */}
        <Header
          onRefresh={() => fetchData()}
          onExportCsv={handleExportCsv}
          isLoading={isLoading}
          totalUsinas={sheetResult?.usinasCount || 0}
          exceededCount={sheetResult?.exceededCount || 0}
          lastCollectionTime={sheetResult?.lastFetchedAt}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
          {/* Data Source & Integration Bar */}
          <DataSourceToolbar
            sheetResult={sheetResult}
            isLoading={isLoading}
            onRefresh={(url) => fetchData(url)}
            onFileUpload={handleFileUpload}
            onExportCsv={handleExportCsv}
            currentUrl={currentUrl}
          />

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
                Buscando e processando dados mais recentes da planilha...
              </p>
              <p className="text-xs text-slate-400">
                Calculando demanda contratada, limites de tolerância (+3%) e picos mensais.
              </p>
            </div>
          )}

          {/* Loaded Dashboard Content */}
          {sheetResult && selectedUsina && (
            <>
              {/* 1. Filtro de Usina (Dropdown com busca) */}
              <section aria-label="Filtro de Usina">
                <PlantSelector
                  usinas={sheetResult.usinas}
                  selectedUsinaId={selectedUsina.id}
                  onSelectUsina={(id) => setSelectedUsinaId(id)}
                />
              </section>

              {/* 2. Resumo / Cards no Topo */}
              <section aria-label="Resumo da Usina">
                <PlantSummaryCards
                  usina={selectedUsina}
                  totalUsinasCount={sheetResult.usinasCount}
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
                  usinas={sheetResult.usinas}
                  selectedUsinaId={selectedUsina.id}
                  onSelectUsina={(id) => setSelectedUsinaId(id)}
                />
              </section>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Monitor de Demanda de Usinas © 2026 · Setor de Energia & Geração Distribuída
            </span>
            <span className="font-mono text-slate-400">
              Regulamentação: Margem de tolerância de +3% sobre a demanda contratada
            </span>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
