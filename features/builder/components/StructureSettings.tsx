
import React from 'react';
import { Maximize } from 'lucide-react';

interface StructureSettingsProps {
  width: number;
  isLocked: boolean;
  onUpdateWidth: (width: number) => void;
  onActionStart: () => void;
}

export const StructureSettings: React.FC<StructureSettingsProps> = ({ width, isLocked, onUpdateWidth, onActionStart }) => {
  return (
    <section className={isLocked ? "opacity-50 pointer-events-none grayscale" : "space-y-4"}>
      <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider">
        <Maximize size={14} /><span>Dimensions Globales</span>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg space-y-4 border border-gray-700">
        <div>
          <label className="flex justify-between text-sm mb-1 text-gray-300">
            <span>Largeur Totale</span>
            <span className="font-mono text-blue-400">{width}m</span>
          </label>
          <input
            type="range" min="1" max="20" step="0.5" value={width}
            disabled={isLocked}
            onPointerDown={onActionStart}
            onChange={(e) => onUpdateWidth(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </section>
  );
};
