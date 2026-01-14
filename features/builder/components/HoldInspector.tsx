
import React from 'react';
import { Layers, CheckCircle, RefreshCw, Scaling, RotateCw, Trash2, Lock } from 'lucide-react';
import { PlacedHold } from '../../../types';
import { ColorPalette } from '../../../components/ui/ColorPalette';

interface HoldInspectorProps {
  selectedHolds: PlacedHold[];
  onUpdate: (updates: Partial<PlacedHold>) => void;
  onRemove: () => void;
  onDeselect: () => void;
  onToggleReplaceMode: () => void;
  isReplacingMode: boolean;
  onActionStart: () => void;
  isLocked?: boolean;
}

export const HoldInspector: React.FC<HoldInspectorProps> = ({ 
  selectedHolds, onUpdate, onRemove, onDeselect, onToggleReplaceMode, isReplacingMode, onActionStart, isLocked = false
}) => {
  const isMulti = selectedHolds.length > 1;
  const firstHold = selectedHolds[0];

  if (!firstHold) return null;

  return (
    <section className="space-y-4 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-medium text-blue-400 uppercase tracking-wider">
                {isMulti ? <Layers size={14} /> : <CheckCircle size={14} />}
                <span>{isMulti ? `Groupe (${selectedHolds.length})` : 'Édition Prise'}</span>
            </div>
            <button onClick={onDeselect} className="text-xs text-gray-500 hover:text-white underline">Fermer</button>
        </div>
        <div className={`bg-gray-800 p-4 rounded-xl space-y-5 border ${isMulti ? 'border-emerald-500/30 bg-emerald-950/5' : 'border-blue-500/30'} ${isLocked ? 'opacity-50 grayscale' : ''}`}>
        
        {isLocked ? (
            <div className="flex items-center justify-center gap-2 py-4 text-amber-500 font-bold text-xs uppercase bg-amber-500/10 rounded-lg">
                <Lock size={14} />
                Prises verrouillées (Remix Structure)
            </div>
        ) : (
            <>
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={onToggleReplaceMode}
                        className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all border ${isReplacingMode ? 'bg-orange-600 border-orange-500 text-white animate-pulse' : 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border-blue-600/50'}`}
                    >
                        <RefreshCw size={16} className={isReplacingMode ? 'animate-spin' : ''} />
                        <span>{isReplacingMode ? 'Sélectionnez une prise...' : isMulti ? 'Changer le type du groupe' : 'Changer le type'}</span>
                    </button>
                </div>

                <ColorPalette 
                    selectedColor={firstHold.color} 
                    onSelect={(c) => { onActionStart(); onUpdate({ color: c }); }} 
                />

                <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><Scaling size={12}/> Taille</span><span className="text-white font-mono">x{firstHold.scale?.[0]?.toFixed(1) || '1.0'}</span></div>
                    <input type="range" min="0.1" max="3" step="0.1" value={firstHold.scale?.[0] || 1} 
                        onPointerDown={onActionStart}
                        onChange={(e) => { const s = parseFloat(e.target.value); onUpdate({ scale: [s, s, s] }); }}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-400"><span className="flex items-center gap-1"><RotateCw size={12}/> Rotation</span><span className="text-white font-mono">{Math.round(firstHold.spin || 0)}°</span></div>
                    <input type="range" min="0" max="360" step="15" value={firstHold.spin || 0} 
                        onPointerDown={onActionStart}
                        onChange={(e) => onUpdate({ spin: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                </div>
                <div className="pt-2">
                    <button onClick={onRemove} className="w-full py-2 text-xs bg-red-900/20 text-red-400 border border-red-900/50 rounded hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2 font-bold"><Trash2 size={12}/> {isMulti ? 'Supprimer la sélection' : 'Supprimer la prise'}</button>
                </div>
            </>
        )}
        </div>
    </section>
  );
};
