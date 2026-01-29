
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, MessageSquare, UserPlus, UserMinus, Box, BellRing } from 'lucide-react';
import { Notification } from '../../types';
import { UserAvatar } from './UserAvatar';
import { useNavigate } from 'react-router-dom';

interface ToastNotificationProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  duration?: number;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ notification, onDismiss, duration = 6000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const navigate = useNavigate();

  const isUnfollow = notification.type === 'unfollow';

  useEffect(() => {
    // Animation d'entrée
    requestAnimationFrame(() => setIsVisible(true));
    const timer = setTimeout(() => handleClose(), duration);
    return () => clearTimeout(timer);
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

  // Icônes et Couleurs par type
  const getStyle = () => {
    switch(notification.type) {
        case 'follow': return { icon: <UserPlus size={16} />, color: 'bg-blue-600', text: "vous suit désormais." };
        case 'unfollow': return { icon: <UserMinus size={16} />, color: 'bg-rose-600', text: "ne vous suit plus." };
        case 'like_wall': return { icon: <Heart size={16} />, color: 'bg-red-500', text: "a aimé votre mur." };
        case 'comment': return { icon: <MessageSquare size={16} />, color: 'bg-emerald-500', text: "a commenté votre mur." };
        case 'new_wall': return { icon: <Box size={16} />, color: 'bg-purple-600', text: "a publié un nouveau mur." };
        default: return { icon: <BellRing size={16} />, color: 'bg-gray-700', text: "Nouvelle interaction." };
    }
  };

  const style = getStyle();

  return createPortal(
    <div 
      className={`fixed top-6 right-6 z-[9999] pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] transform ${
        isVisible && !isClosing ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-90'
      }`}
    >
      <div className={`
        relative w-85 bg-gray-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl overflow-hidden group
        ${isUnfollow ? 'ring-2 ring-rose-500/30' : 'ring-1 ring-white/5'}
      `}>
        
        {/* Barre de progression subtile */}
        <div 
            className={`absolute bottom-0 left-0 h-0.5 ${isUnfollow ? 'bg-rose-500' : 'bg-blue-500'} transition-all duration-[6000ms] ease-linear w-full origin-left`} 
            style={{ width: isVisible ? '0%' : '100%' }} 
        />

        <div className="flex gap-4 items-center relative z-10">
            {/* Avatar avec badge d'action */}
            <div className="relative shrink-0 cursor-pointer" onClick={handleClick}>
                <UserAvatar userId={null} url={notification.actor_avatar_url} name={notification.actor_name} size="sm" className="border border-white/10" />
                <div className={`absolute -bottom-1 -right-1 rounded-full p-1 text-white shadow-lg ${style.color} animate-in zoom-in duration-500`}>
                    {style.icon}
                </div>
            </div>
            
            <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white truncate">{notification.actor_name}</h4>
                    {isUnfollow && <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/20 text-rose-400 font-black rounded border border-rose-500/30 uppercase">Perdu</span>}
                </div>
                <p className={`text-xs mt-0.5 leading-snug truncate ${isUnfollow ? 'text-rose-200/70' : 'text-gray-400'}`}>
                    {notification.type === 'comment' && notification.text_content 
                        ? <span>a dit : <span className="italic">"{notification.text_content}"</span></span>
                        : style.text
                    }
                </p>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className="text-gray-600 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-full"
            >
                <X size={16} />
            </button>
        </div>

        {/* Effet visuel au survol */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
      </div>
    </div>,
    document.body
  );
};
