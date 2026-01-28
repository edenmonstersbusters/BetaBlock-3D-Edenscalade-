
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, MessageSquare, UserPlus, Box } from 'lucide-react';
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
      if (notification.type === 'follow') {
          navigate(`/profile/${notification.actor_id}`);
      } else if (notification.resource_id) {
          navigate(`/view/${notification.resource_id}`);
      }
      handleClose();
  };

  const getIcon = () => {
      switch(notification.type) {
          case 'follow': return <UserPlus size={16} className="text-blue-400" />;
          case 'new_wall': return <Box size={16} className="text-emerald-400" />;
          case 'like_wall': return <Heart size={16} className="text-red-400" />;
          case 'comment': return <MessageSquare size={16} className="text-orange-400" />;
          default: return null;
      }
  };

  const getText = () => {
      switch(notification.type) {
          case 'follow': return "vous suit désormais.";
          case 'new_wall': return <span>a publié <span className="text-white font-bold">{notification.resource_name || "un mur"}</span>.</span>;
          case 'like_wall': return <span>a aimé <span className="text-white font-bold">{notification.resource_name || "votre mur"}</span>.</span>;
          case 'comment': return <span>a commenté <span className="text-white font-bold">{notification.resource_name || "votre mur"}</span>.</span>;
          default: return "Nouvelle interaction.";
      }
  };

  return createPortal(
    <div 
      className={`fixed bottom-6 right-6 z-[9999] transition-all duration-300 transform ${
        isVisible && !isClosing ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 w-80 relative overflow-hidden group">
        
        {/* Barre de progression */}
        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-[5000ms] ease-linear w-full origin-left" style={{ width: isVisible ? '0%' : '100%' }} />

        <div className="flex gap-3 items-start relative z-10">
            <div className="shrink-0 mt-1 cursor-pointer" onClick={handleClick}>
                <UserAvatar userId={null} url={notification.actor_avatar_url} name={notification.actor_name} size="sm" />
                <div className="absolute -bottom-1 -right-1 bg-gray-900 rounded-full p-0.5 border border-white/10">
                    {getIcon()}
                </div>
            </div>
            
            <div className="flex-1 cursor-pointer" onClick={handleClick}>
                <h4 className="text-sm font-bold text-white leading-tight">{notification.actor_name}</h4>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug pr-4">
                    {getText()}
                </p>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className="text-gray-500 hover:text-white transition-colors p-1"
            >
                <X size={14} />
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
