
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { CustomColorModal } from './color/CustomColorModal';

const PALETTE = [
    '#d7ca3d', '#ed7d31', '#2da53d', '#008ad4', '#c01f1c',
    '#f84159', '#302a2d', '#804c7d', '#cbc8bd'
];

interface ColorPaletteProps {
  selectedColor?: string;
  onSelect: (color: string) => void;
  label?: string;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({ selectedColor, onSelect, label = "COULEUR" }) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const isCustomColorSelected = selectedColor && !PALETTE.includes(selectedColor);

  return (
    <div>
        {showCustomModal && (
            <CustomColorModal 
                initialColor={selectedColor || '#ffffff'}
                onClose={() => setShowCustomModal(false)}
                onConfirm={(c) => { onSelect(c); setShowCustomModal(false); }}
            />
        )}

        <label className="text-[10px] text-gray-400 mb-4 block font-black uppercase tracking-[0.2em]">{label}</label>
        
        <div className="grid grid-cols-5 gap-4">
            {PALETTE.map(c => (
                <button 
                    key={c}
                    className={`relative w-11 h-11 rounded-full border-2 border-white/40 shadow-xl transition-all duration-300 transform active:scale-90 ${
                        selectedColor === c
                        ? 'scale-110 ring-4 ring-blue-500/50 ring-offset-2 ring-offset-gray-900 z-10 border-white' 
                        : 'hover:scale-110 hover:border-white/80 opacity-90 hover:opacity-100'
                    }`} 
                    style={{ 
                        backgroundColor: c,
                        boxShadow: selectedColor === c ? `0 0 15px ${c}88, 0 4px 6px -1px rgb(0 0 0 / 0.1)` : '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }} 
                    onClick={() => onSelect(c)}
                >
                    {selectedColor === c && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]" />
                        </div>
                    )}
                </button>
            ))}

            <button
                onClick={() => setShowCustomModal(true)}
                className={`relative w-11 h-11 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-300 transform active:scale-90 group overflow-hidden ${
                    isCustomColorSelected 
                    ? 'border-white scale-110 ring-4 ring-blue-500/50 ring-offset-2 ring-offset-gray-900 z-10 bg-gray-800' 
                    : 'border-gray-500 hover:border-blue-400 hover:scale-110 bg-gray-900/50 hover:bg-gray-800'
                }`}
                title="Couleur personnalisée"
                style={isCustomColorSelected ? { backgroundColor: selectedColor } : {}}
            >
                {isCustomColorSelected ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_white] mix-blend-difference" />
                    </div>
                ) : (
                    <Plus size={20} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                )}
            </button>
        </div>
    </div>
  );
};
