import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { UsinaMonthlyRecord, MonthDataPoint } from '../types/demand';
import { formatKw } from '../utils/demandParser';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface DemandChartProps {
  usina: UsinaMonthlyRecord;
}

export const DemandChart: React.FC<DemandChartProps> = ({ usina }) => {
  // Chart data: prepare 12 months with null for months with 0 or missing data
  const chartData = useMemo(() => {
    return usina.months.map((m) => ({
      ...m,
      // If power is 0 or null, set to null so Recharts leaves the slot empty
      powerKw: m.powerKw && m.powerKw > 0 ? m.powerKw : null,
      displayMonth: m.monthShort,
    }));
  }, [usina]);

  // Calculate dynamic Y-axis domain so bars and both reference lines are always clearly framed
  const { yMin, yMax } = useMemo(() => {
    const validPowers = chartData
      .map((d) => d.powerKw)
      .filter((p): p is number => p !== null && p > 0);

    const values = [
      ...validPowers,
      usina.contractedDemandKw,
      usina.toleranceLimitKw,
    ].filter((v) => v > 0);

    if (values.length === 0) return { yMin: 0, yMax: 1000 };

    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);

    // Give 15% top padding for reference line labels
    const calculatedMax = Math.ceil(maxVal * 1.15);
    // Baseline can start at 0 or a bit below min if min is far above 0
    const calculatedMin = minVal > 500 ? Math.floor(Math.max(0, minVal * 0.7)) : 0;

    return {
      yMin: calculatedMin,
      yMax: calculatedMax,
    };
  }, [chartData, usina]);

  const activePointsCount = chartData.filter((d) => d.powerKw !== null).length;
  const exceededPointsCount = chartData.filter((d) => d.isExceeded).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Evolução Mensal da Potência Pico vs. Demanda Contratada
            </h2>
            {exceededPointsCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                {exceededPointsCount} {exceededPointsCount === 1 ? 'mês com ultrapassagem' : 'meses com ultrapassagem'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                Todos os meses em conformidade
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Comparativo da potência máxima registrada (kW) em relação à demanda contratada e tolerância regulatória (+3%).
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
            <span className="w-3 h-3 rounded-xs bg-[#2563EB] inline-block" />
            <span>Pico Regular (kW)</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-700 font-medium">
            <span className="w-3 h-3 rounded-xs bg-[#DC2626] inline-block" />
            <span>Ultrapassou Limite (+3%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-4 h-0.5 bg-slate-600 inline-block" />
            <span>Contratada ({formatKw(usina.contractedDemandKw)})</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-600 font-medium">
            <span className="w-4 h-0.5 border-b-2 border-dashed border-red-600 inline-block" />
            <span>Limite +3% ({formatKw(usina.toleranceLimitKw)})</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-84 sm:h-96 w-full">
        {activePointsCount === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Info className="w-8 h-8 mb-2 stroke-[1.5]" />
            <p className="text-sm font-medium">Nenhum dado medido disponível para esta usina.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="displayMonth"
                tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                tickFormatter={(val) => `${val.toLocaleString('pt-BR')} kW`}
                width={75}
              />
              <Tooltip
                content={<CustomTooltip contracted={usina.contractedDemandKw} tolerance={usina.toleranceLimitKw} />}
                cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
              />

              {/* Reference Line 1: Demanda Contratada (Linha Contínua Azul/Cinza) */}
              <ReferenceLine
                y={usina.contractedDemandKw}
                stroke="#475569"
                strokeWidth={2}
                label={{
                  value: `Contratada: ${usina.contractedDemandKw.toLocaleString('pt-BR')} kW`,
                  position: 'insideTopRight',
                  fill: '#334155',
                  fontSize: 11,
                  fontWeight: 600,
                  className: 'font-mono select-none',
                }}
              />

              {/* Reference Line 2: Limite de +3% (Linha Tracejada Vermelha) */}
              <ReferenceLine
                y={usina.toleranceLimitKw}
                stroke="#DC2626"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: `Limite +3%: ${usina.toleranceLimitKw.toLocaleString('pt-BR')} kW`,
                  position: 'insideBottomRight',
                  fill: '#DC2626',
                  fontSize: 11,
                  fontWeight: 700,
                  className: 'font-mono select-none',
                }}
              />

              {/* Bars with dynamic color alert rule */}
              <Bar
                dataKey="powerKw"
                name="Potência Pico (kW)"
                radius={[4, 4, 0, 0]}
                maxBarSize={52}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`bar-cell-${entry.monthIndex}`}
                    fill={entry.isExceeded ? '#DC2626' : '#2563EB'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          Regra de ultrapassagem: qualquer mês cuja potência supere <strong>{formatKw(usina.toleranceLimitKw)}</strong> (+3% da demanda) destaca a barra em vermelho.
        </span>
        <span className="font-mono text-slate-400">
          {activePointsCount} de 12 meses com medição registrada
        </span>
      </div>
    </div>
  );
};

// Custom Tooltip component
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  contracted: number;
  tolerance: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, contracted, tolerance }) => {
  if (!active || !payload || !payload.length) return null;

  const data: MonthDataPoint = payload[0].payload;
  if (!data.powerKw) return null;

  const deltaContracted = data.powerKw - contracted;
  const deltaTolerance = data.powerKw - tolerance;

  return (
    <div className="bg-slate-900 text-white rounded-lg p-3.5 shadow-xl text-xs border border-slate-700 min-w-[240px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
        <span className="font-bold text-sm text-slate-100">{data.monthName}</span>
        {data.isExceeded ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            ULTRA PASSOU (+3%)
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            DENTRO DA MARGEM
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Potência Pico Medida:</span>
          <span className={`font-mono font-bold text-sm ${data.isExceeded ? 'text-red-400' : 'text-blue-400'}`}>
            {formatKw(data.powerKw)}
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Demanda Contratada:</span>
          <span className="font-mono font-medium">{formatKw(contracted)}</span>
        </div>

        <div className="flex justify-between items-center text-slate-300">
          <span className="text-slate-400">Limite Tolerância (+3%):</span>
          <span className="font-mono font-medium text-amber-300">{formatKw(tolerance)}</span>
        </div>

        <div className="pt-2 mt-2 border-t border-slate-800 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Utilização da Demanda:</span>
            <span className="font-mono font-bold text-slate-200">
              {data.percentageOfContracted.toFixed(1)}%
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Diferença vs. Contratada:</span>
            <span className={`font-mono ${deltaContracted > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
              {deltaContracted > 0 ? `+${formatKw(deltaContracted)}` : formatKw(deltaContracted)}
            </span>
          </div>

          {data.isExceeded && (
            <div className="flex justify-between items-center text-red-400 font-bold">
              <span>Excesso acima do limite:</span>
              <span className="font-mono">+{formatKw(deltaTolerance)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
