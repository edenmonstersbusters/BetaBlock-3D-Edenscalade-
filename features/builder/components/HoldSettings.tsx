
import React from 'react';
import { Box, RotateCw, Scaling, Target } from 'lucide-react';
import { ColorPalette } from '../../../components/ui/ColorPalette';

interface HoldSettingsProps {
  settings: { scale: number; rotation: number; color: string };
  onUpdate: (updates: Partial<{ scale: number; rotation: number; color: string }>) => void;
  isDynamicMeasuring: boolean;
  onToggleDynamicMeasure: () => void;
  isLocked?: boolean;
}

export const HoldSettings: React.FC<HoldSettingsProps> = ({ 
  settings, onUpdate, isDynamicMeasuring, onToggleDynamicMeasure, isLocked 
}) => {
  return (
    <section className={isLocked ? "opacity-50 pointer-events-none grayscale" : "space-y-4"}>
       <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider"><Box size={14} /><span>Paramètres de Pose</span></div>
       <div className="bg-gray-800 p-4 rounded-xl space-y-5 border border-gray-700">
          <ColorPalette 
              selectedColor={settings.color} 
              onSelect={(c) => onUpdate({ color: c })} 
          />
          <div>
              <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><Scaling size={12}/> Taille par défaut</span><span className="text-white font-mono">x{settings.scale.toFixed(1)}</span></div>
              <input type="range" min="0.1" max="3" step="0.1" value={settings.scale} onChange={(e) => onUpdate({ scale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          </div>
          <div>
              <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><RotateCw size={12}/> Rotation par défaut</span><span className="text-white font-mono">{settings.rotation}°</span></div>
              <input type="range" min="0" max="360" step="15" value={settings.rotation} onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
          </div>

          <div className="pt-2 border-t border-gray-700">
             <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md transition-colors ${isDynamicMeasuring ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                        <Target size={14} className={isDynamicMeasuring ? 'animate-pulse' : ''} />
                    </div>
                    <div>
                        <span className={`text-xs font-bold transition-colors ${isDynamicMeasuring ? 'text-blue-400' : 'text-gray-400'}`}>Mesure Dynamique</span>
                        {isDynamicMeasuring && <p className="text-[9px] text-blue-500/80 leading-none mt-0.5">Distance temps réel activée</p>}
                    </div>
                </div>
                <input 
                    type="checkbox" 
                    checked={isDynamicMeasuring} 
                    onChange={onToggleDynamicMeasure}
                    className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700"
                />
             </label>
          </div>
       </div>
    </section>
  );
};
