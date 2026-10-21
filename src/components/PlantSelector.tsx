import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UsinaMonthlyRecord } from '../types/demand';
import { formatKw } from '../utils/demandParser';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PlantSelectorProps {
  usinas: UsinaMonthlyRecord[];
  selectedUsinaId: string;
  onSelectUsina: (usinaId: string) => void;
}

export const PlantSelector: React.FC<PlantSelectorProps> = ({
  usinas,
  selectedUsinaId,
  onSelectUsina,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'EXCEEDED' | 'OK'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedUsina = useMemo(() => {
    return usinas.find((u) => u.id === selectedUsinaId) || usinas[0];
  }, [usinas, selectedUsinaId]);

  const currentIndex = useMemo(() => {
    return usinas.findIndex((u) => u.id === selectedUsina?.id);
  }, [usinas, selectedUsina]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredUsinas = useMemo(() => {
    let list = usinas;

    if (filterType === 'EXCEEDED') {
      list = list.filter((u) => u.isExceededAnyMonth);
    } else if (filterType === 'OK') {
      list = list.filter((u) => !u.isExceededAnyMonth);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(q));
    }

    return list;
  }, [usinas, search, filterType]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectUsina(usinas[currentIndex - 1].id);
    } else {
      onSelectUsina(usinas[usinas.length - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < usinas.length - 1) {
      onSelectUsina(usinas[currentIndex + 1].id);
    } else {
      onSelectUsina(usinas[0].id);
    }
  };

  if (!selectedUsina) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Label & Searchable Dropdown */}
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap shrink-0 flex items-center gap-1.5">
            <span>Selecionar Usina (Coluna A):</span>
          </label>

          {/* Custom Searchable Dropdown */}
          <div className="relative flex-1" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-left text-sm font-semibold text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="truncate">{selectedUsina.name}</span>
                {selectedUsina.isExceededAnyMonth ? (
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                    Ultrapassou (+3%)
                  </span>
                ) : (
                  <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    OK
                  </span>
                )}
                <span className="shrink-0 text-xs font-mono font-normal text-slate-500 hidden sm:inline">
                  (Contrato: {formatKw(selectedUsina.contractedDemandKw)})
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-150">
                {/* Search Bar & Filter Tabs */}
                <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Pesquisar usina por nome..."
                      className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>

                  {/* Filter segmented buttons */}
                  <div className="flex items-center gap-1 text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => setFilterType('ALL')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        filterType === 'ALL'
                          ? 'bg-slate-900 text-white font-bold'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Todas ({usinas.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('EXCEEDED')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        filterType === 'EXCEEDED'
                          ? 'bg-red-600 text-white font-bold'
                          : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                      }`}
                    >
                      Excedidas ({usinas.filter((u) => u.isExceededAnyMonth).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('OK')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        filterType === 'OK'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      Em Conformidade ({usinas.filter((u) => !u.isExceededAnyMonth).length})
                    </button>
                  </div>
                </div>

                {/* Plant List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {filteredUsinas.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Nenhuma usina encontrada com os critérios pesquisados.
                    </div>
                  ) : (
                    filteredUsinas.map((u) => {
                      const isSelected = u.id === selectedUsina.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            onSelectUsina(u.id);
                            setIsOpen(false);
                            setSearch('');
                          }}
                          className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 text-left text-xs transition-colors ${
                            isSelected ? 'bg-blue-50/80 font-bold text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                            <span className="truncate">{u.name}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-slate-500 text-[11px]">
                              {formatKw(u.contractedDemandKw)}
                            </span>
                            {u.isExceededAnyMonth ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                +3%
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                OK
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Previous / Next Quick Stepper */}
        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={handlePrev}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors active:scale-95 shadow-2xs"
            title="Usina anterior"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          <span className="text-xs font-mono text-slate-500 px-1">
            {currentIndex + 1} / {usinas.length}
          </span>
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors active:scale-95 shadow-2xs"
            title="Próxima usina"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
