
import React from 'react';
import { Layers, Box, X, GitFork, ArrowRight } from 'lucide-react';

interface RemixModalProps {
  wallName: string;
  authorName: string;
  onClose: () => void;
  onSelect: (mode: 'structure' | 'holds') => void;
}

export const RemixModal: React.FC<RemixModalProps> = ({ wallName, authorName, onClose, onSelect }) => {
  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                <GitFork size={20} />
            </div>
            <h2 className="text-2xl font-black text-white">Remixer ce projet</h2>
          </div>
          <p className="text-sm text-gray-400 mb-8">
            Vous allez créer une nouvelle version de <span className="text-white font-bold">{wallName}</span> par <span className="text-blue-400 font-bold">{authorName}</span>. 
            Choisissez votre spécialité :
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OPTION STRUCTURE */}
            <button 
              onClick={() => onSelect('structure')}
              className="group flex flex-col items-start p-6 bg-gray-800 hover:bg-blue-600/10 border border-gray-700 hover:border-blue-500/50 rounded-2xl transition-all text-left"
            >
              <div className="p-3 bg-blue-500 text-white rounded-xl mb-4 group-hover:scale-110 transition-transform">
                <Layers size={24} />
              </div>
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                Remix Architecte
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-300">
                Gardez les prises actuelles mais modifiez la forme du mur (angles, hauteurs).
              </p>
              <div className="mt-4 px-2 py-1 bg-gray-900 rounded text-[10px] font-mono text-gray-500 group-hover:text-blue-400">
                PRISES VERROUILLÉES
              </div>
            </button>

            {/* OPTION PRISES */}
            <button 
              onClick={() => onSelect('holds')}
              className="group flex flex-col items-start p-6 bg-gray-800 hover:bg-emerald-600/10 border border-gray-700 hover:border-emerald-500/50 rounded-2xl transition-all text-left"
            >
              <div className="p-3 bg-emerald-500 text-white rounded-xl mb-4 group-hover:scale-110 transition-transform">
                <Box size={24} />
              </div>
              <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                Remix Ouvreur
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-300">
                Gardez la structure du mur telle quelle mais créez vos propres mouvements.
              </p>
              <div className="mt-4 px-2 py-1 bg-gray-900 rounded text-[10px] font-mono text-gray-500 group-hover:text-emerald-400">
                MUR VERROUILLÉ
              </div>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              L'attribution originale sera conservée en permanence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
