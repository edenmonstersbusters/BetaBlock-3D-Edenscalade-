import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Box, PlayCircle, GitFork } from 'lucide-react';
import { UserAvatar } from '../../components/ui/UserAvatar';

interface WallCardProps {
  id: string;
  name: string;
  createdAt: string;
  thumbnail?: string; 
  authorId?: string;
  authorName?: string; 
  authorAvatarUrl?: string; 
  onClick: () => void;
  // New props for remix
  isRemix?: boolean;
  parentName?: string;
}

export const WallCard: React.FC<WallCardProps> = ({ 
  id, name, createdAt, thumbnail, authorId, authorName, authorAvatarUrl, onClick,
  isRemix, parentName
}) => {
  const navigate = useNavigate();
  
  const gradientStyle = useMemo(() => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue1 = hash % 360;
    const hue2 = (hash + 40) % 360;
    return {
      background: `linear-gradient(135deg, hsl(${hue1}, 70%, 20%) 0%, hsl(${hue2}, 60%, 10%) 100%)`,
    };
  }, [id]);

  const dateStr = new Date(createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const handleAuthorClick = (e: React.MouseEvent) => {
    if (authorId) {
        e.stopPropagation();
        navigate(`/profile/${authorId}`);
    }
  };

  return (
    <div 
      onClick={onClick}
      className="group relative bg-gray-900 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 transform hover:-translate-y-1"
    >
      <div className="h-40 w-full relative overflow-hidden bg-gray-950">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        ) : (
          <div className="w-full h-full" style={gradientStyle}>
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
             <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
             <div className="absolute top-4 left-4 p-2 bg-black/30 backdrop-blur-md rounded-lg border border-white/10">
                <Box className="text-white/60 group-hover:text-blue-400 transition-colors" size={20} />
             </div>
          </div>
        )}

        {isRemix && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded flex items-center gap-1 shadow-lg z-10">
                <GitFork size={10} />
                <span>Remix</span>
            </div>
        )}

        {/* REPOSITIONNEMENT REMIX INFO SUR L'IMAGE */}
        {isRemix && parentName && (
             <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-6 z-10">
                 <div className="text-[10px] text-gray-300 flex items-center gap-1">
                     <GitFork size={10} className="rotate-180 flex-shrink-0 text-blue-400"/>
                     <span className="truncate">Inspiré de <span className="text-white font-medium">{parentName}</span></span>
                 </div>
             </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px] z-20">
            <div className="transform scale-75 group-hover:scale-100 transition-transform duration-300">
                <PlayCircle size={48} className="text-white drop-shadow-lg" />
            </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-100 truncate group-hover:text-blue-400 transition-colors mb-2">{name || "Mur Sans Nom"}</h3>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
            <div 
                className="flex items-center gap-2 font-medium text-gray-300 hover:text-white transition-colors cursor-pointer group/author"
                onClick={handleAuthorClick}
            >
                <UserAvatar 
                    userId={authorId}
                    url={authorAvatarUrl} 
                    name={authorName || "Anonyme"} 
                    size="xs" 
                />
                <span className="truncate max-w-[100px] block group-hover/author:underline">{authorName || "Anonyme"}</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
                <Clock size={12} />
                <span>{dateStr}</span>
            </div>
        </div>
      </div>

      <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500/30 rounded-xl pointer-events-none transition-colors z-30"></div>
    </div>
  );
};