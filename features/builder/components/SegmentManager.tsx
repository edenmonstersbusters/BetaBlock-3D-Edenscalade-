
import React from 'react';
import { Ruler, Trash2 } from 'lucide-react';
import { WallSegment } from '../../../types';
import clsx from 'clsx';

interface SegmentManagerProps {
  segments: WallSegment[];
  onUpdateSegment: (id: string, updates: Partial<WallSegment>) => void;
  onRemoveSegment: (id: string) => void;
  onActionStart: () => void;
}

export const SegmentManager: React.FC<SegmentManagerProps> = ({ segments, onUpdateSegment, onRemoveSegment, onActionStart }) => {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between text-sm font-medium text-gray-400 uppercase tracking-wider">
        <div className="flex items-center space-x-2"><Ruler size={14} /><span>Pans de Mur ({segments.length})</span></div>
      </div>
      <div className="space-y-3">
        {segments.map((seg, index) => (
          <div key={seg.id} className="group relative bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-gray-500 bg-gray-900 px-2 py-1 rounded">#{index + 1}</span>
              <button 
                onClick={() => onRemoveSegment(seg.id)} 
                className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100" 
                title="Supprimer le pan"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1 text-gray-400"><span>Hauteur</span><span className="text-white">{seg.height}m</span></div>
                <input
                  type="range" min="0.5" max="10" step="0.1" value={seg.height}
                  onPointerDown={onActionStart}
                  onChange={(e) => onUpdateSegment(seg.id, { height: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1 text-gray-400">
                  <span>Inclinaison</span>
                  <span className={clsx("font-mono", seg.angle > 0 ? "text-orange-400" : seg.angle < 0 ? "text-blue-400" : "text-white")}>
                    {seg.angle}°
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-gray-600">-15°</span>
                  <input
                    type="range" min="-15" max="85" step="5" value={seg.angle}
                    onPointerDown={onActionStart}
                    onChange={(e) => onUpdateSegment(seg.id, { angle: parseFloat(e.target.value) })}
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
  );
};
