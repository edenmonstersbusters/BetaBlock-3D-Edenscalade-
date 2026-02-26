
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';
import { api } from './api';
import { auth } from './auth';
import { AppNotification } from '../types';

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  activeToasts: AppNotification[];
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissToast: (id: string) => void;
  loading: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeToasts, setActiveToasts] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  
  const userRef = useRef<string | null>(null);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const recentSignaturesRef = useRef<Set<string>>(new Set());

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNewNotification = async (payload: any) => {
      const newId = payload.new.id;
      const raw = payload.new;

      // 1. Filtrage par ID (doublon technique WebSocket)
      if (processedIdsRef.current.has(newId)) return;
      
      // 2. Filtrage par Signature (Anti-doublon logique pour événements multiples identiques)
      // Signature = type + actor + resource. 
      // Si on reçoit 3 notifs "X a commenté Y" en 100ms, on n'en garde qu'une.
      const signature = `${raw.type}-${raw.actor_id}-${raw.resource_id}`;
      if (recentSignaturesRef.current.has(signature)) {
          // On marque l'ID comme traité pour ne pas le revoir, mais on ne l'affiche pas
          processedIdsRef.current.add(newId);
          return;
      }

      processedIdsRef.current.add(newId);
      recentSignaturesRef.current.add(signature);
      
      // Nettoyage de la signature après 2 secondes pour autoriser une nouvelle action identique plus tard
      setTimeout(() => {
          recentSignaturesRef.current.delete(signature);
      }, 2000);

      // 3. Récupération des données
      const fullNotif = await api.getSingleNotification(newId);
      if (!fullNotif) return;

      setNotifications(prev => {
          if (prev.some(n => n.id === newId)) return prev;
          return [fullNotif, ...prev];
      });

      setActiveToasts(prev => {
          if (prev.some(n => n.id === newId)) return prev;
          return [...prev, fullNotif];
      });
      
      if ('Notification' in window && Notification.permission === 'granted' && !document.hasFocus()) {
          new Notification("BetaBlock", {
              body: `${fullNotif.actor_name} a interagi avec vous.`,
              icon: fullNotif.actor_avatar_url
          });
      }
  };

  useEffect(() => {
    let channel: any = null;
    let isMounted = true;

    const init = async () => {
        const user = await auth.getUser();
        if (!isMounted) return;

        if (!user) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        if (user.id === userRef.current) return;
        userRef.current = user.id;
        
        setLoading(true);

        const existingData = await api.getNotifications(user.id);
        if (!isMounted) return;
        
        // Dédoublonnage initial de la liste existante (au cas où la DB est sale)
        const uniqueData = existingData.filter((notif, index, self) => 
            index === self.findIndex((t) => (
                t.id === notif.id
            ))
        );

        setNotifications(uniqueData);
        uniqueData.forEach(n => processedIdsRef.current.add(n.id));
        setLoading(false);

        if (channel) supabase.removeChannel(channel);

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
            .subscribe();
    };

    init();

    const { data: { subscription } } = auth.onAuthStateChange((user) => {
        if (!isMounted) return;
        if (user?.id !== userRef.current) {
            if (channel) supabase.removeChannel(channel);
            channel = null; // Important: reset local var
            processedIdsRef.current.clear();
            init();
        }
    });

    return () => {
        isMounted = false;
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
