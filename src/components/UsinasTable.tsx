import React from 'react';
import { UsinaDemandSummary } from '../types';
import {
  Layers,
  Edit3,
  Calendar,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Eye,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react';

interface UsinasTableProps {
  summaries: UsinaDemandSummary[];
  selectedUsinaId: string;
  onSelectUsina: (usinaId: string) => void;
  onEditContract: (usinaId: string, currentVal: number, usinaName: string) => void;
  searchQuery: string;
  statusCategory?: 'ALL' | 'EXCEEDED' | 'WARNING' | 'OK';
  onSelectCategory?: (category: 'ALL' | 'EXCEEDED' | 'WARNING' | 'OK') => void;
  onOpenWhatsApp?: () => void;
  onExportCsv?: () => void;
}

export const UsinasTable: React.FC<UsinasTableProps> = ({
  summaries,
  selectedUsinaId,
  onSelectUsina,
  onEditContract,
  searchQuery,
  statusCategory = 'ALL',
  onSelectCategory,
  onOpenWhatsApp,
  onExportCsv,
}) => {
  const filteredSummaries = summaries.filter((s) => {
    const matchesSearch = s.usinaName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusCategory === 'EXCEEDED') return s.status === 'EXCEEDED';
    if (statusCategory === 'WARNING') return s.status === 'WARNING';
    if (statusCategory === 'OK') return s.status === 'OK';
    return true;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 lg:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">
            Tabela Geral de Demanda por Usina
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-mono font-bold">
            {filteredSummaries.length} usinas exibidas
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => onSelectCategory && onSelectCategory('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              statusCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({summaries.length})
          </button>
          <button
            onClick={() => onSelectCategory && onSelectCategory('EXCEEDED')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
              statusCategory === 'EXCEEDED'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            Ultrapassou &gt; 104% ({summaries.filter((s) => s.status === 'EXCEEDED').length})
          </button>
          <button
            onClick={() => onSelectCategory && onSelectCategory('WARNING')}
            className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
              statusCategory === 'WARNING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Alerta / Tolerância ({summaries.filter((s) => s.status === 'WARNING').length})
          </button>

          {onOpenWhatsApp && (
            <button
              onClick={onOpenWhatsApp}
              className="ml-1 px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-slate-900 shadow-xs active:scale-[0.98]"
              title="Copiar e compartilhar lista das usinas com ultrapassagem via WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          )}

          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-[0.98]"
              title="Exportar dados de demanda das usinas em formato CSV compatível com Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-xs">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Usina / Dispositivo</th>
              <th className="py-3 px-4">Demanda Contratada</th>
              <th className="py-3 px-4">Potência Pico (kWp)</th>
              <th className="py-3 px-4">Pico Máximo Lido (kW)</th>
              <th className="py-3 px-4">Data do Pico</th>
              <th className="py-3 px-4">Hora do Pico</th>
              <th className="py-3 px-4 text-center">Uso do Contrato</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {filteredSummaries.length > 0 ? (
              filteredSummaries.map((s) => {
                const isSelected = selectedUsinaId === s.usinaId;
                const [datePart, timePart] = s.maxPeakTimestamp ? s.maxPeakTimestamp.split(' ') : ['', ''];
                const formattedDate = datePart ? datePart.split('-').reverse().join('/') : '--/--/----';
                const formattedTime = timePart || '00:00:00';

                return (
                  <tr
                    key={s.usinaId}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-blue-50/60 border-l-4 border-l-blue-600' : ''
                    } ${s.status === 'EXCEEDED' ? 'bg-red-50/30' : ''}`}
                  >
                    {/* Usina Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-bold">⚡</span>
                        <div>
                          <div className="font-bold text-slate-900">{s.usinaName}</div>
                          <div className="text-[10px] text-slate-500">{s.deviceType}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contracted Demand */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-800">
                          {s.contractedDemandKw.toLocaleString('pt-BR')} kW
                        </span>
                        <button
                          onClick={() => onEditContract(s.usinaId, s.contractedDemandKw, s.usinaName)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors rounded hover:bg-slate-100"
                          title="Editar contrato de demanda"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Peak Capacity kWp */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                      {s.capacityKwp ? `${s.capacityKwp.toLocaleString('pt-BR')} kWp` : '--'}
                    </td>

                    {/* Max Peak kW */}
                    <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-sm">
                      {s.maxPeakKw.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kW
                      <div className="text-[10px] font-normal text-slate-500">
                        = {(s.maxPeakKw / 1000).toFixed(2)} MW
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        {formattedDate}
                      </div>
                    </td>

                    {/* Time */}
                    <td className="py-3.5 px-4 font-mono font-black text-blue-700 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        {formattedTime}
                      </div>
                    </td>

                    {/* ContractUsage % & Progress Bar */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2 font-mono font-bold">
                        <span
                          className={`${
                            s.status === 'EXCEEDED'
                              ? 'text-red-600'
                              : s.status === 'WARNING'
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {s.percentageOfContracted.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-24 bg-slate-200 rounded-full h-1.5 mx-auto mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            s.status === 'EXCEEDED'
                              ? 'bg-red-600'
                              : s.status === 'WARNING'
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${Math.min(100, s.percentageOfContracted)}%` }}
                        />
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {s.status === 'EXCEEDED' ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full border border-red-200 shadow-xs" title={s.statusReason || 'Ultrapassagem acima de 104% da demanda contratada'}>
                            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                            ULTRAPASSOU &gt; 104% (+{s.excessKw.toLocaleString('pt-BR')} kW)
                          </span>
                          <span className="text-[10px] text-red-600 font-medium pl-1">
                            Pico {s.maxPeakKw.toLocaleString('pt-BR')} kW &gt; Limite {s.toleranceKw.toLocaleString('pt-BR')} kW
                          </span>
                        </div>
                      ) : s.status === 'WARNING' ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200" title={s.statusReason || 'Faixa de alerta (>=90%) ou na tolerância de até 104%'}>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            {s.maxPeakKw > s.contractedDemandKw ? 'TOLERÂNCIA ≤ 104%' : 'ALERTA ≥ 90%'}
                          </span>
                          {s.maxPeakKw > s.contractedDemandKw ? (
                            <span className="text-[10px] text-amber-700 font-semibold pl-1">
                              Pico {s.maxPeakKw.toLocaleString('pt-BR')} kW (resguardado até 104%)
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 font-medium pl-1">
                              {s.percentageOfContracted.toFixed(1)}% do contrato ({s.contractedDemandKw.toLocaleString('pt-BR')} kW)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200" title="Dentro da demanda contratada e tolerância regulatória de até 104%">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          OPERAÇÃO REGULAR
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectUsina(s.usinaId)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isSelected ? 'Tratando Agora' : 'Tratar Usina'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                  Nenhuma usina encontrada com o filtro atual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
