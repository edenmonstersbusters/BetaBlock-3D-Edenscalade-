
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
  // Anti-doublon logique (ex: même user like le même mur 2 fois en 1 seconde à cause d'un bug DB)
  const logicalDebounceRef = useRef<Map<string, number>>(new Map());

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNewNotification = async (payload: any) => {
      const newId = payload.new.id;
      const raw = payload.new;

      // 1. Filtrage par ID (doublon technique WebSocket)
      if (processedIdsRef.current.has(newId)) return;

      // 2. Filtrage logique (Anti-spam / Anti-bug DB)
      // On crée une clé unique : "acteur-action-cible"
      const eventKey = `${raw.actor_id}-${raw.type}-${raw.resource_id}`;
      const now = Date.now();
      const lastTime = logicalDebounceRef.current.get(eventKey);

      // Si le même événement survient moins de 500ms après le précédent, on l'ignore visuellement
      if (lastTime && (now - lastTime < 500)) {
          processedIdsRef.current.add(newId); // On le marque comme "vu" pour ne pas le traiter plus tard
          return;
      }
      
      logicalDebounceRef.current.set(eventKey, now);
      processedIdsRef.current.add(newId);

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
            logicalDebounceRef.current.clear();
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
