import React from 'react';
import { UsinaMonthlyRecord } from '../types/demand';
import { formatKw } from '../utils/demandParser';
import { AlertCircle, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';

interface MonthlyDetailTableProps {
  usina: UsinaMonthlyRecord;
}

export const MonthlyDetailTable: React.FC<MonthlyDetailTableProps> = ({ usina }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Detalhamento Mensal Numérico de {usina.name}
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Contratada: <strong>{formatKw(usina.contractedDemandKw)}</strong> | Limite +3%: <strong>{formatKw(usina.toleranceLimitKw)}</strong>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold tracking-wider uppercase text-[11px]">
              <th className="py-2.5 px-4">Mês</th>
              <th className="py-2.5 px-4 text-right">Potência Pico (kW)</th>
              <th className="py-2.5 px-4 text-right">Demanda Contratada (kW)</th>
              <th className="py-2.5 px-4 text-right">Limite Tolerância (+3%)</th>
              <th className="py-2.5 px-4 text-right">% da Demanda</th>
              <th className="py-2.5 px-4 text-right">Diferença vs. Limite</th>
              <th className="py-2.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {usina.months.map((m) => {
              const hasData = m.powerKw !== null && m.powerKw > 0;
              const isPeakOfYear = hasData && m.powerKw === usina.highestPeakKw;
              const deltaFromTolerance = hasData ? m.powerKw! - usina.toleranceLimitKw : 0;

              return (
                <tr
                  key={m.monthIndex}
                  className={`transition-colors hover:bg-slate-50/80 ${
                    m.isExceeded
                      ? 'bg-red-50/40'
                      : isPeakOfYear
                      ? 'bg-blue-50/30'
                      : ''
                  }`}
                >
                  {/* Mês */}
                  <td className="py-2.5 px-4 font-medium text-slate-900 flex items-center gap-1.5">
                    <span>{m.monthName}</span>
                    {isPeakOfYear && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200" title="Maior pico do ano">
                        <TrendingUp className="w-2.5 h-2.5" />
                        Maior Pico
                      </span>
                    )}
                  </td>

                  {/* Potência Pico Medida */}
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {hasData ? (
                      <span className={m.isExceeded ? 'text-red-600' : 'text-slate-900'}>
                        {formatKw(m.powerKw)}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal italic">Sem medição</span>
                    )}
                  </td>

                  {/* Demanda Contratada */}
                  <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                    {formatKw(usina.contractedDemandKw)}
                  </td>

                  {/* Limite de Tolerância (+3%) */}
                  <td className="py-2.5 px-4 text-right font-mono text-amber-700 font-medium">
                    {formatKw(usina.toleranceLimitKw)}
                  </td>

                  {/* % da Demanda */}
                  <td className="py-2.5 px-4 text-right font-mono">
                    {hasData ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-bold ${m.isExceeded ? 'text-red-700' : 'text-slate-800'}`}>
                          {m.percentageOfContracted.toFixed(1)}%
                        </span>
                        {/* Mini progress indicator */}
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              m.isExceeded ? 'bg-red-600' : m.percentageOfContracted > 95 ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, (m.percentageOfContracted / 103) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Diferença vs. Limite (+3%) */}
                  <td className="py-2.5 px-4 text-right font-mono">
                    {hasData ? (
                      m.isExceeded ? (
                        <span className="font-bold text-red-600">
                          +{formatKw(deltaFromTolerance)}
                        </span>
                      ) : (
                        <span className="text-emerald-700">
                          {formatKw(deltaFromTolerance)} (Margem)
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-4 text-center">
                    {hasData ? (
                      m.isExceeded ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                          <AlertCircle className="w-3 h-3 text-red-600" />
                          Ultrapassou
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Conforme
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400 text-[11px]">N/D</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
