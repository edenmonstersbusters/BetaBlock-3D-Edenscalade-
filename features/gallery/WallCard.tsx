
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Box, PlayCircle, GitFork, Hash, Trophy } from 'lucide-react';
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
  isRemix?: boolean;
  parentName?: string;
  climbingType?: string;
  gradeFr?: string;
  styles?: string[];
}

export const WallCard: React.FC<WallCardProps> = ({ 
  id, name, createdAt, thumbnail, authorId, authorName, authorAvatarUrl, onClick,
  isRemix, parentName, climbingType, gradeFr, styles
}) => {
  const navigate = useNavigate();
  
  const gradientStyle = useMemo(() => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue1 = hash % 360;
    const hue2 = (hash + 40) % 360;
    return { background: `linear-gradient(135deg, hsl(${hue1}, 70%, 20%) 0%, hsl(${hue2}, 60%, 10%) 100%)` };
  }, [id]);

  return (
    <div onClick={onClick} className="group relative bg-gray-900 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 transform hover:-translate-y-1">
      <div className="h-40 w-full relative overflow-hidden bg-gray-950">
        {thumbnail ? <img src={thumbnail} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : (
          <div className="w-full h-full flex items-center justify-center" style={gradientStyle}>
             <Box className="text-white/20" size={48} />
          </div>
        )}

        <div className="absolute top-2 left-2 flex gap-1 z-10">
            {gradeFr && <div className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded shadow-lg">{gradeFr}</div>}
            {climbingType === 'boulder' ? <div className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black rounded flex items-center gap-1 shadow-lg"><Hash size={8}/>BLOC</div> : <div className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-black rounded flex items-center gap-1 shadow-lg"><Trophy size={8}/>VOIE</div>}
        </div>

        {isRemix && <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded flex items-center gap-1 shadow-lg z-10"><GitFork size={10} /><span>Remix</span></div>}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px] z-20">
            <PlayCircle size={48} className="text-white drop-shadow-lg" />
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-100 truncate group-hover:text-blue-400 transition-colors mb-2">{name || "Mur Sans Nom"}</h3>
        
        {styles && styles.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
                {styles.slice(0, 3).map(s => <span key={s} className="text-[8px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">{s}</span>)}
                {styles.length > 3 && <span className="text-[8px] text-gray-700">+{styles.length - 3}</span>}
            </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-gray-500">
            <div className="flex items-center gap-2 font-medium text-gray-300 hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${authorId}`); }}>
                <UserAvatar userId={authorId} url={authorAvatarUrl} name={authorName || "Anonyme"} size="xs" />
                <span className="truncate max-w-[80px]">{authorName || "Anonyme"}</span>
            </div>
            <div className="flex items-center gap-1 font-mono"><Clock size={10} /><span>{new Date(createdAt).toLocaleDateString()}</span></div>
        </div>
      </div>
    </div>
  );
};
