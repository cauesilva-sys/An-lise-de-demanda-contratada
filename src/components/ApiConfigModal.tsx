import React, { useState } from 'react';
import { Key, CheckCircle, RefreshCw, X, ShieldCheck, ChevronRight, Terminal, Code } from 'lucide-react';

interface ApiConfigModalProps {
  isOpen: boolean;
  apiToken: string;
  onClose: () => void;
  onSaveToken: (newToken: string) => void;
}

interface EndpointDef {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  body?: any;
}

const DELFOS_ENDPOINTS: EndpointDef[] = [
  {
    name: 'Coleta de Séries Temporais (/timeseries)',
    method: 'POST',
    path: '/timeseries',
    body: {
      device_ids: [143],
      variable_ids: ['Active Power'],
      start_time: '2026-09-02 00:00:00',
      end_time: '2026-09-02 23:59:59',
      aggregate: '5 min',
    },
  },
  { name: 'Tipos de Dispositivos', method: 'GET', path: '/solar-data/data-studio/device-types' },
  { name: 'Dispositivos por Tipo', method: 'GET', path: '/solar-data/data-studio/device-types/2/devices' },
  { name: 'Agregações Disponíveis', method: 'GET', path: '/solar-data/data-studio/aggregations' },
  { name: 'Fontes de Dados (Sources)', method: 'GET', path: '/solar-data/data-studio/sources' },
  { name: 'Taxonomia de Sinais (Analog)', method: 'POST', path: '/solar-data/data-studio/taxonomy/signal', body: { device_type_ids: [2], source_ids: [10] } },
  { name: 'Taxonomia de Alarmes (Discrete)', method: 'POST', path: '/solar-data/data-studio/taxonomy/alarm', body: { device_type_ids: [2], source_ids: [10] } },
  {
    name: 'Séries Temporais (Data Studio Device Type)',
    method: 'POST',
    path: '/solar-data/data-studio/device-types/2/timeseries',
    body: {
      device_ids: [143],
      variable_ids: ['Active Power', 'signal-16'],
      start_time: '2026-09-02 00:00:00',
      end_time: '2026-09-02 23:59:59',
      aggregate: '5 min',
    },
  },
  { name: 'Alarmes Minerados (Timeseries Alarm)', method: 'POST', path: '/solar-data/data-studio/device-types/2/timeseries/alarm', body: { device_ids: [143], variable_ids: ['alarm-8'], start_time: '2026-09-02 00:00:00', end_time: '2026-09-02 23:59:59' } },
  { name: 'Classificações de Eventos', method: 'GET', path: '/solar-data/events/selectors/classifications' },
  { name: 'Responsabilidades de Eventos', method: 'GET', path: '/solar-data/events/selectors/responsibilities' },
  { name: 'Listagem de Eventos e Ocorrências', method: 'POST', path: '/solar-data/events/list', body: { pagination: true, page: 1, limit: 200, start_time: '2026-09-02 00:00:00', end_time: '2026-09-02 23:59:59' } },
  { name: 'Metas Operacionais do Ano (Goal)', method: 'GET', path: '/solar-data/operational/goal/2026' },
];

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  apiToken,
  onClose,
  onSaveToken,
}) => {
  const [tokenInput, setTokenInput] = useState(apiToken);
  const [activeTab, setActiveTab] = useState<'token' | 'endpoints'>('endpoints');
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(DELFOS_ENDPOINTS[0]);
  const [responseJson, setResponseJson] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [endpointStatuses, setEndpointStatuses] = useState<Record<string, 'IDLE' | 'SUCCESS' | 'ERROR'>>({});

  if (!isOpen) return null;

  const runEndpointTest = async (ep: EndpointDef) => {
    setIsTesting(true);
    try {
      const options: RequestInit = {
        method: ep.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenInput}`,
          'X-API-Token': tokenInput,
        },
      };
      if (ep.method === 'POST' && ep.body) {
        options.body = JSON.stringify(ep.body);
      }

      const res = await fetch(ep.path, options);
      const data = await res.json();
      setResponseJson(data);
      setEndpointStatuses((prev) => ({ ...prev, [ep.path]: 'SUCCESS' }));
    } catch (err: any) {
      setResponseJson({ error: 'Erro de conexão com o endpoint', details: err?.message });
      setEndpointStatuses((prev) => ({ ...prev, [ep.path]: 'ERROR' }));
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestAll = async () => {
    setIsTesting(true);
    for (const ep of DELFOS_ENDPOINTS) {
      try {
        const options: RequestInit = {
          method: ep.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenInput}`,
            'X-API-Token': tokenInput,
          },
        };
        if (ep.method === 'POST' && ep.body) {
          options.body = JSON.stringify(ep.body);
        }
        await fetch(ep.path, options);
        setEndpointStatuses((prev) => ({ ...prev, [ep.path]: 'SUCCESS' }));
      } catch {
        setEndpointStatuses((prev) => ({ ...prev, [ep.path]: 'ERROR' }));
      }
    }
    // Select timeseries endpoint to view
    runEndpointTest(DELFOS_ENDPOINTS[6]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveToken(tokenInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Integração API Delfos Solar Data Studio
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Conector para a API oficial <code className="text-blue-600 font-mono font-bold">https://api.delfos.im/solar-data</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'endpoints'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Validador de 11 Endpoints API (Delfos)</span>
          </button>
          <button
            onClick={() => setActiveTab('token')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'token'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Chave de API (Token)</span>
          </button>
        </div>

        {activeTab === 'token' ? (
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Token da API Delfos (Data Studio)
                </label>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 font-mono text-xs rounded-lg px-3 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  required
                />
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <p>
                  <strong>Chave Cadastrada:</strong> <code className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-bold">0yo70kLrBF0nXQz9IMvee6Z6PWwawNMM</code>
                </p>
                <p>
                  Este token concede acesso às consultas analógicas e discretas da telemetria de todas as 87 usinas solares.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Salvar Configuração</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left Column: Endpoint list */}
            <div className="md:col-span-5 border border-slate-200 rounded-xl overflow-y-auto max-h-[55vh] p-2 space-y-1 bg-slate-50">
              <div className="flex items-center justify-between pb-2 px-2 border-b border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Rotas da API ({DELFOS_ENDPOINTS.length})
                </span>
                <button
                  onClick={handleTestAll}
                  disabled={isTesting}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-md flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Testar Todas</span>
                </button>
              </div>

              {DELFOS_ENDPOINTS.map((ep, idx) => {
                const status = endpointStatuses[ep.path];
                const isSelected = selectedEndpoint.path === ep.path;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedEndpoint(ep);
                      runEndpointTest(ep);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            ep.method === 'GET'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {ep.method}
                        </span>
                        <span className="truncate font-semibold text-slate-800">{ep.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">{ep.path}</div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {status === 'SUCCESS' && (
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: JSON Payload Inspector */}
            <div className="md:col-span-7 flex flex-col border border-slate-200 rounded-xl bg-slate-950 text-slate-100 p-3 overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200">{selectedEndpoint.name}</span>
                </div>
                <button
                  onClick={() => runEndpointTest(selectedEndpoint)}
                  disabled={isTesting}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Re-executar</span>
                </button>
              </div>

              <div className="py-2 text-[11px] font-mono text-blue-300 border-b border-slate-800 truncate">
                {selectedEndpoint.method} https://api.delfos.im{selectedEndpoint.path}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto mt-2 font-mono text-[11px] text-emerald-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                {isTesting ? (
                  <div className="flex items-center gap-2 text-slate-400 py-4 justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                    <span>Requisitando dados da API Delfos...</span>
                  </div>
                ) : responseJson ? (
                  <pre className="whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(responseJson, null, 2)}
                  </pre>
                ) : (
                  <div className="text-slate-500 italic text-center py-4">
                    Clique em um endpoint ao lado para testar e inspecionar a resposta em tempo real.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
