import React from 'react';
import { WallConfig, WallSegment } from '../types';
import { Plus, Trash2, Maximize, Ruler, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

interface EditorPanelProps {
  config: WallConfig;
  onUpdate: (newConfig: WallConfig) => void;
  onNext: () => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ config, onUpdate, onNext }) => {
  
  const addSegment = () => {
    const newSegment: WallSegment = {
      id: crypto.randomUUID(),
      height: 2,
      angle: 0,
    };
    onUpdate({
      ...config,
      segments: [...config.segments, newSegment],
    });
  };

  const removeSegment = (id: string) => {
    onUpdate({
      ...config,
      segments: config.segments.filter((s) => s.id !== id),
    });
  };

  const updateSegment = (id: string, updates: Partial<WallSegment>) => {
    onUpdate({
      ...config,
      segments: config.segments.map((s) => 
        s.id === id ? { ...s, ...updates } : s
      ),
    });
  };

  const updateGlobal = (updates: Partial<WallConfig>) => {
    onUpdate({ ...config, ...updates });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white border-r border-gray-800 w-80 shadow-xl z-10 overflow-hidden">
      <div className="p-6 border-b border-gray-800 bg-gray-950">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          BetaBlock 3D
        </h1>
        <p className="text-xs text-gray-500 mt-1">Wall Configuration Tool</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-700">
        
        {/* Global Settings */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider">
            <Maximize size={14} />
            <span>Dimensions Globales</span>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg space-y-4 border border-gray-700">
            <div>
              <label className="flex justify-between text-sm mb-1 text-gray-300">
                <span>Largeur Totale</span>
                <span className="font-mono text-blue-400">{config.width}m</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={config.width}
                onChange={(e) => updateGlobal({ width: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Segments List */}
        <section className="space-y-4">
           <div className="flex items-center justify-between text-sm font-medium text-gray-400 uppercase tracking-wider">
            <div className="flex items-center space-x-2">
              <Ruler size={14} />
              <span>Pans de Mur ({config.segments.length})</span>
            </div>
          </div>

          <div className="space-y-3">
            {config.segments.map((seg, index) => (
              <div 
                key={seg.id} 
                className="group relative bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-500 bg-gray-900 px-2 py-1 rounded">
                    #{index + 1}
                  </span>
                  <button
                    onClick={() => removeSegment(seg.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Supprimer le pan"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Height Control */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-400">
                      <span>Hauteur</span>
                      <span className="text-white">{seg.height}m</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.1"
                      value={seg.height}
                      onChange={(e) => updateSegment(seg.id, { height: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  {/* Angle Control */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-400">
                      <span>Inclinaison</span>
                      <span className={clsx(
                        "font-mono",
                        seg.angle > 0 ? "text-orange-400" : seg.angle < 0 ? "text-blue-400" : "text-white"
                      )}>
                        {seg.angle}°
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-gray-600">-15°</span>
                      <input
                        type="range"
                        min="-15"
                        max="85"
                        step="5"
                        value={seg.angle}
                        onChange={(e) => updateSegment(seg.id, { angle: parseFloat(e.target.value) })}
                        className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <span className="text-[10px] text-gray-600">+85°</span>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-gray-500">Dalle</span>
                        <span className="text-[10px] text-gray-500">Dévers</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-950 space-y-2">
        <button
          onClick={addSegment}
          className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center space-x-2 font-medium transition-colors border border-gray-700"
        >
          <Plus size={16} />
          <span>Ajouter un Pan</span>
        </button>
        
        <button
          onClick={onNext}
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center space-x-2 font-bold transition-colors shadow-lg shadow-emerald-900/20"
        >
          <span>Sauvegarder & Continuer</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
