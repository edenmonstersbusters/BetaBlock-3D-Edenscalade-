
import { supabase } from './supabase';
import { BetaBlockFile } from '../types';

export const api = {
  /**
   * Sauvegarde un mur dans la base de données.
   * Retourne l'ID du mur sauvegardé ou une erreur.
   */
  async saveWall(data: BetaBlockFile): Promise<{ id: string | null; error: string | null }> {
    try {
      // On insert une nouvelle entrée. 
      // Note: Pour une mise à jour d'un mur existant, on pourrait vérifier si un ID existe déjà,
      // mais pour l'instant, on crée une nouvelle "version" à chaque sauvegarde cloud pour simplifier le partage.
      const { data: result, error } = await supabase
        .from('walls')
        .insert([
          { 
            name: data.metadata.name,
            data: data 
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return { id: result.id, error: null };
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde Supabase:", err);
      return { id: null, error: err.message || "Erreur inconnue" };
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
      console.error("Erreur lors du chargement Supabase:", err);
      return { data: null, error: err.message || "Erreur inconnue" };
    }
  },

  /**
   * Récupère la liste des murs publics (métadonnées uniquement).
   * Limitée aux 50 derniers pour la performance.
   * NOTE: On récupère 'data' pour avoir accès à la miniature, mais on le typera différemment dans l'interface UI
   */
  async getWallsList(): Promise<{ data: { id: string; name: string; created_at: string; data?: any }[] | null; error: string | null }> {
    try {
      // On inclut 'data' pour récupérer la miniature (metadata.thumbnail)
      // Attention : Cela peut rendre la réponse plus lourde. 
      const { data, error } = await supabase
        .from('walls')
        .select('id, name, created_at, data')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      console.error("Erreur lors du chargement de la liste:", err);
      return { data: null, error: err.message || "Erreur inconnue" };
    }
  }
};
