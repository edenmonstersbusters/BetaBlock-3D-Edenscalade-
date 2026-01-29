
-- 1. NETTOYAGE DES TRIGGERS (On supprime TOUT ce qui pourrait ressembler à un trigger de notif)
DROP TRIGGER IF EXISTS on_comment ON public.comments;
DROP TRIGGER IF EXISTS on_comment_insert ON public.comments;
DROP TRIGGER IF EXISTS notify_new_comment ON public.comments;

DROP TRIGGER IF EXISTS on_wall_like ON public.wall_likes;
DROP TRIGGER IF EXISTS on_like_wall ON public.wall_likes;
DROP TRIGGER IF EXISTS notify_wall_like ON public.wall_likes;

DROP TRIGGER IF EXISTS on_comment_like ON public.comment_likes;
DROP TRIGGER IF EXISTS on_like_comment ON public.comment_likes;

DROP TRIGGER IF EXISTS on_new_wall ON public.walls;
DROP TRIGGER IF EXISTS notify_new_wall ON public.walls;

DROP TRIGGER IF EXISTS on_follow ON public.follows;
DROP TRIGGER IF EXISTS on_follow_user ON public.follows;

-- 2. RECRÉATION PROPRE DES TRIGGERS UNIQUES

-- A. Wall Likes
CREATE OR REPLACE FUNCTION public.notify_wall_like() RETURNS trigger AS $$
DECLARE wall_owner_id uuid;
BEGIN
  SELECT user_id INTO wall_owner_id FROM public.walls WHERE id = new.wall_id;
  IF new.user_id != wall_owner_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, resource_id)
    VALUES (wall_owner_id, new.user_id, 'like_wall', new.wall_id);
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_wall_like AFTER INSERT ON public.wall_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_wall_like();

-- B. Comments
CREATE OR REPLACE FUNCTION public.notify_comment() RETURNS trigger AS $$
DECLARE wall_owner_id uuid; parent_author_id uuid;
BEGIN
  IF new.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_author_id FROM public.comments WHERE id = new.parent_id;
    IF new.user_id != parent_author_id THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, resource_id, text_content)
      VALUES (parent_author_id, new.user_id, 'comment', new.wall_id, new.text);
    END IF;
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

CREATE TRIGGER on_comment AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_comment();

-- C. Comment Likes
CREATE OR REPLACE FUNCTION public.notify_comment_like() RETURNS trigger AS $$
DECLARE comment_author_id uuid; wall_id_ref uuid;
BEGIN
  SELECT user_id, wall_id INTO comment_author_id, wall_id_ref FROM public.comments WHERE id = new.comment_id;
  IF new.user_id != comment_author_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, resource_id)
    VALUES (comment_author_id, new.user_id, 'like_comment', wall_id_ref);
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_like AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_comment_like();

-- 3. SUPPRESSION DES DOUBLONS EXISTANTS DANS LA TABLE NOTIFICATIONS
DELETE FROM public.notifications
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
        ROW_NUMBER() OVER (
            PARTITION BY recipient_id, actor_id, type, resource_id, text_content 
            ORDER BY created_at ASC
        ) as rn
        FROM public.notifications
    ) t
    WHERE t.rn > 1
);
