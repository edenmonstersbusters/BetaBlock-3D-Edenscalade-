
import React from 'react';
import { ArrowLeft, Copy, RotateCw, RotateCcw, Palette, Trash2, ClipboardPaste, ChevronRight, MoveUp, MoveDown } from 'lucide-react';
import { ContextMenuData } from '../../types';

// Palette de couleurs (répliquée ici pour l'affichage)
const PALETTE = [
    '#990000', '#004400', '#002266', '#aa4400', '#ccaa00',
    '#440066', '#882244', '#444444', '#f8f8f8', '#111111'
];

interface ContextMenuProps {
  data: ContextMenuData | null;
  onClose: () => void;
  onUpdateData: (newData: ContextMenuData) => void;
  
  // Actions
  onCopyHold: () => void;
  onPasteHold: (targetPos?: { x: number, y: number, segmentId: string }) => void;
  onDelete: (id: string, type: 'HOLD' | 'SEGMENT') => void;
  onRotateHold: (id: string, delta: number) => void;
  onColorHold: (id: string, color: string) => void;
  onSegmentUpdate: (id: string, updates: { angle?: number; height?: number }) => void;
  
  hasClipboard: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  data, onClose, onUpdateData,
  onCopyHold, onPasteHold, onDelete, onRotateHold, onColorHold, onSegmentUpdate,
  hasClipboard
}) => {
  if (!data) return null;

  return (
    <div 
        className="fixed z-[150] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 w-56 animate-in fade-in zoom-in-95 duration-150" 
        style={{ top: Math.min(data.y, window.innerHeight - 300), left: Math.min(data.x, window.innerWidth - 240) }} 
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
    >
        {data.type === 'HOLD' ? (
        <>
            {data.subMenu === 'COLOR' ? (
                <div className="p-3">
                    <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">Choisir une couleur</span>
                        <button onClick={(e) => { e.stopPropagation(); onUpdateData({ ...data, subMenu: undefined }); }} className="text-gray-500 hover:text-white"><ArrowLeft size={16}/></button>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                        {PALETTE.map(c => (
                            <button
                                key={c}
                                onClick={(e) => { e.stopPropagation(); onColorHold(data.id, c); onClose(); }}
                                className="w-8 h-8 rounded-full border border-white/20 hover:scale-110 hover:border-white transition-all shadow-sm"
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">Actions Prise</div>
                    <button onClick={(e) => { e.stopPropagation(); onCopyHold(); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><Copy size={16} className="text-blue-400" /> Copier <span className="ml-auto text-[10px] text-gray-500">Ctrl+C</span></button>
                    
                    <button onClick={(e) => { e.stopPropagation(); onRotateHold(data.id, 90); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><RotateCw size={16} className="text-emerald-400" /> Rotation +90°</button>
                    
                    <button onClick={(e) => { e.stopPropagation(); onRotateHold(data.id, -90); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><RotateCcw size={16} className="text-red-400" /> Rotation -90°</button>

                    <button onClick={(e) => { e.stopPropagation(); onUpdateData({ ...data, subMenu: 'COLOR' }); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><Palette size={16} className="text-orange-400" /> Modifier couleur</button>
                    
                    <div className="h-px bg-white/5 my-1" />
                    <button onClick={(e) => { e.stopPropagation(); onDelete(data.id, 'HOLD'); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/20 text-sm text-red-400"><Trash2 size={16} /> Supprimer</button>
                </>
            )}
        </>
        ) : (
        <>
            <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">Actions Pan</div>
            {hasClipboard && (
                <button onClick={(e) => { 
                    e.stopPropagation();
                    if (data.wallX !== undefined && data.wallY !== undefined) {
                        onPasteHold({ x: data.wallX, y: data.wallY, segmentId: data.id });
                    } else {
                        onPasteHold();
                    }
                    onClose(); 
                }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-500/10 text-sm text-emerald-400 font-bold"><ClipboardPaste size={16} /> Coller ici <span className="ml-auto text-[10px] text-gray-500">Ctrl+V</span></button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onSegmentUpdate(data.id, { angle: 10 }); }} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><span className="flex items-center gap-3"><RotateCw size={16} className="text-orange-400"/> Dévers +10°</span><ChevronRight size={14} className="text-gray-600"/></button>
            <button onClick={(e) => { e.stopPropagation(); onSegmentUpdate(data.id, { angle: -10 }); }} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><span className="flex items-center gap-3"><RotateCw size={16} className="text-blue-400"/> Dévers -10°</span><ChevronRight size={14} className="text-gray-600"/></button>
            <button onClick={(e) => { e.stopPropagation(); onSegmentUpdate(data.id, { height: 0.5 }); }} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><span className="flex items-center gap-3"><MoveUp size={16} className="text-emerald-400"/> Hauteur +0.5m</span><ChevronRight size={14} className="text-gray-600"/></button>
            <button onClick={(e) => { e.stopPropagation(); onSegmentUpdate(data.id, { height: -0.5 }); }} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200"><span className="flex items-center gap-3"><MoveDown size={16} className="text-red-400"/> Hauteur -0.5m</span><ChevronRight size={14} className="text-gray-600"/></button>
            <div className="h-px bg-white/5 my-1" />
            <button onClick={(e) => { e.stopPropagation(); onDelete(data.id, 'SEGMENT'); onClose(); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/20 text-sm text-red-400"><Trash2 size={16} /> Supprimer le pan</button>
        </>
        )}
    </div>
  );
};
