
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, MessageCircle, UserPlus, UserMinus, Box, BellRing, ThumbsUp } from 'lucide-react';
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
    // Petit délai pour laisser le temps au DOM de monter avant l'animation
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

  const getConfig = () => {
    switch(notification.type) {
        case 'follow': 
            return { 
                icon: <UserPlus size={12} strokeWidth={3} />, 
                badgeBg: 'bg-blue-500', 
                text: <span>vous suit désormais.</span> 
            };
        case 'unfollow': 
            return { 
                icon: <UserMinus size={12} strokeWidth={3} />, 
                badgeBg: 'bg-gray-500', 
                text: <span>ne vous suit plus.</span> 
            };
        case 'like_wall': 
            return { 
                icon: <Heart size={12} fill="currentColor" />, 
                badgeBg: 'bg-rose-500', 
                text: <span>a aimé votre mur <span className="font-bold text-white">{notification.resource_name}</span>.</span> 
            };
        case 'like_comment': 
            return { 
                icon: <ThumbsUp size={12} fill="currentColor" />, 
                badgeBg: 'bg-pink-500', 
                text: <span>a aimé votre commentaire.</span> 
            };
        case 'comment': 
            return { 
                icon: <MessageCircle size={12} fill="currentColor" />, 
                badgeBg: 'bg-emerald-500', 
                text: <span>a commenté <span className="font-bold text-white">{notification.resource_name}</span>.</span> 
            };
        case 'new_wall': 
            return { 
                icon: <Box size={12} strokeWidth={3} />, 
                badgeBg: 'bg-purple-500', 
                text: <span>a publié <span className="font-bold text-white">{notification.resource_name}</span>.</span> 
            };
        default: 
            return { 
                icon: <BellRing size={12} />, 
                badgeBg: 'bg-gray-500', 
                text: <span>Nouvelle interaction.</span> 
            };
    }
  };

  const config = getConfig();

  return createPortal(
    <div 
      className={`fixed top-6 right-6 z-[9999] pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
        isVisible && !isClosing ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95'
      }`}
    >
      <div 
        className="relative w-80 bg-gray-950/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.8)] overflow-hidden cursor-pointer hover:bg-gray-900 transition-colors group"
        onClick={handleClick}
      >
        <div className="p-4 flex items-start gap-3">
            {/* AVATAR AVEC BADGE */}
            <div className="shrink-0 relative mt-1">
                <UserAvatar 
                    userId={null} 
                    url={notification.actor_avatar_url} 
                    name={notification.actor_name} 
                    size="md" 
                    className="shadow-md"
                />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${config.badgeBg} text-white rounded-full flex items-center justify-center border-2 border-gray-950 shadow-sm`}>
                    {config.icon}
                </div>
            </div>
            
            <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className="text-sm font-bold text-white truncate">{notification.actor_name}</h4>
                    <span className="text-[10px] text-gray-500 font-mono">Maintenant</span>
                </div>
                
                <p className="text-xs text-gray-300 leading-snug">
                    {config.text}
                </p>

                {/* PREVIEW DU COMMENTAIRE */}
                {notification.type === 'comment' && notification.text_content && (
                    <div className="mt-2 pl-2 border-l-2 border-gray-700 text-xs text-gray-400 italic line-clamp-2">
                        "{notification.text_content}"
                    </div>
                )}
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className="absolute top-2 right-2 text-gray-600 hover:text-white transition-colors p-1 rounded-full opacity-0 group-hover:opacity-100"
            >
                <X size={14} />
            </button>
        </div>

        {/* Barre de temps */}
        <div 
            className={`absolute bottom-0 left-0 h-0.5 ${config.badgeBg} transition-all ease-linear w-full origin-left opacity-70`} 
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
