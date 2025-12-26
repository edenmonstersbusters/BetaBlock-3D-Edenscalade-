
import React, { useRef } from 'react';
import { WallConfig, WallSegment, PlacedHold } from '../types';
import { Plus, Trash2, Maximize, Ruler, ArrowRight, Save, FolderOpen } from 'lucide-react';
import clsx from 'clsx';

interface EditorPanelProps {
  config: WallConfig;
  holds: PlacedHold[];
  onUpdate: (newConfig: WallConfig) => void;
  onNext: () => void;
  showModal: (config: { title: string; message: string; onConfirm?: () => void; confirmText?: string; isAlert?: boolean }) => void;
  onActionStart: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ config, holds, onUpdate, onNext, showModal, onActionStart, onExport, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addSegment = () => {
    onActionStart();
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
    const segmentHolds = holds.filter(h => h.segmentId === id);
    const message = segmentHolds.length > 0 
      ? `Ce pan contient ${segmentHolds.length} prise(s). Elles seront supprimées. Confirmer la suppression ?`
      : "Voulez-vous vraiment supprimer ce pan de mur ?";
      
    showModal({
      title: "Supprimer le pan",
      message,
      confirmText: "Supprimer",
      onConfirm: () => {
        onActionStart();
        onUpdate({
          ...config,
          segments: config.segments.filter((s) => s.id !== id),
        });
      }
    });
  };

  const updateSegment = (id: string, updates: Partial<WallSegment>) => {
    if (updates.height !== undefined) {
      const segmentHolds = holds.filter(h => h.segmentId === id);
      const outOfBounds = segmentHolds.some(h => h.y > updates.height!);
      if (outOfBounds) {
        showModal({ title: "Action impossible", message: "Des prises se trouvent au-dessus de la hauteur demandée.", isAlert: true });
        return;
      }
    }

    onUpdate({
      ...config,
      segments: config.segments.map((s) => s.id === id ? { ...s, ...updates } : s),
    });
  };

  const updateGlobal = (updates: Partial<WallConfig>) => {
    if (updates.width !== undefined) {
      const outOfBounds = holds.some(h => Math.abs(h.x) > updates.width! / 2);
      if (outOfBounds) {
        showModal({ title: "Action impossible", message: "Des prises se trouvent en dehors de la largeur demandée.", isAlert: true });
        return;
      }
    }
    onUpdate({ ...config, ...updates });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white border-r border-gray-800 w-80 shadow-xl z-10 overflow-hidden">
      <div className="p-6 border-b border-gray-800 bg-gray-950">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">BetaBlock 3D</h1>
        <p className="text-xs text-gray-500 mt-1">Configuration du Mur</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section className="space-y-4">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider"><Maximize size={14} /><span>Dimensions Globales</span></div>
          <div className="bg-gray-800 p-4 rounded-lg space-y-4 border border-gray-700">
            <div>
              <label className="flex justify-between text-sm mb-1 text-gray-300"><span>Largeur Totale</span><span className="font-mono text-blue-400">{config.width}m</span></label>
              <input
                type="range" min="1" max="20" step="0.5" value={config.width}
                onPointerDown={onActionStart}
                onChange={(e) => updateGlobal({ width: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
           <div className="flex items-center justify-between text-sm font-medium text-gray-400 uppercase tracking-wider"><div className="flex items-center space-x-2"><Ruler size={14} /><span>Pans de Mur ({config.segments.length})</span></div></div>
          <div className="space-y-3">
            {config.segments.map((seg, index) => (
              <div key={seg.id} className="group relative bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-500 bg-gray-900 px-2 py-1 rounded">#{index + 1}</span>
                  <button onClick={() => removeSegment(seg.id)} className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100" title="Supprimer le pan"><Trash2 size={16} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-400"><span>Hauteur</span><span className="text-white">{seg.height}m</span></div>
                    <input
                      type="range" min="0.5" max="10" step="0.1" value={seg.height}
                      onPointerDown={onActionStart}
                      onChange={(e) => updateSegment(seg.id, { height: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-400"><span>Inclinaison</span><span className={clsx("font-mono", seg.angle > 0 ? "text-orange-400" : seg.angle < 0 ? "text-blue-400" : "text-white")}>{seg.angle}°</span></div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-gray-600">-15°</span>
                      <input
                        type="range" min="-15" max="85" step="5" value={seg.angle}
                        onPointerDown={onActionStart}
                        onChange={(e) => updateSegment(seg.id, { angle: parseFloat(e.target.value) })}
                        className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <span className="text-[10px] text-gray-600">+85°</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 pt-4 border-t border-gray-800">
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider"><Save size={14} /><span>Gestion des Fichiers</span></div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={onExport}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 rounded-lg border border-gray-700 transition-all"
            >
              <Save size={14} className="text-emerald-400" />
              Sauvegarder
            </button>
            <button 
              onClick={handleImportClick}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 rounded-lg border border-gray-700 transition-all"
            >
              <FolderOpen size={14} className="text-blue-400" />
              Charger
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json"
              onChange={handleFileChange}
            />
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-950 space-y-2">
        <button onClick={addSegment} className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center space-x-2 font-medium transition-colors border border-gray-700"><Plus size={16} /><span>Ajouter un Pan</span></button>
        <button onClick={onNext} className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center space-x-2 font-bold transition-colors shadow-lg shadow-emerald-900/20"><span>Passer à la pose des prises</span><ArrowRight size={18} /></button>
      </div>
    </div>
  );
};
