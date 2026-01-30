
import { supabase } from '../supabase';

export const handleNetworkError = (err: any) => {
  console.error("Supabase Request Error:", err);
  if (err.code === '23503') return "Suppression impossible : ce mur possède des dépendances.";
  if (err.code === '23502') return "Erreur technique : Donnée obligatoire manquante (Wall Owner missing?).";
  if (err.message === 'Failed to fetch') return "Erreur Réseau : Impossible de joindre Supabase.";
  if (err.code === '42501' || err.message?.includes('security')) return "Action interdite : droits insuffisants.";
  return err.message || "Une erreur inconnue est survenue.";
};

// Helper pour enrichir une liste d'objets (murs ou commentaires) avec les profils à jour
export const enrichWithProfiles = async (items: any[], type: 'WALL' | 'COMMENT') => {
    if (!items || !Array.isArray(items) || items.length === 0) return items || [];

    // 1. Collecter les ID uniques
    const userIds = new Set<string>();
    items.forEach(item => {
        if (!item) return; // GUARD : Skip null items
        
        if (type === 'WALL') {
            // Priorité à la colonne user_id, fallback sur le JSON metadata
            const authorId = item.user_id || item.data?.metadata?.authorId;
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

    const profileMap = new Map<string, any>(profiles.map((p: any) => [p.id, p]));

    // 3. Appliquer les mises à jour
    return items.map(item => {
        if (!item) return item; // GUARD

        if (type === 'WALL') {
            const authorId = item.user_id || item.data?.metadata?.authorId;
            const profile = profileMap.get(authorId);
            if (profile && item.data && item.data.metadata) {
                // On écrase les métadonnées snapshot par les données live pour l'affichage
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
