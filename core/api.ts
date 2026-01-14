
import { supabase } from './supabase';
import { BetaBlockFile, Comment, UserProfile } from '../types';

const handleNetworkError = (err: any) => {
  console.error("Supabase Request Error:", err);
  if (err.message === 'Failed to fetch') {
    return "Erreur Réseau : Impossible de joindre Supabase.";
  }
  // Gestion spécifique du blocage RLS (Row Level Security)
  if (err.code === '42501' || err.message?.includes('new row violates row-level security')) {
    return "Action interdite : vous ne pouvez pas liker votre propre contenu.";
  }
  return err.message || "Une erreur inconnue est survenue.";
};

export const api = {
  async saveWall(data: BetaBlockFile): Promise<{ id: string | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const avatarUrl = user?.user_metadata?.avatar_url;
      
      const enrichedData = {
          ...data,
          metadata: {
              ...data.metadata,
              authorAvatarUrl: avatarUrl
          }
      };

      const { data: result, error } = await supabase
        .from('walls')
        .insert([{ name: data.metadata.name, data: enrichedData }])
        .select().single();
      if (error) throw error;
      return { id: result.id, error: null };
    } catch (err: any) {
      return { id: null, error: handleNetworkError(err) };
    }
  },

  async getWall(id: string): Promise<{ data: BetaBlockFile | null; error: string | null }> {
    try {
      const { data: result, error } = await supabase.from('walls').select('data').eq('id', id).single();
      if (error) throw error;
      return { data: result.data as BetaBlockFile, error: null };
    } catch (err: any) {
      return { data: null, error: handleNetworkError(err) };
    }
  },

  async getWallsList(userId?: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      let query = supabase.from('walls').select('id, name, created_at, data').order('created_at', { ascending: false });
      if (userId) {
          query = query.eq('data->metadata->>authorId', userId);
      }
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: handleNetworkError(err) };
    }
  },

  async searchWalls(query: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const searchTerm = `%${query}%`;
      const { data, error } = await supabase
        .from('walls').select('id, name, created_at, data')
        .or(`name.ilike.${searchTerm},data->metadata->>authorName.ilike.${searchTerm}`)
        .order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: handleNetworkError(err) };
    }
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        let meta = user?.user_metadata;
        let email = user?.email;
        let createdAt = user?.created_at;

        // Si ce n'est pas l'utilisateur courant, on cherche dans ses murs publics
        if (user?.id !== userId) {
             // CHANGE: On trie par created_at DESC pour avoir le mur le plus récent (et donc l'avatar le plus à jour)
             const { data: wallData } = await supabase
                .from('walls')
                .select('data')
                .eq('data->metadata->>authorId', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

             if (wallData) {
                 return {
                     id: userId,
                     display_name: wallData.data.metadata.authorName || "Grimpeur Inconnu",
                     created_at: wallData.data.metadata.timestamp,
                     avatar_url: wallData.data.metadata.authorAvatarUrl,
                     stats: { total_walls: 0, total_likes: 0, beta_level: 0 }
                 };
             }
        }

        const { count: wallsCount } = await supabase.from('walls').select('*', { count: 'exact', head: true }).eq('data->metadata->>authorId', userId);
        
        return {
            id: userId,
            email: email,
            display_name: meta?.display_name || email?.split('@')[0] || "Grimpeur",
            bio: meta?.bio || "",
            avatar_url: meta?.avatar_url,
            location: meta?.location || "",
            home_gym: meta?.home_gym || "",
            climbing_grade: meta?.climbing_grade || "",
            climbing_style: meta?.climbing_style || "",
            created_at: createdAt || new Date().toISOString(),
            stats: {
                total_walls: wallsCount || 0,
                total_likes: 0, 
                beta_level: Math.floor((wallsCount || 0) / 2) + 1
            }
        };
    } catch (e) {
        return null;
    }
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
      const metadataUpdates: any = {};
      if (updates.display_name !== undefined) metadataUpdates.display_name = updates.display_name;
      if (updates.bio !== undefined) metadataUpdates.bio = updates.bio;
      if (updates.location !== undefined) metadataUpdates.location = updates.location;
      if (updates.home_gym !== undefined) metadataUpdates.home_gym = updates.home_gym;
      if (updates.climbing_grade !== undefined) metadataUpdates.climbing_grade = updates.climbing_grade;
      if (updates.climbing_style !== undefined) metadataUpdates.climbing_style = updates.climbing_style;
      if (updates.avatar_url !== undefined) metadataUpdates.avatar_url = updates.avatar_url;

      await supabase.auth.updateUser({
          data: metadataUpdates
      });
  },

  async uploadAvatar(file: File): Promise<string | null> {
      try {
          const fileExt = file.name.split('.').pop();
          // CHANGE: Utilisation de Date.now() pour éviter les problèmes de nommage (points, caractères spéciaux)
          const fileName = `avatar_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
          const filePath = `${fileName}`;
          
          const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, file);
          
          if (uploadError) throw uploadError; 
          
          const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
          return data.publicUrl;
      } catch (e) {
          console.error("Avatar Upload Error", e);
          return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
          });
      }
  },

  async getWallSocialStatus(wallId: string, userId?: string): Promise<{ likes: number; hasLiked: boolean }> {
    try {
        const { count } = await supabase.from('wall_likes').select('*', { count: 'exact', head: true }).eq('wall_id', wallId);
        let hasLiked = false;
        if (userId) {
            const { data } = await supabase.from('wall_likes').select('user_id').eq('wall_id', wallId).eq('user_id', userId).maybeSingle();
            hasLiked = !!data;
        }
        return { likes: count || 0, hasLiked };
    } catch (e) { return { likes: 0, hasLiked: false }; }
  },

  async toggleWallLike(wallId: string, userId: string): Promise<{ added: boolean; error: string | null }> {
      try {
        const { data } = await supabase.from('wall_likes').select('user_id').eq('wall_id', wallId).eq('user_id', userId).maybeSingle();
        if (data) {
            await supabase.from('wall_likes').delete().eq('wall_id', wallId).eq('user_id', userId);
            return { added: false, error: null };
        } else {
            const { error } = await supabase.from('wall_likes').insert({ wall_id: wallId, user_id: userId });
            if (error) throw error;
            return { added: true, error: null };
        }
      } catch (err: any) { 
          return { added: false, error: handleNetworkError(err) }; 
      }
  },

  async getComments(wallId: string, currentUserId?: string): Promise<Comment[]> {
    if (!wallId) return [];
    try {
        const { data, error } = await supabase.from('comments').select('*').eq('wall_id', wallId).order('created_at', { ascending: true });
        if (error) throw error;
        if (!data) return [];
        const enriched = await Promise.all(data.map(async (c: any) => {
            const { count } = await supabase.from('comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', c.id);
            let hasLiked = false;
            if (currentUserId) {
                const { data: likeData } = await supabase.from('comment_likes').select('user_id').eq('comment_id', c.id).eq('user_id', currentUserId).maybeSingle();
                hasLiked = !!likeData;
            }
            return { ...c, likes_count: count || 0, user_has_liked: hasLiked };
        }));
        return enriched;
    } catch (err) { 
        console.error("Error getting comments", err);
        return []; 
    }
  },

  async postComment(wallId: string, userId: string, authorName: string, text: string, parentId: string | null, avatarUrl?: string): Promise<{ error: string | null }> {
      try {
          // Note: Assurez-vous que la colonne 'author_avatar_url' existe dans votre table 'comments' sur Supabase.
          const payload: any = { 
              wall_id: wallId, 
              user_id: userId, 
              author_name: authorName, 
              text: text, 
              parent_id: parentId 
          };
          
          if (avatarUrl) {
              payload.author_avatar_url = avatarUrl;
          }

          const { error } = await supabase.from('comments').insert(payload);
          return { error: error ? error.message : null };
      } catch (err: any) { return { error: err.message }; }
  },

  async toggleCommentLike(commentId: string, userId: string): Promise<{ added: boolean; error: string | null }> {
      try {
        const { data } = await supabase.from('comment_likes').select('user_id').eq('comment_id', commentId).eq('user_id', userId).maybeSingle();
        if (data) {
            await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
            return { added: false, error: null };
        } else {
            const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId });
            if (error) throw error;
            return { added: true, error: null };
        }
      } catch (err: any) { 
          return { added: false, error: handleNetworkError(err) }; 
      }
  }
};
