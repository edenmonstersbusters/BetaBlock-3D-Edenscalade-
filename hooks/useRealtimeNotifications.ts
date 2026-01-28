
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../core/supabase';
import { api } from '../core/api';
import { auth } from '../core/auth';
import { Notification } from '../types';

export const useRealtimeNotifications = () => {
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);
  const userRef = useRef<any>(null);

  // Demander la permission système au montage (si ce n'est pas déjà fait)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const addToast = (notif: Notification) => {
      // Éviter les doublons visuels si on spam
      setActiveToasts(prev => {
          if (prev.some(n => n.id === notif.id)) return prev;
          return [...prev, notif];
      });
      triggerSystemNotification(notif);
  };

  const removeToast = (id: string) => {
      setActiveToasts(prev => prev.filter(n => n.id !== id));
  };

  const triggerSystemNotification = (notif: Notification) => {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      let title = "BetaBlock 3D";
      let body = "";

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
            title = "Nouveau like";
            body = `${notif.actor_name} a aimé votre mur "${notif.resource_name || 'sans nom'}"`;
            break;
          case 'comment':
            title = "Nouveau commentaire";
            body = `${notif.actor_name} a commenté votre mur "${notif.resource_name || 'sans nom'}"`;
            break;
      }

      try {
          const sysNotif = new Notification(title, {
              body: body,
              icon: notif.actor_avatar_url || '/favicon.ico', // Utilise l'avatar ou l'icône par défaut
              tag: notif.id // Empêche les doublons système
          });
          
          sysNotif.onclick = () => {
              window.focus();
              sysNotif.close();
          };
      } catch (e) {
          console.warn("Erreur notification système:", e);
      }
  };

  useEffect(() => {
    // Fonction pour initialiser la souscription
    const setupSubscription = async () => {
      const user = await auth.getUser();
      userRef.current = user;

      if (!user) return;

      const channel = supabase
        .channel('public:notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${user.id}`,
          },
          async (payload) => {
            console.log('Notification reçue:', payload);
            const newNotifId = payload.new.id;
            
            // Récupérer les détails enrichis (nom, avatar, nom du mur)
            const fullNotif = await api.getSingleNotification(newNotifId);
            
            if (fullNotif) {
                addToast(fullNotif);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();

    // Ré-écouter lors des changements d'auth
    const { data: { subscription } } = auth.onAuthStateChange(async (user) => {
        if (user?.id !== userRef.current?.id) {
            userRef.current = user;
            // La logique de resubscription est gérée par le useEffect qui dépendrait de user.id,
            // mais ici on fait simple : on recharge la page si l'utilisateur change vraiment (rare sans reload)
            if (user) setupSubscription(); 
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  return {
      activeToasts,
      removeToast
  };
};
