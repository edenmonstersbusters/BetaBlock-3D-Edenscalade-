
import React from 'react';
import { WallConfig, WallSegment, PlacedHold, WallMetadata } from '../../types';
import { Plus, ArrowRight, Maximize, GitFork, Lock } from 'lucide-react';
import { SegmentManager } from './components/SegmentManager';
import { FileControls } from '../../components/ui/FileControls';

interface EditorPanelProps {
  config: WallConfig;
  holds: PlacedHold[];
  metadata: WallMetadata;
  onUpdate: (newConfig: WallConfig) => void;
  onNext: () => void;
  showModal: (config: { title: string; message: string; onConfirm?: () => void; confirmText?: string; isAlert?: boolean }) => void;
  onActionStart: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onNew: () => void;
  onHome: () => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ config, holds, metadata, onUpdate, onNext, showModal, onActionStart, onExport, onImport, onNew, onHome }) => {
  const isStructureLocked = metadata.remixMode === 'holds';

  const addSegment = () => {
    if (isStructureLocked) return;
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
    if (isStructureLocked) return;
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
    if (isStructureLocked) return;
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
    if (isStructureLocked) return;
    if (updates.width !== undefined) {
      const outOfBounds = holds.some(h => Math.abs(h.x) > updates.width! / 2);
      if (outOfBounds) {
        showModal({ title: "Action impossible", message: "Des prises se trouvent en dehors de la largeur demandée.", isAlert: true });
        return;
      }
    }
    onUpdate({ ...config, ...updates });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white border-r border-gray-800 w-80 shadow-xl z-10 overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Structure</h1>
                <p className="text-[10px] text-gray-500">Géométrie & Pans</p>
            </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {metadata.parentId && (
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-3 mb-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                    <GitFork size={12} />
                    <span>REMIX {isStructureLocked ? 'OUVREUR' : 'ARCHITECTE'}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-tight">
                    Inspiré par <span className="text-white font-bold">{metadata.parentName}</span>.
                </p>
                {isStructureLocked && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded">
                        <Lock size={10} />
                        STRUCTURE VERROUILLÉE
                    </div>
                )}
            </div>
        )}

        <section className={isStructureLocked ? "opacity-50 pointer-events-none grayscale" : "space-y-4"}>
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider"><Maximize size={14} /><span>Dimensions Globales</span></div>
          <div className="bg-gray-800 p-4 rounded-lg space-y-4 border border-gray-700">
            <div>
              <label className="flex justify-between text-sm mb-1 text-gray-300"><span>Largeur Totale</span><span className="font-mono text-blue-400">{config.width}m</span></label>
              <input
                type="range" min="1" max="20" step="0.5" value={config.width}
                disabled={isStructureLocked}
                onPointerDown={onActionStart}
                onChange={(e) => updateGlobal({ width: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        </section>

        <div className={isStructureLocked ? "opacity-50 pointer-events-none grayscale" : ""}>
            <SegmentManager 
                segments={config.segments}
                onUpdateSegment={updateSegment}
                onRemoveSegment={removeSegment}
                onActionStart={onActionStart}
            />
        </div>

        {/* Note: FileControls could be kept for local import/export if needed, but primary actions are now in TopBar */}
        <FileControls onExport={onExport} onImport={onImport} onNew={onNew} />
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-950 space-y-2">
        {!isStructureLocked && (
            <button onClick={addSegment} className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center space-x-2 font-medium transition-colors border border-gray-700"><Plus size={16} /><span>Ajouter un Pan</span></button>
        )}
        <button onClick={onNext} className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center space-x-2 font-bold transition-colors shadow-lg shadow-emerald-900/20">
            <span>{isStructureLocked ? "Continuer le remix" : "Passer à la pose des prises"}</span>
            <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
