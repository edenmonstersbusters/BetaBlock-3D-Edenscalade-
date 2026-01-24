
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera } from 'lucide-react';

interface UserAvatarProps {
  userId?: string | null;
  url?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  editable?: boolean;
  onUpload?: (file: File) => void;
  loading?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  userId,
  url, 
  name = "Anon", 
  size = 'md', 
  className = "",
  editable = false,
  onUpload,
  loading = false
}) => {
  const navigate = useNavigate();
  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-20 h-20 text-xl",
    xl: "w-32 h-32 md:w-40 md:h-40 text-4xl"
  };

  const gradientStyle = useMemo(() => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue1 = hash % 360;
    const hue2 = (hash + 60) % 360;
    return {
      background: `linear-gradient(135deg, hsl(${hue1}, 70%, 50%) 0%, hsl(${hue2}, 80%, 60%) 100%)`,
    };
  }, [name]);

  const initials = name.slice(0, 2).toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUpload) {
      onUpload(e.target.files[0]);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (userId && !editable) {
        e.stopPropagation();
        navigate(`/profile/${userId}`);
    }
  };

  return (
    <div 
      className={`relative group shrink-0 ${userId && !editable ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleClick}
    >
      <div 
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center font-bold text-white shadow-lg border border-white/10 relative z-10`}
        style={url ? {} : gradientStyle}
      >
        {url ? (
          <img src={url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
        
        {loading && (
             <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                 <div className="w-1/2 h-1/2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
             </div>
        )}
      </div>

      {editable && !loading && (
        <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full z-20 backdrop-blur-[1px]">
          <Camera className="text-white drop-shadow-md" size={size === 'xl' ? 32 : 16} />
          <input 
            type="file" 
            className="hidden" 
            accept="image/jpeg,image/png,image/webp" 
            onChange={handleFileChange}
          />
        </label>
      )}
    </div>
  );
};
