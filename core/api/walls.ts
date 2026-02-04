
import { supabase } from '../supabase';
import { BetaBlockFile } from '../../types';
import { handleNetworkError, enrichWithProfiles } from './utils';

export const wallsApi = {
  async saveWall(data: BetaBlockFile): Promise<{ id: string | null; error: string | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Vous devez être connecté.");
      
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
            description: data.metadata.description || null,
            climbing_type: data.metadata.climbingType || 'boulder',
            grade_fr: data.metadata.gradeFr || '6a',
            grade_v: data.metadata.gradeV || 'V3',
            styles: data.metadata.styles || [],
            user_id: user.id, 
            data: enrichedData,
            is_public: data.metadata.isPublic || false,
            parent_id: data.metadata.parentId || null
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
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('walls')
        .update({ 
            name: data.metadata.name, 
            description: data.metadata.description || null,
            climbing_type: data.metadata.climbingType || 'boulder',
            grade_fr: data.metadata.gradeFr || '6a',
            grade_v: data.metadata.gradeV || 'V3',
            styles: data.metadata.styles || [],
            user_id: user?.id,
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
       
       if (!current || !current.data) throw new Error("Données du mur introuvables");

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
      const { data: result, error } = await supabase.from('walls').select('data, user_id, updated_at').eq('id', id).single();
      if (error) throw error;
      if (!result) throw new Error("Mur introuvable");

      let fileData = result.data as BetaBlockFile;
      if (!fileData || !fileData.metadata) throw new Error("Données corrompues");

      const authorId = result.user_id || fileData.metadata.authorId;

      if (authorId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', authorId)
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

  async getWallsList(filters?: any): Promise<{ data: any[] | null; error: string | null }> {
    try {
      let query = supabase.from('walls').select('id, name, created_at, updated_at, data, user_id, climbing_type, grade_fr, grade_v, styles').eq('is_public', true);
      
      if (filters) {
          if (filters.climbingType) query = query.eq('climbing_type', filters.climbingType);
          if (filters.gradeFr) query = query.eq('grade_fr', filters.gradeFr);
          if (filters.styles && filters.styles.length > 0) {
              query = query.contains('styles', filters.styles);
          }
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
      
      if (error) throw error;
      const enriched = await enrichWithProfiles(data || [], 'WALL');
      
      return { data: enriched, error: null };
    } catch (err: any) {
      return { data: null, error: handleNetworkError(err) };
    }
  },

  async getUserProjects(userId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase.from('walls')
        .select('id, name, created_at, updated_at, data, is_public, user_id, climbing_type, grade_fr, grade_v, styles')
        .or(`user_id.eq.${userId},data->metadata->>authorId.eq.${userId}`)
        .order('updated_at', { ascending: false });
      
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
      const { data, error } = await supabase.from('walls').select('id, name, created_at, updated_at, data, user_id, climbing_type, grade_fr, grade_v, styles').eq('is_public', true).or(`name.ilike.${searchTerm},data->metadata->>authorName.ilike.${searchTerm}`).order('created_at', { ascending: false }).limit(50);
      
      if (error) throw error;
      const enriched = await enrichWithProfiles(data || [], 'WALL');
      
      return { data: enriched, error: null };
    } catch (err: any) {
      return { data: null, error: handleNetworkError(err) };
    }
  },
};
