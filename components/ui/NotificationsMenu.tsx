
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Heart, MessageSquare, UserPlus, Box, Loader2 } from 'lucide-react';
import { api } from '../../core/api';
import { Notification } from '../../types';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from './UserAvatar';

interface NotificationsMenuProps {
  userId: string;
}

export const NotificationsMenu: React.FC<NotificationsMenuProps> = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
      setLoading(true);
      const data = await api.getNotifications(userId);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
      setLoading(false);
  };

  useEffect(() => {
      fetchNotifications();
      // Polling simple toutes les 60s pour rafraichir
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
      setIsOpen(!isOpen);
      if (!isOpen) fetchNotifications(); // Rafraichir à l'ouverture
  };

  const handleNotificationClick = async (notif: Notification) => {
      if (!notif.is_read) {
          await api.markNotificationRead(notif.id);
          setUnreadCount(prev => Math.max(0, prev - 1));
          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      }
      setIsOpen(false);

      if (notif.type === 'follow') {
          navigate(`/profile/${notif.actor_id}`);
      } else if ((notif.type === 'new_wall' || notif.type === 'like_wall' || notif.type === 'comment') && notif.resource_id) {
          navigate(`/view/${notif.resource_id}`);
      }
  };

  const handleMarkAllRead = async () => {
      await api.markAllNotificationsRead(userId);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'follow': return <UserPlus size={14} className="text-blue-400" />;
          case 'new_wall': return <Box size={14} className="text-emerald-400" />;
          case 'like_wall': return <Heart size={14} className="text-red-400" />;
          case 'comment': return <MessageSquare size={14} className="text-orange-400" />;
          default: return <Bell size={14} className="text-gray-400" />;
      }
  };

  const getText = (n: Notification) => {
      switch(n.type) {
          case 'follow': return <span>vous suit désormais.</span>;
          case 'new_wall': return <span>a publié un nouveau mur : <span className="text-white font-medium">{n.resource_name || "Sans titre"}</span></span>;
          case 'like_wall': return <span>a aimé votre mur <span className="text-white font-medium">{n.resource_name || "Sans titre"}</span></span>;
          case 'comment': return <span>a commenté votre mur <span className="text-white font-medium">{n.resource_name || "Sans titre"}</span></span>;
          default: return <span>Nouvelle interaction.</span>;
      }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={handleOpen}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-950 animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-gray-950/50">
                <span className="text-xs font-black text-white uppercase tracking-wider">Notifications</span>
                {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold">Tout marquer comme lu</button>
                )}
            </div>
            
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {loading && notifications.length === 0 ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs italic">Rien à signaler pour le moment.</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {notifications.map(notif => (
                            <div 
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-3 flex gap-3 hover:bg-white/5 cursor-pointer transition-colors ${!notif.is_read ? 'bg-blue-500/5' : ''}`}
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
                                        {new Date(notif.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                {!notif.is_read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />}
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
