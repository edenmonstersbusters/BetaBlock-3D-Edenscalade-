
-- ==========================================
-- 1. NOTIFICATION POUR LIKE DE MUR
-- ==========================================
CREATE OR REPLACE FUNCTION public.notify_wall_like() 
RETURNS trigger AS $$
DECLARE
  wall_owner_id uuid;
BEGIN
  -- Trouver le propriétaire du mur
  SELECT user_id INTO wall_owner_id FROM public.walls WHERE id = new.wall_id;
  
  -- On ne s'envoie pas de notification à soi-même
  IF new.user_id != wall_owner_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, resource_id)
    VALUES (wall_owner_id, new.user_id, 'like_wall', new.wall_id);
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_wall_like ON public.wall_likes;
CREATE TRIGGER on_wall_like AFTER INSERT ON public.wall_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_wall_like();

-- ==========================================
-- 2. NOTIFICATION POUR COMMENTAIRE / RÉPONSE
-- ==========================================
CREATE OR REPLACE FUNCTION public.notify_comment() 
RETURNS trigger AS $$
DECLARE
  wall_owner_id uuid;
  parent_author_id uuid;
BEGIN
  -- 1. Si c'est une RÉPONSE (parent_id existe)
  IF new.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_author_id FROM public.comments WHERE id = new.parent_id;
    IF new.user_id != parent_author_id THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, resource_id, text_content)
      VALUES (parent_author_id, new.user_id, 'comment', new.wall_id, new.text);
    END IF;
  
  -- 2. Si c'est un NOUVEAU commentaire sur le mur
  ELSE
    SELECT user_id INTO wall_owner_id FROM public.walls WHERE id = new.wall_id;
    IF new.user_id != wall_owner_id THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, resource_id, text_content)
      VALUES (wall_owner_id, new.user_id, 'comment', new.wall_id, new.text);
    END IF;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment ON public.comments;
CREATE TRIGGER on_comment AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment();

-- ==========================================
-- 3. FORCER L'IDENTITÉ POUR LE REALTIME
-- ==========================================
-- Indispensable pour que Supabase envoie les données complètes en temps réel
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.walls REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
