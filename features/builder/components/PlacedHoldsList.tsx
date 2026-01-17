
import React, { useState } from 'react';
import { Trash2, Palette, X } from 'lucide-react';
import { PlacedHold } from '../../../types';
import { ColorPalette } from '../../../components/ui/ColorPalette';

interface PlacedHoldsListProps {
  holds: PlacedHold[];
  selectedIds: string[];
  onSelect: (id: string, multi: boolean) => void;
  onRemove: (id: string) => void;
  onRemoveAll: () => void;
  onColorAll: (color: string) => void;
  isLocked?: boolean;
}

export const PlacedHoldsList: React.FC<PlacedHoldsListProps> = ({ 
  holds, selectedIds, onSelect, onRemove, onRemoveAll, onColorAll, isLocked 
}) => {
  const [isPickingAllColor, setIsPickingAllColor] = useState(false);

  return (
    <section className="pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-sm font-medium text-gray-400 uppercase tracking-wider mb-2"><span>Prises posées ({holds.length})</span></div>
        <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar pr-1">
            {holds.slice().reverse().map((h, i) => (
                <div key={h.id} className={`flex justify-between items-center text-xs p-2 rounded-lg border transition-colors ${selectedIds.includes(h.id) ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500 cursor-pointer'}`} onClick={(e) => onSelect(h.id, e.ctrlKey || e.metaKey)}>
                    <span className="text-gray-300 font-bold">Prise #{holds.length - i}</span>
                    {!isLocked && (
                        <button onClick={(e) => { e.stopPropagation(); onRemove(h.id); }} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={12}/></button>
                    )}
                </div>
            ))}
        </div>
        {holds.length > 0 && !isLocked && (
            <div className="space-y-2 mt-4">
                {isPickingAllColor ? (
                    <div className="bg-gray-800 p-4 rounded-xl border-2 border-blue-500 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">COULEUR GLOBALE</span>
                            <button onClick={() => setIsPickingAllColor(false)} className="text-gray-500 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"><X size={16}/></button>
                        </div>
                        <ColorPalette onSelect={(c) => { onColorAll(c); setIsPickingAllColor(false); }} />
                    </div>
                ) : (
                    <button onClick={() => setIsPickingAllColor(true)} className="w-full py-2 px-4 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/50 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"><Palette size={14} /><span>Couleur globale</span></button>
                )}
                <button onClick={onRemoveAll} className="w-full py-2 px-4 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all"><Trash2 size={14} /><span>Vider le mur</span></button>
            </div>
        )}
    </section>
  );
};
