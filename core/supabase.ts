
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

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
