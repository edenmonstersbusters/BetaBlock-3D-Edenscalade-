
-- 1. SÉCURITÉ : AJOUT DES COLONNES SI MANQUANTES
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS text_content text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- 2. MISE À JOUR DES TYPES AUTORISÉS
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('follow', 'unfollow', 'new_wall', 'like_wall', 'comment'));

-- 3. LOGIQUE DE DÉSABONNEMENT (UNFOLLOW)
CREATE OR REPLACE FUNCTION public.handle_unfollow() 
RETURNS trigger AS $$
BEGIN
  -- On crée une notification pour le compte qui vient de perdre un abonné
  INSERT INTO public.notifications (recipient_id, actor_id, type)
  VALUES (old.following_id, old.follower_id, 'unfollow');
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activation du trigger sur DELETE (suppression du follow)
DROP TRIGGER IF EXISTS on_unfollow ON public.follows;
CREATE TRIGGER on_unfollow AFTER DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.handle_unfollow();

-- 4. FORCER LE TEMPS RÉEL (REALTIME)
-- On force l'identité de réplication pour envoyer toutes les infos
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- On s'assure que la table est bien dans la publication de Supabase
BEGIN;
  -- On essaie de l'ajouter (ignorer si déjà présent)
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
  END $$;
COMMIT;
