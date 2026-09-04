import React, { useState, useMemo } from 'react';
import { UsinaDemandSummary } from '../types';
import {
  X,
  Copy,
  Check,
  Send,
  MessageSquare,
  Sparkles,
  Filter,
  Calendar,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaries: UsinaDemandSummary[];
  periodLabel: string;
  startTime: string;
  endTime: string;
  lastCollectionTime?: string | null;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  summaries,
  periodLabel,
  startTime,
  endTime,
  lastCollectionTime,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [includeWarnings, setIncludeWarnings] = useState<boolean>(false);
  const [compactFormat, setCompactFormat] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');

  // Usinas filtradas para o relatório
  const exceededUsinas = useMemo(() => {
    return summaries
      .filter((s) => s.status === 'EXCEEDED')
      .sort((a, b) => b.percentageOfContracted - a.percentageOfContracted);
  }, [summaries]);

  const warningUsinas = useMemo(() => {
    return summaries
      .filter((s) => s.status === 'WARNING')
      .sort((a, b) => b.percentageOfContracted - a.percentageOfContracted);
  }, [summaries]);

  // Formata data amigável do período
  const formatPeriodDisplay = () => {
    if (periodLabel && !periodLabel.includes('custom')) {
      return periodLabel;
    }
    const [dStart] = startTime.split(' ');
    const [dEnd] = endTime.split(' ');
    const fmt = (dStr: string) => (dStr ? dStr.split('-').reverse().join('/') : '');
    if (dStart === dEnd) {
      return `Dia ${fmt(dStart)}`;
    }
    return `${fmt(dStart)} a ${fmt(dEnd)}`;
  };

  // Gerador automático da mensagem WhatsApp com formatação oficial (*negrito*, etc.)
  const generatedMessage = useMemo(() => {
    const periodStr = formatPeriodDisplay();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const updateTimeStr =
      lastCollectionTime ||
      `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const lines: string[] = [];

    lines.push(`☀️ *GD SUN | RELATÓRIO DE DEMANDA E ULTRAPASSAGENS*`);
    lines.push(`📅 *Período:* ${periodStr}`);
    lines.push(`⏱️ *Coleta Acumulada:* ${updateTimeStr}`);
    lines.push(`📊 *Total Monitorado:* ${summaries.length} usinas`);
    lines.push(`🚨 *Ultrapassaram Demanda (> 103%):* ${exceededUsinas.length} usina(s)`);

    if (includeWarnings) {
      lines.push(`⚠️ *Usinas em Alerta (≥ 90% / Tolerância):* ${warningUsinas.length} usina(s)`);
    }

    if (customNote.trim()) {
      lines.push(``);
      lines.push(`💬 *Nota da Operação:*`);
      lines.push(`${customNote.trim()}`);
    }

    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (exceededUsinas.length === 0) {
      lines.push(`✅ *OPERAÇÃO 100% REGULAR NO PERÍODO!*`);
      lines.push(`Nenhuma usina ultrapassou o limite de tolerância regulatória (+3% / 103% da demanda contratada).`);
    } else {
      lines.push(`🔴 *USINAS COM ULTRAPASSAGEM DETECTADA (> 103%):*`);
      lines.push(``);

      exceededUsinas.forEach((u, index) => {
        const [dPart, tPart] = u.maxPeakTimestamp.split(' ');
        const dateFormatted = dPart ? dPart.split('-').reverse().join('/') : '--/--/----';
        const timeFormatted = tPart || '12:00:00';
        const excessFormatted = u.excessKw > 0 ? `+${u.excessKw.toLocaleString('pt-BR')} kW` : '0 kW';

        if (compactFormat) {
          lines.push(
            `${index + 1}. *${u.usinaName}*: Pico *${u.maxPeakKw.toLocaleString('pt-BR')} kW* (${u.percentageOfContracted}%) | Contrato: ${u.contractedDemandKw.toLocaleString('pt-BR')} kW | ${dateFormatted} às ${timeFormatted}`
          );
        } else {
          lines.push(`${index + 1}️⃣ *${u.usinaName}*`);
          lines.push(`• *Pico Máximo:* *${u.maxPeakKw.toLocaleString('pt-BR')} kW* (${u.percentageOfContracted}% do contrato)`);
          lines.push(
            `• *Demanda Contratada:* ${u.contractedDemandKw.toLocaleString('pt-BR')} kW (Limite 103%: ${u.toleranceKw.toLocaleString('pt-BR')} kW)`
          );
          lines.push(`• *Excedente:* ${excessFormatted}`);
          lines.push(`• 🕒 *Data e Hora do Maior Pico:* ${dateFormatted} às ${timeFormatted}`);
          lines.push(``);
        }
      });
    }

    if (includeWarnings && warningUsinas.length > 0) {
      lines.push(``);
      lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      lines.push(`⚠️ *USINAS EM FAIXA DE ALERTA (≥ 90% OU NA TOLERÂNCIA DE 103%):*`);
      lines.push(``);

      warningUsinas.slice(0, 8).forEach((u, index) => {
        const [dPart, tPart] = u.maxPeakTimestamp.split(' ');
        const dateFormatted = dPart ? dPart.split('-').reverse().join('/') : '--/--/----';
        const timeFormatted = tPart || '12:00:00';
        lines.push(
          `${index + 1}. *${u.usinaName}*: ${u.maxPeakKw.toLocaleString('pt-BR')} kW (${u.percentageOfContracted}%) | Contrato: ${u.contractedDemandKw.toLocaleString('pt-BR')} kW | ${dateFormatted} ${timeFormatted}`
        );
      });

      if (warningUsinas.length > 8) {
        lines.push(`... e mais ${warningUsinas.length - 8} usinas em alerta.`);
      }
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`ℹ️ _Sistema de Gestão de Telemetria GD Sun / Delfos Data Studio_`);

    return lines.join('\n');
  }, [
    summaries,
    exceededUsinas,
    warningUsinas,
    periodLabel,
    startTime,
    endTime,
    lastCollectionTime,
    includeWarnings,
    compactFormat,
    customNote,
  ]);

  const activeText = isEditing ? editedText : generatedMessage;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(activeText);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header com Estilo WhatsApp */}
        <div className="bg-[#075E54] text-white px-5 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <MessageSquare className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Resumo para WhatsApp</span>
                <span className="bg-[#25D366] text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Pronto para Envio
                </span>
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Valores consolidados com dia, hora e excedente (&gt; 103%) para compartilhamento rápido
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Status e Contadores */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Período Selecionado:</span>
            <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
              {formatPeriodDisplay()}
            </span>
          </div>

          <div className="flex items-center gap-2 font-semibold">
            <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
              {exceededUsinas.length} Ultrapassaram (&gt; 103%)
            </span>
            <span className="text-slate-500 font-normal">de {summaries.length} usinas</span>
          </div>
        </div>

        {/* Opções de Customização Rápida */}
        <div className="px-5 py-3 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeWarnings}
              onChange={(e) => setIncludeWarnings(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Incluir usinas em Alerta (≥ 90% ou na tolerância)</span>
          </label>

          <label className="flex items-center gap-2 text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={compactFormat}
              onChange={(e) => setCompactFormat(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Formato ultra-compacto (uma linha por usina)</span>
          </label>
        </div>

        {/* Visualizador / Editor da Mensagem */}
        <div className="p-5 overflow-y-auto flex-1 bg-[#ECE5DD]/40 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Pré-visualização do Balão de Mensagem:
            </span>
            <button
              onClick={() => {
                if (!isEditing) {
                  setEditedText(generatedMessage);
                }
                setIsEditing(!isEditing);
              }}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
            >
              {isEditing ? 'Restaurar Texto Automático' : 'Personalizar Texto'}
            </button>
          </div>

          {isEditing ? (
            <textarea
              rows={12}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full bg-white border border-emerald-300 text-slate-900 text-xs font-mono p-4 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Digite ou ajuste a mensagem..."
            />
          ) : (
            <div className="bg-[#E7FFDB] border border-emerald-200/80 rounded-2xl p-4 shadow-sm relative text-slate-900 text-xs font-sans whitespace-pre-wrap leading-relaxed select-text">
              {generatedMessage}
            </div>
          )}

          {/* Campo opcional de Nota */}
          {!isEditing && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Adicionar Observação / Comentário (Opcional):
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Ex: Equipe, favor averiguar os inversores das usinas acima..."
                className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="bg-white border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            {copied ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                Mensagem copiada com sucesso para o WhatsApp!
              </span>
            ) : (
              <span>Clique em Copiar para colar direto no WhatsApp Web ou App.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-[0.98] ${
                copied
                  ? 'bg-emerald-700 text-white shadow-emerald-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
              <span>{copied ? 'Copiado!' : 'Copiar Mensagem'}</span>
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-slate-900 font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-[0.98]"
              title="Abrir WhatsApp com o texto pré-preenchido"
            >
              <Send className="w-4 h-4 text-slate-900" />
              <span>Abrir no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
