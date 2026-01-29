
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, MessageSquare, UserPlus, UserMinus, Box, AlertTriangle } from 'lucide-react';
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

  // --- RENDU SPÉCIFIQUE UNFOLLOW (GROS VISUEL PUSH) ---
  if (isUnfollow) {
      return createPortal(
          <div className={`fixed inset-x-0 top-10 z-[10000] flex justify-center px-4 pointer-events-none transition-all duration-700 ${
              isVisible && !isClosing ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'
          }`}>
              <div className="pointer-events-auto w-full max-w-md bg-red-600 border-2 border-white shadow-[0_0_50px_rgba(220,38,38,0.8)] rounded-3xl overflow-hidden animate-bounce-short">
                  <div className="p-1 bg-white/20 animate-pulse" />
                  <div className="p-6 flex items-center gap-5">
                      <div className="relative shrink-0 scale-125">
                          <UserAvatar userId={null} url={notification.actor_avatar_url} name={notification.actor_name} size="md" className="border-2 border-white" />
                          <div className="absolute -bottom-1 -right-1 bg-white text-red-600 rounded-full p-1 shadow-lg">
                              <UserMinus size={14} strokeWidth={3} />
                          </div>
                      </div>
                      
                      <div className="flex-1 min-w-0" onClick={handleClick} role="button">
                          <h4 className="text-xl font-black text-white leading-tight uppercase tracking-tighter">ALERTE DÉSABONNEMENT</h4>
                          <p className="text-red-100 font-bold text-sm">
                              <span className="text-white underline">{notification.actor_name}</span> ne vous suit plus !
                          </p>
                      </div>

                      <button onClick={handleClose} className="p-2 hover:bg-black/10 rounded-full transition-colors text-white">
                          <X size={24} />
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      );
  }

  // --- RENDU STANDARD (TOAST CLASSIQUE) ---
  return createPortal(
    <div 
      className={`fixed top-6 right-6 z-[9999] transition-all duration-500 transform ${
        isVisible && !isClosing ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-90'
      }`}
    >
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-80 shadow-2xl relative overflow-hidden group">
        <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-[6000ms] ease-linear w-full origin-left" style={{ width: isVisible ? '0%' : '100%' }} />

        <div className="flex gap-3 items-start relative z-10">
            <div className="shrink-0 mt-1 cursor-pointer" onClick={handleClick}>
                <UserAvatar userId={null} url={notification.actor_avatar_url} name={notification.actor_name} size="sm" />
            </div>
            
            <div className="flex-1 cursor-pointer" onClick={handleClick}>
                <h4 className="text-sm font-bold text-white">{notification.actor_name}</h4>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                    {notification.type === 'follow' && "vous suit désormais."}
                    {notification.type === 'comment' && `a commenté : "${notification.text_content}"`}
                    {notification.type === 'like_wall' && "a aimé votre mur."}
                    {notification.type === 'new_wall' && "a publié un nouveau mur."}
                </p>
            </div>

            <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors p-1"><X size={14} /></button>
        </div>
      </div>
    </div>,
    document.body
  );
};
