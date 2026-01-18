
import { supabase } from './supabase';
import { BetaBlockFile, Comment, UserProfile } from '../types';

const LOCAL_STORAGE_KEY = 'betablock_offline_walls';
const PROFILE_CACHE = new Map<string, UserProfile>();

const handleNetworkError = (err: any) => {
  console.warn("Supabase Request Error (Offline Mode Active):", err);
  if (err.code === '23503') return "Suppression impossible : ce mur possède des dépendances.";
  if (err.code === '42501' || err.message?.includes('new row violates row-level security')) return "Action interdite : droits insuffisants.";
  return err.message || "Erreur réseau.";
};

// --- HELPER LOCAL STORAGE ---
const getLocalWalls = (): any[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  } catch { return []; }
};

const saveLocalWall = (wall: any) => {
  const walls = getLocalWalls();
  const index = walls.findIndex(w => w.id === wall.id);
  if (index >= 0) walls[index] = wall;
  else walls.unshift(wall);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(walls));
};

const deleteLocalWall = (id: string) => {
    const walls = getLocalWalls().filter(w => w.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(walls));
};

// --- API ---

export const api = {
  async saveWall(data: BetaBlockFile): Promise<{ id: string | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
          const avatarUrl = user?.user_metadata?.avatar_url;
          const isPublic = data.metadata.isPublic || false;
          
          const enrichedData = {
              ...data,
              metadata: {
                  ...data.metadata,
                  authorId: user.id,
                  authorAvatarUrl: avatarUrl
              }
          };

          const { data: result, error } = await supabase
            .from('walls')
            .insert([{ 
                name: data.metadata.name, 
                data: enrichedData,
                is_public: isPublic,
                user_id: user.id // NOUVEAU : Colonne explicite
            }])
            .select().single();

          if (!error && result) return { id: result.id, error: null };
      }
      throw new Error("Fallback to local");
    } catch (err: any) {
      console.log("Saving locally due to error:", err);
      const localId = `local_${Date.now()}`;
      const enrichedData = {
          ...data,
          metadata: { ...data.metadata, authorName: data.metadata.authorName || "Utilisateur Local", isPublic: false }
      };
      const localWall = { id: localId, name: data.metadata.name, data: enrichedData, created_at: new Date().toISOString(), is_public: false, is_local: true };
      saveLocalWall(localWall);
      return { id: localId, error: null };
    }
  },

  async updateWall(id: string, data: BetaBlockFile): Promise<{ error: string | null }> {
    if (id.startsWith('local_')) {
        const walls = getLocalWalls();
        const existing = walls.find(w => w.id === id);
        if (existing) {
            existing.data = data;
            existing.name = data.metadata.name;
            saveLocalWall(existing);
            return { error: null };
        }
        return { error: "Mur local introuvable" };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isPublic = data.metadata.isPublic || false;
      const { error } = await supabase
        .from('walls')
        .update({ 
            name: data.metadata.name, 
            data: data,
            is_public: isPublic,
            user_id: user?.id // S'assurer que le lien est maintenu
        })
        .eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: handleNetworkError(err) };
    }
  },

  async toggleWallVisibility(id: string, isPublic: boolean): Promise<{ error: string | null }> {
      if (id.startsWith('local_')) return { error: "Impossible de publier un mur local." };
      try {
          const { data: current, error: fetchError } = await supabase.from('walls').select('data').eq('id', id).single();
          if (fetchError || !current) throw fetchError || new Error("Mur introuvable");

          const updatedData = { ...current.data, metadata: { ...current.data.metadata, isPublic: isPublic } };
          const { error } = await supabase.from('walls').update({ is_public: isPublic, data: updatedData }).eq('id', id);
          if (error) throw error;
          return { error: null };
      } catch (err: any) {
          return { error: handleNetworkError(err) };
      }
  },

  async deleteWall(id: string): Promise<{ error: string | null }> {
    if (id.startsWith('local_')) { deleteLocalWall(id); return { error: null }; }
    try {
      const { error } = await supabase.from('walls').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (err: any) { return { error: handleNetworkError(err) }; }
  },

  async getWall(id: string): Promise<{ data: BetaBlockFile | null; error: string | null }> {
    if (id.startsWith('local_')) {
        const local = getLocalWalls().find(w => w.id === id);
        if (local) return { data: local.data as BetaBlockFile, error: null };
        return { data: null, error: "Mur local introuvable" };
    }
    try {
      const { data: result, error } = await supabase.from('walls').select('data').eq('id', id).single();
      if (error) throw error;
      return { data: result.data as BetaBlockFile, error: null };
    } catch (err: any) {
      const local = getLocalWalls().find(w => w.id === id);
      if (local) return { data: local.data as BetaBlockFile, error: null };
      return { data: null, error: handleNetworkError(err) };
    }
  },

  async getWallsList(userId?: string): Promise<{ data: any[] | null; error: string | null }> {
    let cloudWalls: any[] = [];
    let cloudError = null;

    try {
      let query = supabase
        .from('walls')
        .select('id, name, created_at, data, user_id, is_public')
        .eq('is_public', true);

      if (userId) {
        // Recherche hybride : soit via la nouvelle colonne, soit via le JSON pour les anciens
        query = query.or(`user_id.eq.${userId},data->metadata->>authorId.eq.${userId}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      cloudWalls = data || [];
    } catch (err: any) { cloudError = handleNetworkError(err); }

    const localWalls = getLocalWalls();
    const displayableLocals = userId ? localWalls : localWalls.filter(w => w.is_public);

    if (cloudError && cloudWalls.length === 0) return { data: localWalls, error: null };
    return { data: [...cloudWalls, ...displayableLocals], error: null };
  },

  async getUserProjects(userId: string): Promise<{ data: any[] | null; error: string | null }> {
    let cloudProjects: any[] = [];
    try {
      const { data, error } = await supabase
        .from('walls')
        .select('id, name, created_at, data, is_public, user_id')
        .or(`user_id.eq.${userId},data->metadata->>authorId.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (!error && data) cloudProjects = data;
    } catch (e) { console.warn("Cloud projects fetch failed"); }
    return { data: [...getLocalWalls(), ...cloudProjects], error: null };
  },

  async searchWalls(query: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const searchTerm = `%${query}%`;
      const { data, error } = await supabase
        .from('walls').select('id, name, created_at, data, user_id')
        .eq('is_public', true)
        .or(`name.ilike.${searchTerm},data->metadata->>authorName.ilike.${searchTerm}`)
        .order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      const localMatches = getLocalWalls().filter(w => w.name.toLowerCase().includes(query.toLowerCase()));
      return { data: localMatches, error: null };
    }
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    if (PROFILE_CACHE.has(userId)) return PROFILE_CACHE.get(userId)!;
    
    try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser && userId === 'local_user') return { id: 'local_user', display_name: 'Utilisateur Local', created_at: new Date().toISOString(), stats: { total_walls: getLocalWalls().length, total_likes: 0, beta_level: 1 } };

        // Essayer d'abord d'aller chercher dans les metadata de l'auth si c'est nous
        if (currentUser && currentUser.id === userId) {
             const profile = {
                id: userId,
                email: currentUser.email,
                display_name: currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || "Grimpeur",
                bio: currentUser.user_metadata?.bio || "",
                avatar_url: currentUser.user_metadata?.avatar_url,
                location: currentUser.user_metadata?.location || "",
                home_gym: currentUser.user_metadata?.home_gym || "",
                climbing_grade: currentUser.user_metadata?.climbing_grade || "",
                climbing_style: currentUser.user_metadata?.climbing_style || "",
                created_at: currentUser.created_at,
                stats: { total_walls: 0, total_likes: 0, beta_level: 1 }
            };
            PROFILE_CACHE.set(userId, profile);
            return profile;
        }

        // Sinon, on cherche via les murs publics (car Supabase Auth n'expose pas les profils par défaut sans table profiles)
        const { data: wallData } = await supabase
            .from('walls')
            .select('data')
            .or(`user_id.eq.${userId},data->metadata->>authorId.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (wallData) {
             const profile = {
                 id: userId,
                 display_name: wallData.data.metadata.authorName || "Grimpeur Inconnu",
                 created_at: wallData.data.metadata.timestamp,
                 avatar_url: wallData.data.metadata.authorAvatarUrl,
                 stats: { total_walls: 0, total_likes: 0, beta_level: 0 }
             };
             PROFILE_CACHE.set(userId, profile);
             return profile;
        }
        return null;
    } catch (e) { return null; }
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
      try {
        await supabase.auth.updateUser({ data: updates as any });
        PROFILE_CACHE.delete(userId); // Invalider le cache
      } catch (e) { console.warn("Profile update failed"); }
  },

  async uploadAvatar(file: File): Promise<string | null> {
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `avatar_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
          if (uploadError) throw uploadError; 
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          return data.publicUrl;
      } catch (e) { return null; }
  },

  async getWallSocialStatus(wallId: string, userId?: string): Promise<{ likes: number; hasLiked: boolean }> {
    if (wallId.startsWith('local_')) return { likes: 0, hasLiked: false };
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
      if (wallId.startsWith('local_')) return { added: false, error: null };
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
      } catch (err: any) { return { added: false, error: handleNetworkError(err) }; }
  },

  async getComments(wallId: string, currentUserId?: string): Promise<Comment[]> {
    if (!wallId || wallId.startsWith('local_')) return [];
    try {
        const { data, error } = await supabase.from('comments').select('*').eq('wall_id', wallId).order('created_at', { ascending: true });
        if (error || !data) return [];
        return await Promise.all(data.map(async (c: any) => {
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
      if (wallId.startsWith('local_')) return { error: "Commentaires désactivés en local" };
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
            if (error) throw error;
            return { added: true, error: null };
        }
      } catch (err: any) { return { added: false, error: handleNetworkError(err) }; }
  }
};
