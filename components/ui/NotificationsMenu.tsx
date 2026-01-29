
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Heart, MessageSquare, UserPlus, UserMinus, Box, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../core/NotificationsContext';
import { UserAvatar } from './UserAvatar';
import { AppNotification } from '../../types';

interface NotificationsMenuProps {
  userId: string; // Gardé pour compatibilité props, mais on utilise le contexte
}

export const NotificationsMenu: React.FC<NotificationsMenuProps> = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fermer si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: AppNotification) => {
      if (!notif.is_read) {
          await markAsRead(notif.id);
      }
      setIsOpen(false);

      if (notif.type === 'follow' || notif.type === 'unfollow') {
          navigate(`/profile/${notif.actor_id}`);
      } else if (notif.resource_id) {
          navigate(`/view/${notif.resource_id}`);
      }
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'follow': return <UserPlus size={14} className="text-blue-400" />;
          case 'unfollow': return <UserMinus size={14} className="text-red-500" />;
          case 'new_wall': return <Box size={14} className="text-emerald-400" />;
          case 'like_wall': return <Heart size={14} className="text-red-400" />;
          case 'comment': return <MessageSquare size={14} className="text-orange-400" />;
          default: return <Bell size={14} className="text-gray-400" />;
      }
  };

  const getText = (n: AppNotification) => {
      switch(n.type) {
          case 'follow': return <span>vous suit désormais.</span>;
          case 'unfollow': return <span className="text-red-400 font-medium">ne vous suit plus.</span>;
          case 'new_wall': return <span>a publié un nouveau mur : <span className="text-white font-medium">{n.resource_name || "Sans titre"}</span></span>;
          case 'like_wall': return <span>a aimé votre mur <span className="text-white font-medium">{n.resource_name || "Sans titre"}</span></span>;
          case 'comment': return (
              <span>
                  a commenté votre mur <span className="text-white font-medium">{n.resource_name || "Sans titre"}</span>
                  {n.text_content && <span className="block mt-1 text-gray-500 italic truncate">"{n.text_content}"</span>}
              </span>
          );
          default: return <span>Nouvelle interaction.</span>;
      }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
      >
        <Bell size={20} className={unreadCount > 0 ? "animate-swing" : ""} />
        {unreadCount > 0 && (
            <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-gray-950 flex items-center justify-center text-[9px] font-black text-white animate-in zoom-in duration-300">
                {unreadCount > 9 ? '9+' : unreadCount}
            </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-gray-950/50">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white uppercase tracking-wider">Notifications</span>
                    {unreadCount > 0 && <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">{unreadCount}</span>}
                </div>
                {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold hover:underline">Tout marquer comme lu</button>
                )}
            </div>
            
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {loading && notifications.length === 0 ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <Bell size={24} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs italic">Aucune notification.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {notifications.map(notif => (
                            <div 
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-3 flex gap-3 hover:bg-white/5 cursor-pointer transition-colors ${!notif.is_read ? 'bg-blue-500/5 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
                            >
                                <div className="mt-1">
                                    <UserAvatar userId={null} url={notif.actor_avatar_url} name={notif.actor_name} size="xs" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-bold text-gray-200">{notif.actor_name}</span>
                                        {getIcon(notif.type)}
                                    </div>
                                    <p className="text-xs text-gray-400 leading-tight">
                                        {getText(notif)}
                                    </p>
                                    <span className="text-[9px] text-gray-600 mt-1 block">
                                        {new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                                {!notif.is_read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0 self-center" />}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
