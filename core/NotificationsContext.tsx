
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import { api } from './api';
import { auth } from './auth';
import { Notification } from '../types';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  activeToasts: Notification[];
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissToast: (id: string) => void;
  loading: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<string | null>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNewNotification = async (payload: any) => {
      console.log('REALTIME PAYLOAD RECEIVED:', payload);
      const fullNotif = await api.getSingleNotification(payload.new.id);
      if (!fullNotif) return;

      setNotifications(prev => [fullNotif, ...prev]);
      setActiveToasts(prev => [...prev, fullNotif]);
      
      // Notification système (OS)
      if ('Notification' in window && Notification.permission === 'granted' && !document.hasFocus()) {
          new Notification(fullNotif.type === 'unfollow' ? "⚠️ Désabonnement" : "BetaBlock", {
              body: fullNotif.type === 'unfollow' ? `${fullNotif.actor_name} ne vous suit plus.` : "Nouvelle interaction sur votre mur.",
              icon: fullNotif.actor_avatar_url
          });
      }
  };

  useEffect(() => {
    let channel: any = null;

    const init = async () => {
        const user = await auth.getUser();
        if (!user) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        if (user.id === userRef.current) return;
        userRef.current = user.id;
        setLoading(true);

        const existingData = await api.getNotifications(user.id);
        setNotifications(existingData);
        setLoading(false);

        // ABONNEMENT TEMPS RÉEL
        channel = supabase
            .channel(`notifs-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${user.id}`,
                },
                (payload) => handleNewNotification(payload)
            )
            .subscribe((status) => {
                console.log(`REALTIME STATUS for ${user.id}:`, status);
            });
    };

    init();

    const { data: { subscription } } = auth.onAuthStateChange((user) => {
        if (user?.id !== userRef.current) {
            if (channel) supabase.removeChannel(channel);
            init();
        }
    });

    return () => {
        if (channel) supabase.removeChannel(channel);
        subscription.unsubscribe();
    };
  }, []);

  const markAsRead = async (id: string) => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      await api.markNotificationRead(id);
  };

  const markAllAsRead = async () => {
      const user = await auth.getUser();
      if (!user) return;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      await api.markAllNotificationsRead(user.id);
  };

  const dismissToast = (id: string) => {
      setActiveToasts(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationsContext.Provider value={{ 
        notifications, unreadCount, activeToasts, markAsRead, markAllAsRead, dismissToast, loading 
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationsProvider');
  return context;
};
