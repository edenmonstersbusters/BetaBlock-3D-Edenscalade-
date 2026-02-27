
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
             let textContent = n.text_content; 
             let isReply = false;
             let parentText = undefined;
             
             // --- RECUPERATION DU MUR (Pour tous les types sauf follow) ---
             // On utilise wall_resource_id s'il existe (nouvelle structure), sinon on tente de déduire
             let wallId = n.wall_resource_id;
             
             // Fallback compatibilité ancienne structure
             if (!wallId) {
                 if (n.type === 'new_wall' || n.type === 'like_wall') {
                     wallId = n.resource_id;
                 }
                 // Pour like_comment, comment, answer_comment, le resource_id est un comment_id, 
                 // donc on ne peut pas déduire le wallId tout de suite, on le fera via le commentaire.
             }

             if (wallId) {
                 const { data: wall } = await supabase.from('walls').select('name').eq('id', wallId).maybeSingle();
                 if (wall) resourceName = wall.name;
             }

             // --- RECUPERATION DU COMMENTAIRE ---
             let commentId = n.comment_resource_id;
             
             // Fallback compatibilité
             if (!commentId && (n.type === 'comment' || n.type === 'like_comment' || n.type === 'answer_comment')) {
                 commentId = n.resource_id;
             }

             if (commentId) {
                 const { data: comment } = await supabase.from('comments').select('text, wall_id, parent_id').eq('id', commentId).maybeSingle();
                 if (comment) {
                     // Si on n'avait pas le texte (like_comment ou answer_comment), on le prend
                     if (!textContent) textContent = comment.text;
                     
                     // Si on n'avait pas le mur via wall_resource_id, on le chope ici
                     // C'est CRUCIAL pour les like_comment et answer_comment
                     if (!resourceName && comment.wall_id) {
                         const { data: wall } = await supabase.from('walls').select('name').eq('id', comment.wall_id).maybeSingle();
                         if (wall) resourceName = wall.name;
                     }

                     // Gestion des réponses
                     if (n.type === 'answer_comment' || (n.type === 'comment' && comment.parent_id)) {
                         isReply = true;
                         if (comment.parent_id) {
                             const { data: parent } = await supabase.from('comments').select('text').eq('id', comment.parent_id).maybeSingle();
                             if (parent) parentText = parent.text;
                         }
                     }
                 }
             }

             return {
                 ...n,
                 actor_name: actor?.display_name || "Utilisateur inconnu",
                 actor_avatar_url: actor?.avatar_url,
                 resource_name: resourceName,
                 text_content: textContent,
                 is_reply: isReply,
                 parent_text: parentText
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
          let textContent = n.text_content;
          let isReply = false;
          let parentText = undefined;
          
          // --- RECUPERATION DU MUR ---
          let wallId = n.wall_resource_id;
          if (!wallId) {
              if (n.type === 'new_wall' || n.type === 'like_wall') wallId = n.resource_id;
          }

          if (wallId) {
              const { data: wall } = await supabase.from('walls').select('name').eq('id', wallId).maybeSingle();
              if (wall) resourceName = wall.name;
          }

          // --- RECUPERATION DU COMMENTAIRE ---
          let commentId = n.comment_resource_id;
          if (!commentId && (n.type === 'comment' || n.type === 'like_comment')) {
              commentId = n.resource_id;
          }

          if (commentId) {
              const { data: comment } = await supabase.from('comments').select('text, wall_id, parent_id').eq('id', commentId).maybeSingle();
              if (comment) {
                  if (!textContent) textContent = comment.text;
                  
                  if (!resourceName && comment.wall_id) {
                      const { data: wall } = await supabase.from('walls').select('name').eq('id', comment.wall_id).maybeSingle();
                      if (wall) resourceName = wall.name;
                  }

                  if (n.type === 'answer_comment' || (n.type === 'comment' && comment.parent_id)) {
                      isReply = true;
                      if (comment.parent_id) {
                          const { data: parent } = await supabase.from('comments').select('text').eq('id', comment.parent_id).maybeSingle();
                          if (parent) parentText = parent.text;
                      }
                  }
              }
          }

          return {
                ...n,
                actor_name: actor?.display_name || "Utilisateur inconnu",
                actor_avatar_url: actor?.avatar_url,
                resource_name: resourceName,
                text_content: textContent,
                is_reply: isReply,
                parent_text: parentText
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
