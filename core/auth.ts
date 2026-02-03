
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
          },
          // MODIFICATION ICI : On redirige vers la page de callback dédiée avec le type signup
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup` 
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
   * Met à jour l'email de l'utilisateur.
   */
  async updateEmail(newEmail: string) {
    try {
        const { data, error } = await supabase.auth.updateUser({ 
            email: newEmail 
        }, {
            emailRedirectTo: `${window.location.origin}/auth/callback?type=email_change`
        });
        return { data, error };
    } catch (e: any) {
        return { data: null, error: e.message };
    }
  },

  /**
   * Met à jour le mot de passe.
   */
  async updatePassword(newPassword: string) {
    try {
        const { data, error } = await supabase.auth.updateUser({ 
            password: newPassword 
        });
        return { data, error };
    } catch (e: any) {
        return { data: null, error: e.message };
    }
  },

  /**
   * Envoie un email de réinitialisation de mot de passe.
   */
  async resetPasswordForEmail(email: string) {
      try {
          const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
          });
          return { data, error };
      } catch (e: any) {
          return { data: null, error: e.message };
      }
  },

  /**
   * Hard Delete : Supprime définitivement l'utilisateur et toutes ses données (via Cascade SQL).
   */
  async deleteAccount() {
      try {
          // Appel de la fonction RPC 'delete_user_account' définie dans Supabase
          const { error } = await supabase.rpc('delete_user_account');

          if (error) throw error;

          // Déconnexion locale
          await this.signOut();
          
          return { error: null };
      } catch (e: any) {
          return { error: e.message };
      }
  },

  /**
   * Récupère l'utilisateur courant de manière sécurisée.
   */
  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (e: any) {
      const msg = (e.message || "").toLowerCase();
      if (msg.includes("refresh token") || msg.includes("json_token_not_found")) {
          console.warn("Session corrompue détectée, nettoyage automatique.");
          await supabase.auth.signOut();
      }
      return null;
    }
  },

  /**
   * Écoute les changements d'état (login/logout).
   */
  onAuthStateChange(callback: (user: any, event: string) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null, event);
    });
  }
};
