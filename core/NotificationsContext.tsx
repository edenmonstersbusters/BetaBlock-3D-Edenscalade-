
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

  // Calcul dynamique du nombre de non-lues
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Demander la permission pour les notifs système (Windows/Mac)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const triggerSystemNotification = (notif: Notification) => {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (document.hasFocus()) return; // Pas de notif système si l'utilisateur est déjà sur l'onglet

      let title = "BetaBlock 3D";
      let body = "Nouvelle interaction";

      switch(notif.type) {
          case 'follow': 
            title = "Nouvel abonné !";
            body = `${notif.actor_name} vous suit désormais.`;
            break;
          case 'new_wall':
            title = "Nouveau mur";
            body = `${notif.actor_name} a publié "${notif.resource_name || 'un mur'}"`;
            break;
          case 'like_wall':
            title = "J'aime";
            body = `${notif.actor_name} a aimé votre mur "${notif.resource_name || 'sans nom'}"`;
            break;
          case 'comment':
            title = "Nouveau commentaire";
            body = `${notif.actor_name} a commenté "${notif.resource_name || 'votre mur'}"`;
            break;
      }

      try {
          const sysNotif = new Notification(title, {
              body: body,
              icon: notif.actor_avatar_url || '/favicon.ico',
              tag: notif.id
          });
          sysNotif.onclick = () => { window.focus(); sysNotif.close(); };
      } catch (e) { console.warn(e); }
  };

  const handleNewNotification = async (payload: any) => {
      // 1. Récupérer les données enrichies (Avatar, Nom...)
      const fullNotif = await api.getSingleNotification(payload.new.id);
      if (!fullNotif) return;

      // 2. Mettre à jour la liste et le compteur (Badge)
      setNotifications(prev => [fullNotif, ...prev]);

      // 3. Déclencher le Toast In-App
      setActiveToasts(prev => [...prev, fullNotif]);

      // 4. Déclencher la notif système (Ordinateur)
      triggerSystemNotification(fullNotif);
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

        if (user.id === userRef.current) return; // Déjà initialisé pour cet user
        userRef.current = user.id;
        setLoading(true);

        // A. Chargement initial
        const existingData = await api.getNotifications(user.id);
        setNotifications(existingData);
        setLoading(false);

        // B. Souscription Temps Réel
        channel = supabase
            .channel('notifications_global')
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
      // Optimistic update
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
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
