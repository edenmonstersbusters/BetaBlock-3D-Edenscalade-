
import { supabase } from '../supabase';
import { UserProfile } from '../../types';
import { handleNetworkError } from './utils';

export const profileApi = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            // Fallback pour utilisateur sans profil BDD
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id === userId) {
                 return {
                     id: userId,
                     display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
                     avatar_url: user.user_metadata?.avatar_url,
                     created_at: user.created_at,
                     stats: { total_walls: 0, total_likes: 0, beta_level: 0, followers_count: 0, following_count: 0 }
                 };
            }
            return null;
        }

        // Récupérer les murs
        const { data: userWalls } = await supabase
            .from('walls')
            .select('id')
            .or(`user_id.eq.${userId},data->metadata->>authorId.eq.${userId}`);
        
        const wallIds = userWalls?.map(w => w.id) || [];
        
        let totalLikesCount = 0;
        if (wallIds.length > 0) {
            const { count } = await supabase
                .from('wall_likes')
                .select('*', { count: 'exact', head: true })
                .in('wall_id', wallIds);
            totalLikesCount = count || 0;
        }

        // Récupérer les stats sociales (Followers / Following)
        const { count: followersCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId);
        const { count: followingCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId);

        // Vérifier si l'utilisateur courant suit ce profil
        let isFollowing = false;
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && currentUser.id !== userId) {
            const { data: followData } = await supabase.from('follows').select('created_at').eq('follower_id', currentUser.id).eq('following_id', userId).maybeSingle();
            isFollowing = !!followData;
        }
        
        return {
            ...profile,
            home_gym: typeof profile.home_gym === 'string' ? JSON.parse(profile.home_gym) : profile.home_gym,
            stats: {
                total_walls: wallIds.length,
                total_likes: totalLikesCount, 
                beta_level: Math.floor((wallIds.length || 0) / 2) + 1,
                followers_count: followersCount || 0,
                following_count: followingCount || 0
            },
            is_following: isFollowing
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

  // Récupère les personnes qui suivent userId
  async getFollowers(userId: string): Promise<UserProfile[]> {
      try {
          const { data, error } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('following_id', userId);
            
          if (error || !data) return [];
          
          const ids = data.map(f => f.follower_id);
          if (ids.length === 0) return [];

          const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
          return (profiles || []) as UserProfile[];
      } catch (e) { return []; }
  },

  // Récupère les personnes que userId suit
  async getFollowing(userId: string): Promise<UserProfile[]> {
      try {
          const { data, error } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId);
            
          if (error || !data) return [];
          
          const ids = data.map(f => f.following_id);
          if (ids.length === 0) return [];

          const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
          return (profiles || []) as UserProfile[];
      } catch (e) { return []; }
  },
};
