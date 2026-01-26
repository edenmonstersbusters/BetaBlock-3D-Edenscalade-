import { supabase } from './supabase';
import { BetaBlockFile, Comment, UserProfile } from '../types';

const handleNetworkError = (err: any) => {
  console.error("Supabase Request Error:", err);
  if (err.code === '23503') return "Suppression impossible : ce mur possède des dépendances.";
  if (err.message === 'Failed to fetch') return "Erreur Réseau : Impossible de joindre Supabase.";
  if (err.code === '42501' || err.message?.includes('security')) return "Action interdite : droits insuffisants.";
  return err.message || "Une erreur inconnue est survenue.";
};

// Helper pour enrichir une liste d'objets (murs ou commentaires) avec les profils à jour
const enrichWithProfiles = async (items: any[], type: 'WALL' | 'COMMENT') => {
    if (!items || items.length === 0) return items;

    // 1. Collecter les ID uniques
    const userIds = new Set<string>();
    items.forEach(item => {
        if (type === 'WALL') {
            const authorId = item.data?.metadata?.authorId;
            if (authorId) userIds.add(authorId);
        } else {
            if (item.user_id) userIds.add(item.user_id);
        }
    });

    if (userIds.size === 0) return items;

    // 2. Récupérer les profils frais
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', Array.from(userIds));

    if (!profiles) return items;

    // Typage explicite <string, any> pour éviter que les valeurs soient inférées comme 'unknown'
    const profileMap = new Map<string, any>(profiles.map((p: any) => [p.id, p]));

    // 3. Appliquer les mises à jour
    return items.map(item => {
        if (type === 'WALL') {
            const authorId = item.data?.metadata?.authorId;
            const profile = profileMap.get(authorId);
            if (profile) {
                // On écrase les métadonnées snapshot par les données live
                item.data.metadata.authorName = profile.display_name;
                item.data.metadata.authorAvatarUrl = profile.avatar_url;
            }
            return item;
        } else {
            const profile = profileMap.get(item.user_id);
            if (profile) {
                item.author_name = profile.display_name;
                item.author_avatar_url = profile.avatar_url;
            }
            return item;
        }
    });
};

export const api = {
  async saveWall(data: BetaBlockFile): Promise<{ id: string | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Vous devez être connecté.");
      
      // On s'assure d'avoir les infos les plus récentes du profil pour le snapshot initial
      const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single();

      const enrichedData = {
          ...data,
          metadata: {
              ...data.metadata,
              authorId: user.id,
              authorName: profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0],
              authorAvatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url
          }
      };

      const { data: result, error } = await supabase
        .from('walls')
        .insert([{ 
            name: data.metadata.name, 
            data: enrichedData,
            is_public: data.metadata.isPublic || false,
            parent_id: data.metadata.parentId || null // Sauvegarde du lien de parenté (Remix)
        }])
        .select().single();

      if (error) throw error;
      return { id: result.id, error: null };
    } catch (err: any) {
      return { id: null, error: handleNetworkError(err) };
    }
  },

  async updateWall(id: string, data: BetaBlockFile): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('walls')
        .update({ 
            name: data.metadata.name, 
            data: data,
            is_public: data.metadata.isPublic || false
        })
        .eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: handleNetworkError(err) };
    }
  },

  async deleteWall(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.from('walls').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: handleNetworkError(err) };
    }
  },

  async toggleWallVisibility(id: string, isPublic: boolean): Promise<{ error: string | null }> {
    try {
       const { data: current, error: fetchError } = await supabase.from('walls').select('data').eq('id', id).single();
       if (fetchError) throw fetchError;
       
       const newData = { ...current.data };
       if (newData.metadata) {
           newData.metadata.isPublic = isPublic;
       }

       const { error } = await supabase
         .from('walls')
         .update({ is_public: isPublic, data: newData })
         .eq('id', id);
         
       if (error) throw error;
       return { error: null };
    } catch (err: any) {
       return { error: handleNetworkError(err) };
    }
  },

  async getWall(id: string): Promise<{ data: BetaBlockFile | null; error: string | null }> {
    try {
      const { data: result, error } = await supabase.from('walls').select('data').eq('id', id).single();
      if (error) throw error;

      let fileData = result.data as BetaBlockFile;

      // ENRICHISSEMENT LIVE UNIQUE
      if (fileData.metadata.authorId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', fileData.metadata.authorId)
            .maybeSingle();
          
          if (profile) {
              fileData.metadata.authorName = profile.display_name;
              fileData.metadata.authorAvatarUrl = profile.avatar_url;
          }
      }

      return { data: fileData, error: null };
    } catch (err: any) {
      return { data: null, error: handleNetworkError(err) };
    }
  },

  async getWallsList(userId?: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      let query = supabase.from('walls').select('id, name, created_at, data').eq('is_public', true);
      if (userId) query = query.eq('data->metadata->>authorId', userId);
      const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
      
      if (error) throw error;
      const enriched = await enrichWithProfiles(data || [], 'WALL');
      
      return { data: enriched, error: null };
    } catch (err: any) {
      return { data: null, error: handleNetworkError(err) };
    }
  },

  async getUserProjects(userId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase.from('walls').select('id, name, created_at, data, is_public').eq('data->metadata->>authorId', userId).order('created_at', { ascending: false });
      
      if (error) throw error;
      const enriched = await enrichWithProfiles(data || [], 'WALL');

      return { data: enriched, error: null };
    } catch (err: any) {
      return { data: null, error: handleNetworkError(err) };
    }
  },

  async searchWalls(query: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const searchTerm = `%${query}%`;
      const { data, error } = await supabase.from('walls').select('id, name, created_at, data').eq('is_public', true).or(`name.ilike.${searchTerm},data->metadata->>authorName.ilike.${searchTerm}`).order('created_at', { ascending: false }).limit(50);
      
      if (error) throw error;
      const enriched = await enrichWithProfiles(data || [], 'WALL');
      
      return { data: enriched, error: null };
    } catch (err: any) {
      return { data: null, error: handleNetworkError(err) };
    }
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id === userId) {
                 return {
                     id: userId,
                     display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
                     avatar_url: user.user_metadata?.avatar_url,
                     created_at: user.created_at,
                     stats: { total_walls: 0, total_likes: 0, beta_level: 0 }
                 };
            }
            return null;
        }

        const { data: userWalls } = await supabase
            .from('walls')
            .select('id')
            .eq('data->metadata->>authorId', userId);
        
        const wallIds = userWalls?.map(w => w.id) || [];
        
        let totalLikesCount = 0;
        if (wallIds.length > 0) {
            const { count } = await supabase
                .from('wall_likes')
                .select('*', { count: 'exact', head: true })
                .in('wall_id', wallIds);
            totalLikesCount = count || 0;
        }
        
        return {
            ...profile,
            home_gym: typeof profile.home_gym === 'string' ? JSON.parse(profile.home_gym) : profile.home_gym,
            stats: {
                total_walls: wallIds.length,
                total_likes: totalLikesCount, 
                beta_level: Math.floor((wallIds.length || 0) / 2) + 1
            }
        };
    } catch (e) {
        return null;
    }
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
      const metaDataUpdates: any = {};
      
      if (updates.display_name !== undefined) metaDataUpdates.display_name = updates.display_name;
      if (updates.avatar_url !== undefined) metaDataUpdates.avatar_url = updates.avatar_url;
      if (updates.bio !== undefined) metaDataUpdates.bio = updates.bio;
      if (updates.location !== undefined) metaDataUpdates.location = updates.location;
      if (updates.home_gym !== undefined) metaDataUpdates.home_gym = updates.home_gym;
      if (updates.climbing_grade !== undefined) metaDataUpdates.climbing_grade = updates.climbing_grade;
      if (updates.climbing_style !== undefined) metaDataUpdates.climbing_style = updates.climbing_style;

      const { error } = await supabase.auth.updateUser({
          data: metaDataUpdates
      });
      
      if (error) throw error;
  },

  async uploadAvatar(file: File): Promise<string | null> {
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `avatar_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
          if (uploadError) throw uploadError; 
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          return data.publicUrl;
      } catch (e) {
          console.error("Avatar Upload Error", e);
          return null;
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
            return { added: true, error: error ? error.message : null };
        }
      } catch (err: any) { 
          return { added: false, error: handleNetworkError(err) }; 
      }
  },

  async getComments(wallId: string, currentUserId?: string): Promise<Comment[]> {
    try {
        const { data, error } = await supabase.from('comments').select('*').eq('wall_id', wallId).order('created_at', { ascending: true });
        if (error) throw error;

        const enrichedComments = await enrichWithProfiles(data || [], 'COMMENT');

        return Promise.all((enrichedComments || []).map(async (c: any) => {
            const { count } = await supabase.from('comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', c.id);
            let hasLiked = false;
            if (currentUserId) {
                const { data: likeData } = await supabase.from('comment_likes').select('user_id').eq('comment_id', c.id).eq('user_id', currentUserId).maybeSingle();
                hasLiked = !!likeData;
            }
            return { ...c, likes_count: count || 0, user_has_liked: hasLiked };
        }));
    } catch (err) { return []; }
  },

  async postComment(wallId: string, userId: string, authorName: string, text: string, parentId: string | null, avatarUrl?: string): Promise<{ error: string | null }> {
      try {
          const payload: any = { wall_id: wallId, user_id: userId, author_name: authorName, text: text, parent_id: parentId };
          if (avatarUrl) payload.author_avatar_url = avatarUrl;
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
            return { added: true, error: error ? error.message : null };
        }
      } catch (err: any) { return { added: false, error: handleNetworkError(err) }; }
  }
};