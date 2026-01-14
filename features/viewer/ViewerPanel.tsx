
import React, { useState, useEffect } from 'react';
import { WallConfig, PlacedHold, WallMetadata } from '../../types';
import { Home, Share2, GitFork, Calendar, Ruler, Layers, Box, Heart, MessageSquare, ArrowUp, Activity } from 'lucide-react';
import { SocialFeed } from './components/SocialFeed';
import { api } from '../../core/api';
import { auth } from '../../core/auth';
import { AuthModal } from '../../components/auth/AuthModal';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { ActionWarning } from '../../components/ui/ActionWarning';

interface ViewerPanelProps {
  wallId: string;
  metadata: WallMetadata;
  config: WallConfig;
  holds: PlacedHold[];
  onHome: () => void;
  onRemix: () => void;
  onShare: () => void;
}

export const ViewerPanel: React.FC<ViewerPanelProps> = ({ wallId, metadata, config, holds, onHome, onRemix, onShare }) => {
  const [socialStats, setSocialStats] = useState({ likes: 0, hasLiked: false });
  const [showAuth, setShowAuth] = useState(false);
  const [warning, setWarning] = useState<{ x: number, y: number, message: string } | null>(null);
  
  // État local pour l'avatar, avec fallback si manquant dans les métadonnées
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState<string | undefined | null>(metadata.authorAvatarUrl);

  const dateStr = new Date(metadata.timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const totalHolds = holds.length;
  const maxOverhang = Math.max(...config.segments.map(s => s.angle));

  // --- CALCULS GÉOMÉTRIQUES ---
  // Linéaire de grimpe : Somme des hauteurs réelles des pans
  const totalClimbingLength = config.segments.reduce((acc, s) => acc + s.height, 0);
  
  // Hauteur verticale (fil à plomb) : Somme de H * Cos(angle)
  const totalVerticalHeight = config.segments.reduce((acc, s) => {
    const rad = (s.angle * Math.PI) / 180;
    return acc + (s.height * Math.cos(rad));
  }, 0);

  useEffect(() => {
      if (!wallId) return;
      auth.getUser().then(user => {
          api.getWallSocialStatus(wallId, user?.id).then(setSocialStats);
      });
  }, [wallId]);

  // Si l'avatar manque dans les métadonnées (vieux murs), on essaie de le récupérer via le profil auteur
  useEffect(() => {
      if (!metadata.authorAvatarUrl && metadata.authorId) {
          api.getProfile(metadata.authorId).then(profile => {
              if (profile?.avatar_url) {
                  setDisplayAvatarUrl(profile.avatar_url);
              }
          });
      } else {
          setDisplayAvatarUrl(metadata.authorAvatarUrl);
      }
  }, [metadata.authorAvatarUrl, metadata.authorId]);

  const handleLikeWall = async (e: React.MouseEvent) => {
      const user = await auth.getUser();
      if (!user) {
          setShowAuth(true);
          return;
      }
      
      // Bloquer si c'est l'auteur
      if (user.id === metadata.authorId) {
          setWarning({ 
              x: e.clientX, 
              y: e.clientY, 
              message: "Vous ne pouvez pas liker votre mur !" 
          });
          return;
      }

      const wasLiked = socialStats.hasLiked;
      setSocialStats(prev => ({
          hasLiked: !wasLiked,
          likes: Math.max(0, prev.likes + (wasLiked ? -1 : 1))
      }));

      await api.toggleWallLike(wallId, user.id);
      const updated = await api.getWallSocialStatus(wallId, user.id);
      setSocialStats(updated);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white border-r border-gray-800 w-80 shadow-xl z-10 overflow-hidden relative">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
      
      {warning && (
        <ActionWarning 
            x={warning.x} 
            y={warning.y} 
            message={warning.message} 
            onClose={() => setWarning(null)} 
        />
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
             <button onClick={onHome} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-blue-400 flex-shrink-0 transition-colors" title="Retour à la Galerie">
                <Home size={20} />
             </button>
             <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-blue-400 truncate block w-full leading-tight" title={metadata.name}>
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
        <div className="flex items-center">
            <button 
                onClick={(e) => handleLikeWall(e)}
                className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-sm transition-all ${socialStats.hasLiked ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'}`}
            >
                <Heart size={18} fill={socialStats.hasLiked ? "currentColor" : "none"} className={socialStats.hasLiked ? "animate-bounce-short" : ""} />
                <span>{socialStats.likes} {socialStats.likes > 1 ? 'Likes' : 'Like'}</span>
            </button>
        </div>

        <div className="space-y-6">
            {/* Auteur & Infos */}
            <section className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-300">
                    <UserAvatar url={displayAvatarUrl} name={metadata.authorName} size="md" />
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
                    
                    {/* HAUTEUR VERTICALE */}
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <div className="text-gray-500 text-[10px] uppercase mb-1 flex items-center gap-1"><ArrowUp size={10} /> Hauteur</div>
                        <div className="text-lg font-mono text-emerald-400">{totalVerticalHeight.toFixed(2)}m</div>
                    </div>

                    {/* LINÉAIRE DE GRIMPE */}
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <div className="text-gray-500 text-[10px] uppercase mb-1 flex items-center gap-1"><Activity size={10} /> Linéaire</div>
                        <div className="text-lg font-mono text-purple-400">{totalClimbingLength.toFixed(2)}m</div>
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

            {/* Discussion Intégrée */}
            <section className="pt-6 border-t border-gray-800">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                    <MessageSquare size={12} />
                    <span>Commentaires & Bétas</span>
                </div>
                <SocialFeed wallId={wallId} onRequestAuth={() => setShowAuth(true)} />
            </section>
        </div>

      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t border-gray-800 bg-gray-950 space-y-3">
        <button 
            onClick={onRemix} 
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg flex items-center justify-center space-x-2 font-bold transition-all shadow-lg hover:shadow-blue-900/20 transform hover:-translate-y-0.5"
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
