
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WallConfig, PlacedHold, WallMetadata, UserProfile } from '../../types';
import { Share2, GitFork, Calendar, Heart, MessageSquare, Edit3, Tag, AlignLeft, Hash, Trophy, ChevronRight } from 'lucide-react';
import { SocialFeed } from './components/SocialFeed';
import { ViewerHeader } from './components/ViewerHeader';
import { ViewerStats } from './components/ViewerStats';
import { api } from '../../core/api';
import { auth } from '../../core/auth';
import { AuthModal } from '../../components/auth/AuthModal';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { ActionWarning } from '../../components/ui/ActionWarning';
import { SEO } from '../../components/SEO';

interface ViewerPanelProps {
  wallId: string;
  metadata: WallMetadata;
  config: WallConfig;
  holds: PlacedHold[];
  onHome: () => void;
  onRemix: () => void; 
  onShare: () => void;
  onEdit?: () => void;
}

export const ViewerPanel: React.FC<ViewerPanelProps> = ({ wallId, metadata, config, holds, onHome, onRemix, onShare, onEdit }) => {
  const navigate = useNavigate();
  const [socialStats, setSocialStats] = useState({ likes: 0, hasLiked: false });
  const [showAuth, setShowAuth] = useState(false);
  const [warning, setWarning] = useState<{ x: number, y: number, message: string } | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
  
  const displayAvatarUrl = authorProfile?.avatar_url || metadata.authorAvatarUrl;
  const displayName = authorProfile?.display_name || metadata.authorName || "Anonyme";

  const dateStr = new Date(metadata.timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const validHolds = holds ? holds.filter(h => h && h.id) : [];
  const validSegments = config.segments ? config.segments.filter(s => s && s.id) : [];

  const totalHolds = validHolds.length;
  const maxOverhang = validSegments.length > 0 ? Math.max(...validSegments.map(s => s.angle)) : 0;

  const totalClimbingLength = validSegments.reduce((acc, s) => acc + s.height, 0);
  const totalVerticalHeight = validSegments.reduce((acc, s) => {
    const rad = (s.angle * Math.PI) / 180;
    return acc + (s.height * Math.cos(rad));
  }, 0);

  useEffect(() => {
      auth.getUser().then(user => {
          if (user && metadata.authorId && user.id === metadata.authorId) {
              setIsOwner(true);
          } else {
              setIsOwner(false);
          }
          if (!wallId) return;
          api.getWallSocialStatus(wallId, user?.id).then(setSocialStats);
      });

      if (metadata.authorId) {
          api.getProfile(metadata.authorId).then(profile => {
              if (profile) setAuthorProfile(profile);
          });
      }
  }, [wallId, metadata.authorId]);

  const handleLikeWall = async (e: React.MouseEvent) => {
      const user = await auth.getUser();
      if (!user) {
          setShowAuth(true);
          return;
      }
      
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

      const { error } = await api.toggleWallLike(wallId, user.id);
      
      if (error) {
           setSocialStats(prev => ({
                hasLiked: wasLiked,
                likes: Math.max(0, prev.likes + (wasLiked ? 1 : -1))
           }));
           setWarning({ x: e.clientX, y: e.clientY, message: "Erreur lors du like." });
      } else {
           const updated = await api.getWallSocialStatus(wallId, user.id);
           setSocialStats(updated);
      }
  };

  const handleAuthorClick = () => {
    if (metadata.authorId) {
        navigate(`/profile/${metadata.authorId}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white border-r border-gray-800 w-80 shadow-xl z-10 overflow-hidden relative">
      <SEO 
        title={metadata.name || "Mur Sans Nom"} 
        description={metadata.description || `Découvrez ce mur d'escalade 3D créé par ${displayName}. ${totalHolds} prises, ${totalVerticalHeight.toFixed(1)}m de haut.`}
        image={metadata.thumbnail}
        author={displayName}
        publishedTime={metadata.timestamp}
        type="article"
      />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
      
      {warning && (
        <ActionWarning 
            x={warning.x} 
            y={warning.y} 
            message={warning.message} 
            onClose={() => setWarning(null)} 
        />
      )}

      <ViewerHeader title={metadata.name} onHome={onHome} />

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* GRADES & LIKE */}
        <div className="flex gap-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-2 text-center shadow-lg">
                    <span className="block text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">GRADE FR</span>
                    <span className="text-base font-black text-white">{metadata.gradeFr || '6a'}</span>
                </div>
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-2 text-center shadow-lg">
                    <span className="block text-[8px] font-black text-blue-500 uppercase tracking-widest mb-0.5">V-SCALE</span>
                    <span className="text-base font-black text-white">{metadata.gradeV || 'V3'}</span>
                </div>
            </div>
            <button 
                onClick={(e) => handleLikeWall(e)}
                className={`px-4 rounded-xl font-bold text-sm transition-all flex flex-col items-center justify-center min-w-[64px] border ${socialStats.hasLiked ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-gray-800 hover:bg-gray-750 text-gray-300 border-gray-700'}`}
            >
                <Heart size={18} fill={socialStats.hasLiked ? "currentColor" : "none"} className={socialStats.hasLiked ? "animate-bounce-short" : ""} />
                <span className="text-[10px] font-black mt-0.5">{socialStats.likes}</span>
            </button>
        </div>

        {/* TYPE BADGE */}
        <div className="flex items-center gap-2 px-1">
            {metadata.climbingType === 'boulder' ? (
                <div className="flex-1 flex items-center gap-2 py-2 px-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 shadow-sm">
                    <Hash size={14} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">Catégorie : BLOC</span>
                </div>
            ) : (
                <div className="flex-1 flex items-center gap-2 py-2 px-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 shadow-sm">
                    <Trophy size={14} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">Catégorie : VOIE</span>
                </div>
            )}
        </div>

        <div className="space-y-6">
            {/* REMIX INFO */}
            {metadata.parentId && (
                <section className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-3 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
                        <GitFork size={12} />
                        <span>PROJET REMIXÉ</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-tight">
                        Inspiré par <span className="text-white font-bold">{metadata.parentName}</span> de <span className="text-blue-400 font-bold">{metadata.parentAuthorName}</span>.
                    </p>
                </section>
            )}

            {/* DESCRIPTION */}
            {metadata.description && (
                <section className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                        <AlignLeft size={12} />
                        <span>Le Projet</span>
                    </div>
                    <div className="bg-gray-800/30 border border-white/5 rounded-2xl p-4 shadow-inner">
                        <p className="text-sm text-gray-300 leading-relaxed italic whitespace-pre-wrap font-medium">
                            "{metadata.description}"
                        </p>
                    </div>
                </section>
            )}

            {/* STYLES */}
            {metadata.styles && metadata.styles.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                        <Tag size={12} />
                        <span>Styles & Caractéristiques</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {metadata.styles.map(style => (
                            <span key={style} className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 rounded-full text-[10px] font-bold uppercase tracking-tighter hover:text-white hover:border-gray-500 transition-colors cursor-default">
                                {style}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* AUTHOR & DATE */}
            <section 
                className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50 space-y-4 cursor-pointer hover:bg-gray-800 transition-all group/author hover:shadow-lg"
                onClick={handleAuthorClick}
            >
                <div className="flex items-center gap-3 text-sm text-gray-300">
                    <UserAvatar userId={metadata.authorId} url={displayAvatarUrl} name={displayName} size="md" />
                    <div className="min-w-0 flex-1">
                        <span className="block text-[10px] text-gray-500 uppercase font-black">Route Setter</span>
                        <span className="font-bold text-white truncate block group-hover/author:underline group-hover/author:text-blue-400 transition-colors">{displayName}</span>
                    </div>
                    <ChevronRight size={14} className="text-gray-600 group-hover/author:text-blue-400 transition-colors" />
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300 pt-2 border-t border-white/5">
                    <div className="p-2 bg-gray-700/50 rounded-lg flex-shrink-0"><Calendar size={14} /></div>
                    <div>
                        <span className="block text-[10px] text-gray-500 uppercase font-black">Publication</span>
                        <span className="font-medium text-xs text-gray-400">{dateStr}</span>
                    </div>
                </div>
            </section>

            <ViewerStats 
                totalHolds={totalHolds} 
                totalSegments={validSegments.length}
                totalVerticalHeight={totalVerticalHeight}
                totalClimbingLength={totalClimbingLength}
                width={config.width}
                maxOverhang={maxOverhang}
            />

            <section className="pt-6 border-t border-gray-800">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                    <MessageSquare size={12} />
                    <span>Commentaires & Bétas</span>
                </div>
                <SocialFeed wallId={wallId} onRequestAuth={() => setShowAuth(true)} />
            </section>
        </div>

      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-950 space-y-3">
        {isOwner && (
            <button 
                onClick={onEdit} 
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center space-x-2 font-bold transition-all shadow-lg hover:shadow-blue-900/20 transform hover:-translate-y-0.5"
            >
                <Edit3 size={18} />
                <span>Modifier mon mur</span>
            </button>
        )}
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
