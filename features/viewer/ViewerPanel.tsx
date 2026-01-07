
import React, { useState, useEffect } from 'react';
import { WallConfig, PlacedHold, WallMetadata } from '../../types';
import { Home, Share2, GitFork, User, Calendar, Ruler, Layers, Box, Heart, MessageSquare } from 'lucide-react';
import { SocialFeed } from './components/SocialFeed';
import { api } from '../../core/api';
import { auth } from '../../core/auth';
import { AuthModal } from '../../components/auth/AuthModal';

interface ViewerPanelProps {
  metadata: WallMetadata;
  config: WallConfig;
  holds: PlacedHold[];
  onHome: () => void;
  onRemix: () => void;
  onShare: () => void;
}

export const ViewerPanel: React.FC<ViewerPanelProps> = ({ metadata, config, holds, onHome, onRemix, onShare }) => {
  const [socialStats, setSocialStats] = useState({ likes: 0, hasLiked: false });
  const [showComments, setShowComments] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const wallId = window.location.hash.split('/').pop() || '';

  const dateStr = new Date(metadata.timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const totalHolds = holds.length;
  const maxSegmentHeight = Math.max(...config.segments.map(s => s.height));
  const maxOverhang = Math.max(...config.segments.map(s => s.angle));

  useEffect(() => {
      if (!wallId) return;
      auth.getUser().then(user => {
          api.getWallSocialStatus(wallId, user?.id).then(setSocialStats);
      });
  }, [wallId]);

  const handleLikeWall = async () => {
      const user = await auth.getUser();
      if (!user) {
          setShowAuth(true);
          return;
      }
      
      const wasLiked = socialStats.hasLiked;
      setSocialStats(prev => ({
          hasLiked: !wasLiked,
          likes: Math.max(0, prev.likes + (wasLiked ? -1 : 1))
      }));

      await api.toggleWallLike(wallId, user.id);
      // Re-sync pour s'assurer du compte exact
      const updated = await api.getWallSocialStatus(wallId, user.id);
      setSocialStats(updated);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white border-r border-gray-800 w-80 shadow-xl z-10 overflow-hidden relative">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
      
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
             <button onClick={onHome} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-blue-400 flex-shrink-0 transition-colors" title="Retour à la Galerie">
                <Home size={20} />
             </button>
             {/* Gestion du débordement de titre */}
             <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent truncate block w-full leading-tight" title={metadata.name}>
                    {metadata.name || "Mur Sans Nom"}
                </h1>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1">
                    <span className="uppercase tracking-wider">SPECTATEUR</span>
                </div>
             </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* Social Actions Header */}
        <div className="flex items-center justify-between gap-2">
            <button 
                onClick={handleLikeWall}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-sm transition-all ${socialStats.hasLiked ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'}`}
            >
                <Heart size={18} fill={socialStats.hasLiked ? "currentColor" : "none"} className={socialStats.hasLiked ? "animate-bounce-short" : ""} />
                <span>{socialStats.likes}</span>
            </button>
            <button 
                onClick={() => setShowComments(!showComments)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-sm transition-all border ${showComments ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'}`}
            >
                <MessageSquare size={18} />
                <span>{showComments ? 'Fermer' : 'Discussion'}</span>
            </button>
        </div>

        {showComments ? (
            <div className="animate-in slide-in-from-right duration-300 min-h-[300px]">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                    <MessageSquare size={12} />
                    <span>Commentaires & Bétas</span>
                </div>
                <SocialFeed wallId={wallId} onRequestAuth={() => setShowAuth(true)} />
            </div>
        ) : (
            <div className="animate-in slide-in-from-left duration-300 space-y-6">
                {/* Auteur & Infos */}
                <section className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="p-2 bg-gray-700 rounded-full flex-shrink-0"><User size={16} /></div>
                        <div className="min-w-0 flex-1">
                            <span className="block text-xs text-gray-500 uppercase">Créé par</span>
                            <span className="font-bold text-white truncate block">{metadata.authorName || "Anonyme"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="p-2 bg-gray-700 rounded-full flex-shrink-0"><Calendar size={16} /></div>
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
        )}

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
