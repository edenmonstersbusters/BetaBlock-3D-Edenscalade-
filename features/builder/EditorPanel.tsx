
import React from 'react';
import { WallConfig, WallSegment, PlacedHold, WallMetadata } from '../../types';
import { Plus, ArrowRight, GitFork, Lock } from 'lucide-react';
import { SegmentManager } from './components/SegmentManager';
import { StructureSettings } from './components/StructureSettings';
import { FileControls } from '../../components/ui/FileControls';

interface EditorPanelProps {
  config: WallConfig;
  holds: PlacedHold[];
  metadata: WallMetadata;
  onUpdate: (newConfig: WallConfig) => void;
  onSwitchToHolds: () => void; // Renommé pour clarté
  showModal: (config: any) => void;
  onActionStart: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onNew: () => void;
  onRemoveSegment: (id: string) => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ 
    config, holds, metadata, onUpdate, onSwitchToHolds, showModal, onActionStart, 
    onExport, onImport, onNew, onRemoveSegment 
}) => {
  const isLocked = metadata.remixMode === 'holds';

  const addSegment = () => {
    if (isLocked) return;
    onActionStart();
    const newSegment: WallSegment = { id: crypto.randomUUID(), height: 2, angle: 0 };
    onUpdate({ ...config, segments: [...config.segments, newSegment] });
  };

  const updateSegment = (id: string, updates: Partial<WallSegment>) => {
    if (isLocked) return;
    if (updates.height !== undefined) {
      const segmentHolds = holds.filter(h => h.segmentId === id);
      if (segmentHolds.some(h => h.y > updates.height!)) {
        showModal({ title: "Action impossible", message: "Des prises se trouvent au-dessus de la hauteur demandée.", isAlert: true });
        return;
      }
    }
    onUpdate({ ...config, segments: config.segments.map((s) => s.id === id ? { ...s, ...updates } : s) });
  };

  const updateWidth = (newWidth: number) => {
    if (isLocked) return;
    if (holds.some(h => Math.abs(h.x) > newWidth / 2)) {
      showModal({ title: "Action impossible", message: "Des prises se trouvent en dehors de la largeur demandée.", isAlert: true });
      return;
    }
    onUpdate({ ...config, width: newWidth });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {metadata.parentId && (
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-3 mb-4 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                    <GitFork size={12} /><span>REMIX {isLocked ? 'OUVREUR' : 'ARCHITECTE'}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-tight">Inspiré par <span className="text-white font-bold">{metadata.parentName}</span>.</p>
                {isLocked && <div className="mt-2 flex items-center gap-2 text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded"><Lock size={10} /> STRUCTURE VERROUILLÉE</div>}
            </div>
        )}

        <StructureSettings width={config.width} isLocked={isLocked} onUpdateWidth={updateWidth} onActionStart={onActionStart} />

        <div className={isLocked ? "opacity-50 pointer-events-none grayscale" : ""}>
            <SegmentManager segments={config.segments} onUpdateSegment={updateSegment} onRemoveSegment={onRemoveSegment} onActionStart={onActionStart} />
        </div>

        <FileControls onExport={onExport} onImport={onImport} onNew={onNew} />
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-950 space-y-2">
        {!isLocked && (
            <button onClick={addSegment} className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center space-x-2 font-medium transition-colors border border-gray-700"><Plus size={16} /><span>Ajouter un Pan</span></button>
        )}
        <button onClick={onSwitchToHolds} className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center space-x-2 font-bold transition-colors shadow-lg shadow-emerald-900/20">
            <span>{isLocked ? "Continuer le remix" : "Passer à la pose des prises"}</span><ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
