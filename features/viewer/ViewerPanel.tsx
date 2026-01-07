
import React from 'react';
import { WallConfig, PlacedHold, WallMetadata } from '../../types';
import { Home, Share2, Copy, GitFork, User, Calendar, Ruler, Layers, Box } from 'lucide-react';

interface ViewerPanelProps {
  metadata: WallMetadata;
  config: WallConfig;
  holds: PlacedHold[];
  onHome: () => void;
  onRemix: () => void;
  onShare: () => void;
}

export const ViewerPanel: React.FC<ViewerPanelProps> = ({ metadata, config, holds, onHome, onRemix, onShare }) => {
  const dateStr = new Date(metadata.timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  // Calculs statistiques
  const totalHolds = holds.length;
  const maxSegmentHeight = Math.max(...config.segments.map(s => s.height));
  const maxOverhang = Math.max(...config.segments.map(s => s.angle));

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white border-r border-gray-800 w-80 shadow-xl z-10 overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
             <button onClick={onHome} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-blue-400 transition-colors" title="Retour à la Galerie">
                <Home size={20} />
             </button>
             <div className="overflow-hidden">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent truncate">
                    {metadata.name || "Mur Sans Nom"}
                </h1>
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span className="uppercase tracking-wider">SPECTATEUR</span>
                </div>
             </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Auteur & Infos */}
        <section className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="p-2 bg-gray-700 rounded-full"><User size={16} /></div>
                <div>
                    <span className="block text-xs text-gray-500 uppercase">Créé par</span>
                    <span className="font-bold text-white">{metadata.authorName || "Anonyme"}</span>
                </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="p-2 bg-gray-700 rounded-full"><Calendar size={16} /></div>
                <div>
                    <span className="block text-xs text-gray-500 uppercase">Date</span>
                    <span className="font-medium">{dateStr}</span>
                </div>
            </div>
        </section>

        {/* Statistiques */}
        <section className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider"><Ruler size={14} /><span>Analyse du Mur</span></div>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <div className="text-gray-500 text-[10px] uppercase mb-1 flex items-center gap-1"><Box size={10} /> Prises</div>
                    <div className="text-2xl font-mono text-white">{totalHolds}</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <div className="text-gray-500 text-[10px] uppercase mb-1 flex items-center gap-1"><Layers size={10} /> Pans</div>
                    <div className="text-2xl font-mono text-white">{config.segments.length}</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <div className="text-gray-500 text-[10px] uppercase mb-1">Largeur</div>
                    <div className="text-lg font-mono text-blue-400">{config.width}m</div>
                </div>
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <div className="text-gray-500 text-[10px] uppercase mb-1">Max Dévers</div>
                    <div className="text-lg font-mono text-orange-400">{maxOverhang}°</div>
                </div>
            </div>
        </section>

      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t border-gray-800 bg-gray-950 space-y-3">
        <button 
            onClick={onRemix} 
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg flex items-center justify-center space-x-2 font-bold transition-all shadow-lg hover:shadow-blue-900/20 transform hover:-translate-y-0.5"
        >
            <GitFork size={18} />
            <span>Remixer ce mur</span>
        </button>
        <button 
            onClick={onShare} 
            className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg flex items-center justify-center space-x-2 font-medium transition-colors border border-gray-700"
        >
            <Share2 size={16} />
            <span>Partager</span>
        </button>
      </div>
    </div>
  );
};
