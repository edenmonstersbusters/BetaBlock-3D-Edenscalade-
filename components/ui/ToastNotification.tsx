
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, MessageSquare, UserPlus, UserMinus, Box, BellRing, ThumbsUp } from 'lucide-react';
import { AppNotification } from '../../types';
import { UserAvatar } from './UserAvatar';
import { useNavigate } from 'react-router-dom';

interface ToastNotificationProps {
  notification: AppNotification;
  onDismiss: (id: string) => void;
  duration?: number;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ notification, onDismiss, duration = 6000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const navigate = useNavigate();

  const isUnfollow = notification.type === 'unfollow';

  useEffect(() => {
    const animFrame = requestAnimationFrame(() => setIsVisible(true));
    const timer = setTimeout(() => handleClose(), duration);
    return () => {
        clearTimeout(timer);
        cancelAnimationFrame(animFrame);
    };
  }, [duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onDismiss(notification.id), 500);
  };

  const handleClick = () => {
      if (notification.type === 'follow' || notification.type === 'unfollow') {
          navigate(`/profile/${notification.actor_id}`);
      } else if (notification.resource_id) {
          navigate(`/view/${notification.resource_id}`);
      }
      handleClose();
  };

  const getStyle = () => {
    switch(notification.type) {
        case 'follow': return { icon: <UserPlus size={14} />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', text: "vous suit." };
        case 'unfollow': return { icon: <UserMinus size={14} />, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', text: "ne vous suit plus." };
        case 'like_wall': return { icon: <Heart size={14} />, color: 'text-red-400 bg-red-500/10 border-red-500/20', text: "a aimé votre mur." };
        case 'like_comment': return { icon: <ThumbsUp size={14} />, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20', text: "a aimé votre com." };
        case 'comment': return { icon: <MessageSquare size={14} />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', text: "a commenté." };
        case 'new_wall': return { icon: <Box size={14} />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', text: "a publié un mur." };
        default: return { icon: <BellRing size={14} />, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', text: "Interaction." };
    }
  };

  const style = getStyle();

  return createPortal(
    <div 
      className={`fixed top-6 right-6 z-[9999] pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
        isVisible && !isClosing ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95'
      }`}
    >
      <div 
        className="relative w-80 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden cursor-pointer hover:bg-gray-800 transition-colors"
        onClick={handleClick}
      >
        <div className="p-4 flex items-center gap-4">
            {/* AVATAR PROPRE : Pas d'icône superposée ici */}
            <div className="shrink-0">
                <UserAvatar 
                    userId={null} 
                    url={notification.actor_avatar_url} 
                    name={notification.actor_name} 
                    size="md" 
                    className="shadow-lg border border-white/10"
                />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-white truncate">{notification.actor_name}</h4>
                    {/* ICONE DÉTACHÉE : À droite du nom, pas sur l'avatar */}
                    <div className={`p-1.5 rounded-lg border ${style.color}`}>
                        {style.icon}
                    </div>
                </div>
                
                <p className={`text-xs leading-snug truncate ${isUnfollow ? 'text-rose-300' : 'text-gray-400'}`}>
                    {notification.type === 'comment' && notification.text_content 
                        ? <span className="italic opacity-80">"{notification.text_content}"</span>
                        : style.text
                    }
                </p>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className="absolute top-2 right-2 text-gray-600 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            >
                <X size={14} />
            </button>
        </div>

        {/* Barre de temps */}
        <div 
            className={`absolute bottom-0 left-0 h-0.5 ${isUnfollow ? 'bg-rose-500' : 'bg-blue-500'} transition-all ease-linear w-full origin-left opacity-50`} 
            style={{ 
                width: isVisible ? '0%' : '100%',
                transitionDuration: `${duration}ms`
            }} 
        />
      </div>
    </div>,
    document.body
  );
};
