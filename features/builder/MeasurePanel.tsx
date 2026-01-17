
import React, { useMemo } from 'react';
import { Ruler, Info, Box, Target } from 'lucide-react';
import { PlacedHold, WallConfig } from '../../types';
import { resolveHoldWorldData } from '../../utils/geometry';
import * as THREE from 'three';

interface MeasurePanelProps {
  selectedHoldIds: string[];
  holds: PlacedHold[];
  config: WallConfig;
}

export const MeasurePanel: React.FC<MeasurePanelProps> = ({ selectedHoldIds, holds, config }) => {
  
  const measurement = useMemo(() => {
      if (selectedHoldIds.length !== 2) return null;
      const h1 = holds.find(h => h.id === selectedHoldIds[0]);
      const h2 = holds.find(h => h.id === selectedHoldIds[1]);
      if (!h1 || !h2) return null;

      const w1 = resolveHoldWorldData(h1, config);
      const w2 = resolveHoldWorldData(h2, config);
      if (!w1 || !w2) return null;

      const p1 = new THREE.Vector3(...w1.position);
      const p2 = new THREE.Vector3(...w2.position);

      const distance = p1.distanceTo(p2);
      const dx = Math.abs(p2.x - p1.x);
      const dy = Math.abs(p2.y - p1.y);
      const dz = Math.abs(p2.z - p1.z);

      return { distance, dx, dy, dz, h1, h2 };
  }, [selectedHoldIds, holds, config]);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* Header simple */}
        <section className="space-y-2">
           <div className="flex items-center space-x-2 text-sm font-medium text-yellow-500 uppercase tracking-wider">
               <Ruler size={14} /><span>Outils de Mesure</span>
           </div>
           <p className="text-xs text-gray-500 leading-relaxed">
             Mode Analyse activé. Sélectionnez deux prises sur le mur pour obtenir les dimensions précises entre leurs points d'ancrage.
           </p>
        </section>

        {/* Carte de Résultat */}
        {measurement ? (
          <div className="bg-gray-800 rounded-2xl p-6 border-2 border-yellow-500/30 shadow-2xl animate-in slide-in-from-right duration-300">
             
             {/* Distance Principale */}
             <div className="text-center mb-6">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Distance Directe</span>
                <div className="text-5xl font-black text-white tracking-tighter">
                   {measurement.distance.toFixed(2)}<span className="text-lg text-gray-500 ml-1">m</span>
                </div>
             </div>

             {/* Deltas Vectoriels */}
             <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-gray-900/50 p-2 rounded-lg text-center border border-white/5">
                   <div className="text-[9px] text-gray-500 uppercase font-bold">Largeur (X)</div>
                   <div className="text-sm font-mono font-bold text-blue-400">{measurement.dx.toFixed(2)}m</div>
                </div>
                <div className="bg-gray-900/50 p-2 rounded-lg text-center border border-white/5">
                   <div className="text-[9px] text-gray-500 uppercase font-bold">Hauteur (Y)</div>
                   <div className="text-sm font-mono font-bold text-emerald-400">{measurement.dy.toFixed(2)}m</div>
                </div>
                <div className="bg-gray-900/50 p-2 rounded-lg text-center border border-white/5">
                   <div className="text-[9px] text-gray-500 uppercase font-bold">Prof. (Z)</div>
                   <div className="text-sm font-mono font-bold text-purple-400">{measurement.dz.toFixed(2)}m</div>
                </div>
             </div>

             {/* Points sélectionnés */}
             <div className="space-y-2">
                 <div className="flex items-center justify-between text-xs bg-gray-900/30 p-2 rounded border border-white/5">
                    <span className="flex items-center gap-2 text-gray-400"><Target size={12}/> Point A</span>
                    <span className="font-mono text-white">Prise #{holds.indexOf(measurement.h1) + 1}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs bg-gray-900/30 p-2 rounded border border-white/5">
                    <span className="flex items-center gap-2 text-gray-400"><Target size={12}/> Point B</span>
                    <span className="font-mono text-white">Prise #{holds.indexOf(measurement.h2) + 1}</span>
                 </div>
             </div>

          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center animate-pulse">
              <Box size={32} className="mx-auto mb-3 text-yellow-500/50" />
              <h3 className="text-sm font-bold text-yellow-200 mb-1">En attente de sélection</h3>
              <p className="text-xs text-yellow-500/70">
                 {selectedHoldIds.length === 0 ? "Cliquez sur une première prise." : "Cliquez sur une seconde prise."}
              </p>
          </div>
        )}

        <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg flex gap-3 items-start">
            <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-200 leading-relaxed">
               Le mode mesure verrouille le déplacement des prises pour éviter les modifications accidentelles. Changez d'onglet pour reprendre l'édition.
            </p>
        </div>

      </div>
    </div>
  );
};
