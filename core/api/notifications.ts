
import { supabase } from '../supabase';
import { AppNotification } from '../../types';

export const notificationsApi = {
  async getNotifications(userId: string): Promise<AppNotification[]> {
      try {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);
            
          if (error) throw error;

          // Enrichir avec les infos de l'acteur (nom, avatar) et le contexte
          const enriched = await Promise.all(data.map(async (n: any) => {
             const { data: actor } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', n.actor_id).maybeSingle();
             let resourceName = undefined;
             let textContent = undefined;
             
             // 1. Cas d'un Mur (Nouveau mur, Like sur mur, Commentaire sur mur)
             if (n.type === 'new_wall' || n.type === 'like_wall') {
                 if (n.resource_id) {
                    const { data: wall } = await supabase.from('walls').select('name').eq('id', n.resource_id).maybeSingle();
                    if (wall) resourceName = wall.name;
                 }
             }
             
             // 2. Cas d'un Commentaire (Nouveau commentaire)
             if (n.type === 'comment') {
                 if (n.resource_id) {
                     // On récupère le commentaire pour avoir le texte et l'ID du mur
                     const { data: comment } = await supabase.from('comments').select('text, wall_id').eq('id', n.resource_id).maybeSingle();
                     if (comment) {
                         textContent = comment.text;
                         // On récupère le nom du mur associé
                         const { data: wall } = await supabase.from('walls').select('name').eq('id', comment.wall_id).maybeSingle();
                         if (wall) resourceName = wall.name;
                     }
                 }
             }

             // 3. Cas d'un Like sur Commentaire
             if (n.type === 'like_comment') {
                 if (n.resource_id) {
                     const { data: comment } = await supabase.from('comments').select('text, wall_id').eq('id', n.resource_id).maybeSingle();
                     if (comment) {
                         textContent = comment.text;
                         const { data: wall } = await supabase.from('walls').select('name').eq('id', comment.wall_id).maybeSingle();
                         if (wall) resourceName = wall.name;
                     }
                 }
             }

             return {
                 ...n,
                 actor_name: actor?.display_name || "Utilisateur inconnu",
                 actor_avatar_url: actor?.avatar_url,
                 resource_name: resourceName,
                 text_content: textContent
             };
          }));

          return enriched;
      } catch (err) { return []; }
  },
  
  async getSingleNotification(notificationId: string): Promise<AppNotification | null> {
      try {
          const { data: n, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', notificationId)
            .single();
            
          if (error || !n) return null;

          const { data: actor } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', n.actor_id).maybeSingle();
          let resourceName = undefined;
          let textContent = undefined;
          
          if (n.type === 'new_wall' || n.type === 'like_wall') {
                if (n.resource_id) {
                const { data: wall } = await supabase.from('walls').select('name').eq('id', n.resource_id).maybeSingle();
                if (wall) resourceName = wall.name;
                }
          }

          if (n.type === 'comment') {
                if (n.resource_id) {
                    const { data: comment } = await supabase.from('comments').select('text, wall_id').eq('id', n.resource_id).maybeSingle();
                    if (comment) {
                        textContent = comment.text;
                        const { data: wall } = await supabase.from('walls').select('name').eq('id', comment.wall_id).maybeSingle();
                        if (wall) resourceName = wall.name;
                    }
                }
          }

          if (n.type === 'like_comment') {
                if (n.resource_id) {
                    const { data: comment } = await supabase.from('comments').select('text, wall_id').eq('id', n.resource_id).maybeSingle();
                    if (comment) {
                        textContent = comment.text;
                        const { data: wall } = await supabase.from('walls').select('name').eq('id', comment.wall_id).maybeSingle();
                        if (wall) resourceName = wall.name;
                    }
                }
          }

          return {
                ...n,
                actor_name: actor?.display_name || "Utilisateur inconnu",
                actor_avatar_url: actor?.avatar_url,
                resource_name: resourceName,
                text_content: textContent
          } as AppNotification;
      } catch (e) { return null; }
  },

  async markNotificationRead(notificationId: string): Promise<void> {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
      await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', userId).eq('is_read', false);
  }
};
