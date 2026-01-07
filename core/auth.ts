
import { supabase } from './supabase';

export const auth = {
  /**
   * Inscrit un nouvel utilisateur avec un pseudo optionnel.
   */
  async signUp(email: string, password: string, displayName?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0], // Pseudo ou partie locale de l'email par défaut
          }
        }
      });
      return { data, error };
    } catch (e: any) {
      console.warn("Auth SignUp Error (Offline?):", e);
      return { data: null, error: e.message || "Erreur de connexion" };
    }
  },

  /**
   * Connecte un utilisateur existant.
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (e: any) {
      console.warn("Auth SignIn Error (Offline?):", e);
      return { data: null, error: e.message || "Erreur de connexion" };
    }
  },

  /**
   * Déconnecte l'utilisateur.
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  /**
   * Récupère l'utilisateur courant de manière sécurisée.
   * Si le réseau échoue, renvoie null au lieu de throw.
   */
  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (e) {
      // En cas d'erreur réseau (fetch failed) ou pas de session, on reste en mode anonyme
      return null;
    }
  },

  /**
   * Écoute les changements d'état (login/logout).
   */
  onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
  }
};
