
-- 1. MISE À JOUR DES TYPES AUTORISÉS (CRUCIAL : Ajout de 'like_comment')
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('follow', 'unfollow', 'new_wall', 'like_wall', 'comment', 'like_comment'));

-- 2. TRIGGER POUR LES LIKES DE COMMENTAIRES (Nouveau)
CREATE OR REPLACE FUNCTION public.notify_comment_like() 
RETURNS trigger AS $$
DECLARE
  comment_author_id uuid;
  wall_id_ref uuid;
BEGIN
  -- Récupérer l'auteur du commentaire et l'ID du mur associé
  SELECT user_id, wall_id INTO comment_author_id, wall_id_ref FROM public.comments WHERE id = new.comment_id;
  
  -- Ne pas notifier si on like son propre commentaire
  IF new.user_id != comment_author_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, resource_id)
    VALUES (comment_author_id, new.user_id, 'like_comment', wall_id_ref);
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_like ON public.comment_likes;
CREATE TRIGGER on_comment_like AFTER INSERT ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment_like();

-- 3. VÉRIFICATION/RÉPARATION DU TRIGGER LIKE DE MUR
CREATE OR REPLACE FUNCTION public.notify_wall_like() 
RETURNS trigger AS $$
DECLARE
  wall_owner_id uuid;
BEGIN
  SELECT user_id INTO wall_owner_id FROM public.walls WHERE id = new.wall_id;
  
  -- Ne pas notifier si on like son propre mur
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
