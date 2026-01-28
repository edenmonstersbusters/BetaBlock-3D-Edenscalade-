
-- 1. Modifier la contrainte de la colonne 'type' pour accepter 'unfollow'
-- Attention : On supprime l'ancienne contrainte et on en recrée une nouvelle.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('follow', 'unfollow', 'new_wall', 'like_wall', 'comment'));

-- 2. Créer la fonction qui gère le désabonnement
create or replace function public.handle_unfollow() 
returns trigger as $$
begin
  -- On insère une notification pour dire à l'utilisateur (old.following_id)
  -- que l'acteur (old.follower_id) a arrêté de le suivre.
  -- On utilise OLD car la ligne vient d'être supprimée.
  insert into public.notifications (recipient_id, actor_id, type)
  values (old.following_id, old.follower_id, 'unfollow');
  
  return old;
end;
$$ language plpgsql security definer;

-- 3. Créer le trigger sur DELETE
drop trigger if exists on_unfollow on public.follows;
create trigger on_unfollow after delete on public.follows
  for each row execute function public.handle_unfollow();
