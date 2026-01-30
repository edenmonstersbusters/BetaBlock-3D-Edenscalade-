
import React from 'react';
import { Ruler, Box, Layers, ArrowUp, Activity } from 'lucide-react';

interface ViewerStatsProps {
    totalHolds: number;
    totalSegments: number;
    totalVerticalHeight: number;
    totalClimbingLength: number;
    width: number;
    maxOverhang: number;
}

export const ViewerStats: React.FC<ViewerStatsProps> = ({ 
    totalHolds, totalSegments, totalVerticalHeight, totalClimbingLength, width, maxOverhang 
}) => {
    return (
        <section className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider">
                <Ruler size={14} /><span>Analyse du Mur</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <div className="text-gray-500 text-[10px] uppercase mb-1 flex items-center gap-1"><Box size={10} /> Prises</div>
                    <div className="text-2xl font-mono text-white">{totalHolds}</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <div className="text-gray-500 text-[10px] uppercase mb-1 flex items-center gap-1"><Layers size={10} /> Pans</div>
                    <div className="text-2xl font-mono text-white">{totalSegments}</div>
                </div>
                
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <div className="text-gray-500 text-[10px] uppercase mb-1 flex items-center gap-1"><ArrowUp size={10} /> Hauteur</div>
                    <div className="text-lg font-mono text-emerald-400">{totalVerticalHeight.toFixed(2)}m</div>
                </div>

                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <div className="text-gray-500 text-[10px] uppercase mb-1 flex items-center gap-1"><Activity size={10} /> Linéaire</div>
                    <div className="text-lg font-mono text-purple-400">{totalClimbingLength.toFixed(2)}m</div>
                </div>

                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <div className="text-gray-500 text-[10px] uppercase mb-1">Largeur</div>
                    <div className="text-lg font-mono text-blue-400">{width}m</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <div className="text-gray-500 text-[10px] uppercase mb-1">Max Dévers</div>
                    <div className="text-lg font-mono text-orange-400">{maxOverhang}°</div>
                </div>
            </div>
        </section>
    );
};
