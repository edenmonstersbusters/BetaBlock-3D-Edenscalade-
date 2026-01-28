
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, MessageSquare, UserPlus, UserMinus, Box, AlertOctagon } from 'lucide-react';
import { Notification } from '../../types';
import { UserAvatar } from './UserAvatar';
import { useNavigate } from 'react-router-dom';

interface ToastNotificationProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  duration?: number;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ notification, onDismiss, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Animation d'entrée
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-fermeture
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300); // Durée de l'animation de sortie
  };

  const handleClick = () => {
      if (notification.type === 'follow' || notification.type === 'unfollow') {
          navigate(`/profile/${notification.actor_id}`);
      } else if (notification.resource_id) {
          navigate(`/view/${notification.resource_id}`);
      }
      handleClose();
  };

  const getIcon = () => {
      switch(notification.type) {
          case 'follow': return <UserPlus size={16} className="text-blue-400" />;
          case 'unfollow': return <UserMinus size={16} className="text-white" />; // Icone blanche sur fond rouge
          case 'new_wall': return <Box size={16} className="text-emerald-400" />;
          case 'like_wall': return <Heart size={16} className="text-red-400" />;
          case 'comment': return <MessageSquare size={16} className="text-orange-400" />;
          default: return null;
      }
  };

  const getText = () => {
      switch(notification.type) {
          case 'follow': return "vous suit désormais.";
          case 'unfollow': return <span className="font-bold text-red-200">ne vous suit plus.</span>;
          case 'new_wall': return <span>a publié <span className="text-white font-bold">{notification.resource_name || "un mur"}</span>.</span>;
          case 'like_wall': return <span>a aimé <span className="text-white font-bold">{notification.resource_name || "votre mur"}</span>.</span>;
          case 'comment': return (
              <span>
                  a commenté <span className="text-white font-bold">{notification.resource_name || "votre mur"}</span>
                  {notification.text_content && <span className="block mt-1 text-gray-300 italic opacity-80">"{notification.text_content}"</span>}
              </span>
          );
          default: return "Nouvelle interaction.";
      }
  };

  // Style spécifique "PUSH / ALERTE" pour le Unfollow
  const isUnfollow = notification.type === 'unfollow';
  const containerClasses = isUnfollow
    ? "bg-red-900/90 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
    : "bg-gray-900/90 border-white/10 shadow-2xl";

  const progressGradient = isUnfollow
    ? "bg-red-500"
    : "bg-gradient-to-r from-blue-500 to-purple-500";

  return createPortal(
    <div 
      className={`fixed top-6 right-6 z-[9999] transition-all duration-500 transform ${
        isVisible && !isClosing ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-90'
      }`}
    >
      <div className={`${containerClasses} backdrop-blur-xl border rounded-2xl p-4 w-80 relative overflow-hidden group`}>
        
        {/* Barre de progression */}
        <div className={`absolute bottom-0 left-0 h-1 ${progressGradient} transition-all duration-[5000ms] ease-linear w-full origin-left`} style={{ width: isVisible ? '0%' : '100%' }} />

        <div className="flex gap-3 items-start relative z-10">
            <div className="shrink-0 mt-1 cursor-pointer" onClick={handleClick}>
                <UserAvatar userId={null} url={notification.actor_avatar_url} name={notification.actor_name} size="sm" />
                <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 border border-white/10 ${isUnfollow ? 'bg-red-600' : 'bg-gray-900'}`}>
                    {getIcon()}
                </div>
            </div>
            
            <div className="flex-1 cursor-pointer" onClick={handleClick}>
                <h4 className={`text-sm font-bold leading-tight ${isUnfollow ? 'text-red-100' : 'text-white'}`}>{notification.actor_name}</h4>
                <p className={`text-xs mt-0.5 leading-snug pr-4 ${isUnfollow ? 'text-red-200' : 'text-gray-400'}`}>
                    {getText()}
                </p>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className={`${isUnfollow ? 'text-red-300 hover:text-white' : 'text-gray-500 hover:text-white'} transition-colors p-1`}
            >
                <X size={14} />
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
