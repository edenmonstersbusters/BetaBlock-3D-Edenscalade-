
import React from 'react';

// Palette Industrielle Standard
const PALETTE = [
    '#990000', '#004400', '#002266', '#aa4400', '#ccaa00',
    '#440066', '#882244', '#444444', '#f8f8f8', '#111111'
];

interface ColorPaletteProps {
  selectedColor?: string;
  onSelect: (color: string) => void;
  label?: string;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({ selectedColor, onSelect, label = "COULEUR" }) => {
  return (
    <div>
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
        </div>
    </div>
  );
};
