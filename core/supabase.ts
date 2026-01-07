
import { createClient } from '@supabase/supabase-js';

// ATTENTION SÉCURITÉ :
// Idéalement, utilisez la clé "anon" (publique) ici et configurez les politiques RLS (Row Level Security) dans Supabase.
// La clé fournie (service_role) donne tous les droits. Pour ce prototype, cela fonctionnera,
// mais ne laissez jamais une clé service_role dans une application front-end publique en production.

const SUPABASE_URL = 'https://ezfbjejmhfkpfxbmlwpo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZmJqZWptaGZrcGZ4Ym1sd3BvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzcwODg2NiwiZXhwIjoyMDgzMjg0ODY2fQ.W8WMmvOFSIdxlQQ70obqqGutn0jdVbkrTO9WR-O2LEo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
