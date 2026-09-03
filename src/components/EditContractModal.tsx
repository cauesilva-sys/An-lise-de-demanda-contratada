import React, { useState, useEffect } from 'react';
import { Edit3, CheckCircle, X } from 'lucide-react';

interface EditContractModalProps {
  isOpen: boolean;
  usinaId: string | null;
  usinaName: string;
  currentValueKw: number;
  onClose: () => void;
  onSave: (usinaId: string, newValKw: number) => Promise<void>;
}

export const EditContractModal: React.FC<EditContractModalProps> = ({
  isOpen,
  usinaId,
  usinaName,
  currentValueKw,
  onClose,
  onSave,
}) => {
  const [val, setVal] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentValueKw) {
      setVal(String(currentValueKw));
    }
  }, [currentValueKw, isOpen]);

  if (!isOpen || !usinaId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      alert('Por favor, informe um valor de demanda contratada válido (maior que zero).');
      return;
    }
    setIsSubmitting(true);
    await onSave(usinaId, num);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Ajustar Demanda Contratada
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <p className="text-xs text-slate-600">
            Usina: <strong className="text-blue-600">{usinaName}</strong>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Informe o novo valor de demanda contratada em quilowatts (kW) acordado no contrato de uso do sistema de distribuição (CUSD):
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Nova Demanda Contratada (kW)
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder="Ex: 2300"
                className="w-full bg-white border border-slate-200 text-slate-900 font-mono font-bold text-base rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">
                kW
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Valor anterior: {currentValueKw.toLocaleString('pt-BR')} kW
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Novo Contrato'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
