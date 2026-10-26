import React, { useMemo, useState } from 'react';
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
  Legend,
} from 'recharts';
import { UsinaMonthlyRecord, MonthDataPoint } from '../types/demand';
import { formatKw } from '../utils/demandParser';
import { AlertTriangle, CheckCircle, Info, Calendar } from 'lucide-react';

interface DemandChartProps {
  usina: UsinaMonthlyRecord;
  selectedYear?: number;
  onSelectYear?: (year: number) => void;
}

export const DemandChart: React.FC<DemandChartProps> = ({
  usina,
  selectedYear = 2025,
  onSelectYear,
}) => {
  // Available years from usina
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    if (usina.availableYears) {
      usina.availableYears.forEach((y) => yearsSet.add(y));
    }
    usina.months.forEach((m) => {
      if (m.year) yearsSet.add(m.year);
    });
    const arr = Array.from(yearsSet).sort((a, b) => b - a);
    return arr.length > 0 ? arr : [2025, 2024];
  }, [usina]);

  const [viewMode, setViewMode] = useState<'single' | 'comparative'>('single');
  const [internalYear, setInternalYear] = useState<number>(selectedYear);

  const activeYear = onSelectYear ? selectedYear : internalYear;
  const handleYearChange = (yr: number) => {
    setInternalYear(yr);
    if (onSelectYear) onSelectYear(yr);
    setViewMode('single');
  };

  // Single year data (12 months of activeYear)
  const singleYearData = useMemo(() => {
    const yearMonths = usina.months.filter((m) => m.year === activeYear);
    // Ensure all 12 months 1..12 are represented
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    const fullNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return Array.from({ length: 12 }, (_, i) => {
      const mIdx = i + 1;
      const found = yearMonths.find((m) => m.monthIndex === mIdx);
      if (found) {
        return {
          ...found,
          powerKw: found.powerKw && found.powerKw > 0 ? found.powerKw : null,
          displayMonth: found.monthShort,
        };
      }
      return {
        year: activeYear,
        monthIndex: mIdx,
        monthName: fullNames[i],
        monthShort: monthNames[i],
        powerKw: null,
        contractedDemandKw: usina.contractedDemandKw,
        toleranceLimitKw: usina.toleranceLimitKw,
        threshold5PctKw: usina.threshold5PctKw,
        isExceeded: false,
        isUnderutilized: true,
        excessKw: 0,
        percentageOfContracted: 0,
        displayMonth: monthNames[i],
      };
    });
  }, [usina, activeYear]);

  // Comparative data (months 1..12 with 2024 and 2025 columns)
  const comparativeData = useMemo(() => {
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    return Array.from({ length: 12 }, (_, i) => {
      const mIdx = i + 1;
      const m2024 = usina.months.find((m) => m.year === 2024 && m.monthIndex === mIdx);
      const m2025 = usina.months.find((m) => m.year === 2025 && m.monthIndex === mIdx);
      const m2026 = usina.months.find((m) => m.year === 2026 && m.monthIndex === mIdx);

      const p2024 = m2024?.powerKw && m2024.powerKw > 0 ? m2024.powerKw : null;
      const p2025 = m2025?.powerKw && m2025.powerKw > 0 ? m2025.powerKw : null;
      const p2026 = m2026?.powerKw && m2026.powerKw > 0 ? m2026.powerKw : null;

      return {
        monthIndex: mIdx,
        displayMonth: monthNames[i],
        power2024: p2024,
        power2025: p2025,
        power2026: p2026,
        isExceeded2024: m2024?.isExceeded || false,
        isExceeded2025: m2025?.isExceeded || false,
        isExceeded2026: m2026?.isExceeded || false,
        contractedDemandKw: usina.contractedDemandKw,
        toleranceLimitKw: usina.toleranceLimitKw,
      };
    });
  }, [usina]);

  // Dynamic Y-axis domain
  const { yMin, yMax } = useMemo(() => {
    const values: number[] = [usina.contractedDemandKw, usina.toleranceLimitKw];

    if (viewMode === 'comparative') {
      comparativeData.forEach((d) => {
        if (d.power2024) values.push(d.power2024);
        if (d.power2025) values.push(d.power2025);
        if (d.power2026) values.push(d.power2026);
      });
    } else {
      singleYearData.forEach((d) => {
        if (d.powerKw) values.push(d.powerKw);
      });
    }

    const validValues = values.filter((v) => v > 0);
    if (validValues.length === 0) return { yMin: 0, yMax: 1000 };

    const maxVal = Math.max(...validValues);
    const minVal = Math.min(...validValues);

    const calculatedMax = Math.ceil(maxVal * 1.15);
    const calculatedMin = minVal > 500 ? Math.floor(Math.max(0, minVal * 0.7)) : 0;

    return {
      yMin: calculatedMin,
      yMax: calculatedMax,
    };
  }, [viewMode, comparativeData, singleYearData, usina]);

  const activePointsCount = singleYearData.filter((d) => d.powerKw !== null).length;
  const exceededPointsCount = singleYearData.filter((d) => d.isExceeded).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      {/* Chart Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Evolução Mensal da Potência Pico vs. Demanda Contratada
            </h2>

            {viewMode === 'single' && (
              <>
                {exceededPointsCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {exceededPointsCount} {exceededPointsCount === 1 ? 'mês com ultrapassagem' : 'meses com ultrapassagem'} em {activeYear}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Conforme em {activeYear}
                  </span>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Comparativo de potência máxima registrada (kW) em relação à demanda contratada e limite regulatório (+3%).
          </p>
        </div>

        {/* Year Selector Tabs on Top Right */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => handleYearChange(yr)}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  viewMode === 'single' && activeYear === yr
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Ano {yr}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setViewMode('comparative')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'comparative'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Comparativo Anual (2024 a 2026)
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-3 pb-2 border-b border-slate-50">
        <div className="flex flex-wrap items-center gap-3.5">
          {viewMode === 'single' ? (
            <>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-3 h-3 rounded-xs bg-[#2563EB] inline-block" />
                <span>Pico Regular (kW)</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-700 font-medium">
                <span className="w-3 h-3 rounded-xs bg-[#DC2626] inline-block" />
                <span>Ultrapassou Limite (+3%)</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-3 h-3 rounded-xs bg-[#6366F1] inline-block" />
                <span>Pico 2024 (kW)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-3 h-3 rounded-xs bg-[#0EA5E9] inline-block" />
                <span>Pico 2025 (kW)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-3 h-3 rounded-xs bg-[#10B981] inline-block" />
                <span>Pico 2026 (kW)</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-700 font-medium">
                <span className="w-3 h-3 rounded-xs bg-[#DC2626] inline-block" />
                <span>Ultrapassou (+3%)</span>
              </div>
            </>
          )}

          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-4 h-0.5 bg-slate-600 inline-block" />
            <span>Contratada ({formatKw(usina.contractedDemandKw)})</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-600 font-medium">
            <span className="w-4 h-0.5 border-b-2 border-dashed border-red-600 inline-block" />
            <span>Limite +3% ({formatKw(usina.toleranceLimitKw)})</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Visualizando: <strong>{viewMode === 'comparative' ? 'Comparativo Anual' : `Exercício ${activeYear}`}</strong>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-84 sm:h-96 w-full">
        {viewMode === 'single' ? (
          activePointsCount === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Info className="w-8 h-8 mb-2 stroke-[1.5]" />
              <p className="text-sm font-medium">
                Nenhum dado medido registrado para o ano {activeYear}.
              </p>
              <button
                type="button"
                onClick={() => handleYearChange(activeYear === 2024 ? 2025 : 2024)}
                className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Alternar para Ano {activeYear === 2024 ? 2025 : 2024}
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={singleYearData}
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
                  content={
                    <CustomTooltip
                      contracted={usina.contractedDemandKw}
                      tolerance={usina.toleranceLimitKw}
                      year={activeYear}
                    />
                  }
                  cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                />

                {/* Reference Line: Demanda Contratada */}
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

                {/* Reference Line: Limite +3% */}
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

                {/* Bars */}
                <Bar
                  dataKey="powerKw"
                  name="Potência Pico (kW)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={52}
                >
                  {singleYearData.map((entry) => (
                    <Cell
                      key={`bar-cell-${entry.monthIndex}`}
                      fill={entry.isExceeded ? '#DC2626' : '#2563EB'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        ) : (
          /* Comparative 2024 x 2025 Chart */
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={comparativeData}
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
                content={
                  <ComparativeTooltip
                    contracted={usina.contractedDemandKw}
                    tolerance={usina.toleranceLimitKw}
                  />
                }
                cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
              />

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
                }}
              />

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
                }}
              />

              {/* Bar 2024 */}
              <Bar
                dataKey="power2024"
                name="2024 (kW)"
                fill="#6366F1"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              >
                {comparativeData.map((entry) => (
                  <Cell
                    key={`bar-24-${entry.monthIndex}`}
                    fill={entry.isExceeded2024 ? '#DC2626' : '#6366F1'}
                  />
                ))}
              </Bar>

              {/* Bar 2025 */}
              <Bar
                dataKey="power2025"
                name="2025 (kW)"
                fill="#0EA5E9"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              >
                {comparativeData.map((entry) => (
                  <Cell
                    key={`bar-25-${entry.monthIndex}`}
                    fill={entry.isExceeded2025 ? '#DC2626' : '#0EA5E9'}
                  />
                ))}
              </Bar>

              {/* Bar 2026 */}
              <Bar
                dataKey="power2026"
                name="2026 (kW)"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              >
                {comparativeData.map((entry) => (
                  <Cell
                    key={`bar-26-${entry.monthIndex}`}
                    fill={entry.isExceeded2026 ? '#DC2626' : '#10B981'}
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
          {viewMode === 'single'
            ? `${activePointsCount} de 12 meses com medição registrada em ${activeYear}`
            : 'Comparando dados operacionais de 2024 e 2025'}
        </span>
      </div>
    </div>
  );
};

// Custom Tooltip for Single Year
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  contracted: number;
  tolerance: number;
  year: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, contracted, tolerance, year }) => {
  if (!active || !payload || !payload.length) return null;

  const data: MonthDataPoint = payload[0].payload;
  if (!data.powerKw) return null;

  const deltaContracted = data.powerKw - contracted;
  const deltaTolerance = data.powerKw - tolerance;

  return (
    <div className="bg-slate-900 text-white rounded-lg p-3.5 shadow-xl text-xs border border-slate-700 min-w-[240px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
        <span className="font-bold text-sm text-slate-100">
          {data.monthName} / {year}
        </span>
        {data.isExceeded ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            ULTRAPASSOU (+3%)
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

// Custom Tooltip for Comparative 2024 x 2025
interface ComparativeTooltipProps {
  active?: boolean;
  payload?: any[];
  contracted: number;
  tolerance: number;
}

const ComparativeTooltip: React.FC<ComparativeTooltipProps> = ({ active, payload, contracted, tolerance }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-slate-900 text-white rounded-lg p-3.5 shadow-xl text-xs border border-slate-700 min-w-[260px]">
      <div className="border-b border-slate-800 pb-2 mb-2.5 font-bold text-sm text-slate-100">
        Mês: {d.displayMonth} (Comparativo Anual)
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-indigo-300">
            <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 inline-block" />
            Ano 2024:
          </span>
          <span className={`font-mono font-bold ${d.isExceeded2024 ? 'text-red-400' : 'text-indigo-300'}`}>
            {d.power2024 !== null ? formatKw(d.power2024) : 'Sem medição'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-sky-300">
            <span className="w-2.5 h-2.5 rounded-xs bg-sky-500 inline-block" />
            Ano 2025:
          </span>
          <span className={`font-mono font-bold ${d.isExceeded2025 ? 'text-red-400' : 'text-sky-300'}`}>
            {d.power2025 !== null ? formatKw(d.power2025) : 'Sem medição'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
            Ano 2026:
          </span>
          <span className={`font-mono font-bold ${d.isExceeded2026 ? 'text-red-400' : 'text-emerald-300'}`}>
            {d.power2026 !== null ? formatKw(d.power2026) : 'Sem medição'}
          </span>
        </div>

        <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Contratada:</span>
            <span className="font-mono text-slate-300">{formatKw(contracted)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Limite +3%:</span>
            <span className="font-mono text-amber-300">{formatKw(tolerance)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
