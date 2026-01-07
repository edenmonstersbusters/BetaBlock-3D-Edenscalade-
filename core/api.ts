
import { supabase } from './supabase';
import { BetaBlockFile, Comment } from '../types';

const handleNetworkError = (err: any) => {
  console.error("Supabase Request Error:", err);
  if (err.message === 'Failed to fetch') {
    return "Erreur Réseau : Impossible de joindre Supabase. Vérifiez votre connexion ou désactivez vos bloqueurs de publicité (AdBlock) pour ce site.";
  }
  return err.message || "Une erreur inconnue est survenue lors de la communication avec la base de données.";
};

export const api = {
  /**
   * Sauvegarde un mur dans la base de données.
   */
  async saveWall(data: BetaBlockFile): Promise<{ id: string | null; error: string | null }> {
    try {
      const { data: result, error } = await supabase
        .from('walls')
        .insert([
          { 
            name: data.metadata.name,
            data: data
            // On retire likes_count de l'insert pour éviter l'erreur si la colonne n'existe pas
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return { id: result.id, error: null };
    } catch (err: any) {
      return { id: null, error: handleNetworkError(err) };
    }
  },

  /**
   * Charge un mur depuis la base de données via son ID.
   */
  async getWall(id: string): Promise<{ data: BetaBlockFile | null; error: string | null }> {
    try {
      const { data: result, error } = await supabase
        .from('walls')
        .select('data')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!result) throw new Error("Mur introuvable");

      return { data: result.data as BetaBlockFile, error: null };
    } catch (err: any) {
      return { data: null, error: handleNetworkError(err) };
    }
  },

  /**
   * Récupère la liste des murs, triée par date (plus récents en premier).
   * Note : Le tri par popularité nécessite une colonne 'likes_count' ou une fonction SQL dédiée.
   */
  async getWallsList(): Promise<{ data: { id: string; name: string; created_at: string; data?: any; likes_count?: number }[] | null; error: string | null }> {
    try {
      // Suppression de 'likes_count' du select et de l'order pour éviter le crash si la colonne n'existe pas.
      const { data, error } = await supabase
        .from('walls')
        .select('id, name, created_at, data')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: handleNetworkError(err) };
    }
  },

  /**
   * Recherche globale dans toute la base de données.
   */
  async searchWalls(query: string): Promise<{ data: { id: string; name: string; created_at: string; data?: any }[] | null; error: string | null }> {
    try {
      const searchTerm = `%${query}%`;
      const { data, error } = await supabase
        .from('walls')
        .select('id, name, created_at, data')
        .or(`name.ilike.${searchTerm},data->metadata->>authorName.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: handleNetworkError(err) };
    }
  },

  // --- SOCIAL FEATURES ---

  /**
   * Récupère le nombre de likes d'un mur et si l'utilisateur courant a liké.
   * Utilise la table de liaison 'wall_likes'.
   */
  async getWallSocialStatus(wallId: string, userId?: string): Promise<{ likes: number; hasLiked: boolean }> {
    try {
        // Count total via la table de liaison (plus sûr que la colonne dénormalisée pour l'instant)
        const { count } = await supabase
            .from('wall_likes')
            .select('*', { count: 'exact', head: true })
            .eq('wall_id', wallId);
        
        let hasLiked = false;
        if (userId) {
            const { data } = await supabase
                .from('wall_likes')
                .select('user_id')
                .eq('wall_id', wallId)
                .eq('user_id', userId)
                .single();
            hasLiked = !!data;
        }

        return { likes: count || 0, hasLiked };
    } catch (e) {
        // Si la table n'existe pas encore, on renvoie 0 silencieusement
        return { likes: 0, hasLiked: false };
    }
  },

  /**
   * Toggle like sur un mur.
   */
  async toggleWallLike(wallId: string, userId: string): Promise<{ added: boolean; error: string | null }> {
      try {
        const { data } = await supabase
            .from('wall_likes')
            .select('user_id')
            .eq('wall_id', wallId)
            .eq('user_id', userId)
            .single();

        if (data) {
            // Unlike
            await supabase.from('wall_likes').delete().eq('wall_id', wallId).eq('user_id', userId);
            return { added: false, error: null };
        } else {
            // Like
            const { error } = await supabase.from('wall_likes').insert({ wall_id: wallId, user_id: userId });
            if (error) throw error;
            return { added: true, error: null };
        }
      } catch (err: any) {
          return { added: false, error: err.message };
      }
  },

  /**
   * Récupère les commentaires d'un mur.
   */
  async getComments(wallId: string, currentUserId?: string): Promise<Comment[]> {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq('wall_id', wallId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        if (!data) return [];

        // Enrichissement avec les likes des commentaires
        const commentsWithLikes = await Promise.all(data.map(async (c: any) => {
             // Attention : Si la table comment_likes n'existe pas, ceci peut échouer silencieusement via le catch global
             const { count } = await supabase.from('comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', c.id);
             let hasLiked = false;
             if (currentUserId) {
                 const { data: likeData } = await supabase.from('comment_likes').select('user_id').eq('comment_id', c.id).eq('user_id', currentUserId).single();
                 hasLiked = !!likeData;
             }
             return { ...c, likes_count: count || 0, user_has_liked: hasLiked };
        }));

        return commentsWithLikes;
    } catch (err) {
        console.error("Error fetching comments (Tables might be missing):", err);
        return [];
    }
  },

  async postComment(wallId: string, userId: string, authorName: string, text: string, parentId: string | null): Promise<{ error: string | null }> {
      try {
          const { error } = await supabase.from('comments').insert({
              wall_id: wallId,
              user_id: userId,
              author_name: authorName,
              text: text,
              parent_id: parentId
          });
          if (error) throw error;
          return { error: null };
      } catch (err: any) {
          return { error: err.message };
      }
  },

  async toggleCommentLike(commentId: string, userId: string): Promise<void> {
    try {
        const { data } = await supabase.from('comment_likes').select('user_id').eq('comment_id', commentId).eq('user_id', userId).single();
        if (data) {
            await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
        } else {
            await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId });
        }
    } catch (e) {
        console.error(e);
    }
  }
};
