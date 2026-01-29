
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, UserMinus, Box, Loader2, ThumbsUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../core/NotificationsContext';
import { UserAvatar } from './UserAvatar';
import { AppNotification } from '../../types';

interface NotificationsMenuProps {
  userId: string;
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

  const getNotifDetails = (n: AppNotification) => {
      switch(n.type) {
          case 'follow': return { 
              icon: <UserPlus size={10} strokeWidth={3} />, 
              color: 'bg-blue-500', 
              text: <span>vous suit désormais.</span> 
          };
          case 'unfollow': return { 
              icon: <UserMinus size={10} strokeWidth={3} />, 
              color: 'bg-gray-500', 
              text: <span className="text-gray-500">ne vous suit plus.</span> 
          };
          case 'new_wall': return { 
              icon: <Box size={10} strokeWidth={3} />, 
              color: 'bg-purple-500', 
              text: <span>a publié <span className="font-bold text-white">{n.resource_name || "un mur"}</span>.</span> 
          };
          case 'like_wall': return { 
              icon: <Heart size={10} fill="currentColor" />, 
              color: 'bg-rose-500', 
              text: <span>a aimé <span className="font-bold text-white">{n.resource_name || "votre mur"}</span>.</span> 
          };
          case 'like_comment': return { 
              icon: <ThumbsUp size={10} fill="currentColor" />, 
              color: 'bg-pink-500', 
              text: <span>a aimé votre commentaire.</span> 
          };
          case 'comment': return { 
              icon: <MessageCircle size={10} fill="currentColor" />, 
              color: 'bg-emerald-500', 
              text: <span>a commenté <span className="font-bold text-white">{n.resource_name || "votre mur"}</span>.</span> 
          };
          default: return { 
              icon: <Bell size={10} />, 
              color: 'bg-gray-500', 
              text: <span>Nouvelle interaction.</span> 
          };
      }
  };

  const getTimeAgo = (dateStr: string) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = (now.getTime() - date.getTime()) / 1000;
      
      if (diff < 60) return "À l'instant";
      if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
      return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-all duration-300 ${isOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
      >
        <Bell size={20} className={unreadCount > 0 ? "text-white" : ""} />
        {unreadCount > 0 && (
            <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-gray-950 flex items-center justify-center text-[9px] font-black text-white animate-in zoom-in duration-300">
                {unreadCount > 9 ? '9+' : unreadCount}
            </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-200 ring-1 ring-black/50">
            {/* HEADER */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gray-950">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white uppercase tracking-wider">Notifications</span>
                    {unreadCount > 0 && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg shadow-blue-900/50">{unreadCount} nouveaux</span>}
                </div>
                {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[10px] text-gray-500 hover:text-white font-bold uppercase tracking-widest transition-colors">Tout marquer comme lu</button>
                )}
            </div>
            
            {/* LISTE */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-gray-900">
                {loading && notifications.length === 0 ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-gray-600">
                             <Bell size={20} />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">C'est calme par ici...</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {notifications.map(notif => {
                            const details = getNotifDetails(notif);
                            return (
                                <div 
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`p-4 flex gap-4 hover:bg-gray-800/50 cursor-pointer transition-all group ${!notif.is_read ? 'bg-blue-500/5' : ''}`}
                                >
                                    {/* Avatar + Badge */}
                                    <div className="relative shrink-0 mt-1">
                                        <UserAvatar userId={null} url={notif.actor_avatar_url} name={notif.actor_name} size="md" />
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${details.color} text-white rounded-full flex items-center justify-center border-2 border-gray-900 shadow-sm z-10`}>
                                            {details.icon}
                                        </div>
                                    </div>

                                    {/* Contenu */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between mb-0.5">
                                            <span className={`text-sm font-bold truncate pr-2 ${!notif.is_read ? 'text-white' : 'text-gray-300'}`}>{notif.actor_name}</span>
                                            <span className="text-[10px] text-gray-600 shrink-0 font-medium">{getTimeAgo(notif.created_at)}</span>
                                        </div>
                                        
                                        <div className="text-xs text-gray-400 leading-snug mb-1">
                                            {details.text}
                                        </div>
                                        
                                        {/* Preview Commentaire */}
                                        {notif.type === 'comment' && notif.text_content && (
                                            <div className="mt-2 p-2 rounded-lg bg-gray-800/50 border border-white/5 text-xs text-gray-300 italic truncate group-hover:bg-gray-800 transition-colors">
                                                "{notif.text_content}"
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Indicateur Non-Lu (Point Bleu) */}
                                    {!notif.is_read && (
                                        <div className="self-center">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
