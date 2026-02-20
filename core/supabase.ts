
import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURATION SUPABASE SÉCURISÉE
 * 
 * 1. Utilisez EXCLUSIVEMENT la clé "anon" (publique) ici.
 * 2. Activez impérativement le RLS (Row Level Security) sur vos tables dans le dashboard Supabase.
 * 3. Ne mettez JAMAIS la clé "service_role" dans ce fichier.
 */

const SUPABASE_URL = 'https://ezfbjejmhfkpfxbmlwpo.supabase.co';
// Utilisation de la clé publique (anon) fournie par l'utilisateur
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZmJqZWptaGZrcGZ4Ym1sd3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MDg4NjYsImV4cCI6MjA4MzI4NDg2Nn0.RZxFE1gHS4gtznagF9RHFtp-JOFGCFVflO971rr7FcQ';

// --- FIX CRITIQUE POUR IFRAME / PREVIEW ---
// L'API navigator.locks plante dans certains environnements iframe (SecurityError).
// On la remplace par un mock simple AVANT d'initialiser Supabase.
try {
  if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
    const mockLock = {
      request: async (_name: string, _optionsOrCallback: any, _callback?: any) => {
        // Gérer les deux signatures : request(name, callback) et request(name, options, callback)
        const callback = _callback || _optionsOrCallback;
        if (typeof callback === 'function') {
          // On exécute le callback immédiatement sans verrou réel
          return await callback({ name: _name });
        }
      },
      query: async () => ({ held: [], pending: [] })
    };

    // Tenter d'écraser la propriété (peut être en lecture seule)
    Object.defineProperty(navigator, 'locks', {
      value: mockLock,
      configurable: true,
      writable: true
    });
  }
} catch (e) {
  console.warn('Impossible de patcher navigator.locks:', e);
}

// Configuration explicite pour Supabase aussi (double sécurité)
const options = {
  auth: {
    lock: {
      acquire: async (name: string, acquireTimeout: number) => { 
        // Retourne une fonction de release vide
        return async () => {}; 
      },
      release: async () => {},
    },
    // Désactiver le stockage local si nécessaire, mais on essaie de le garder
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, options) as any;
