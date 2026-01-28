
-- 1. AJOUT DE LA COLONNE MANQUANTE (Indispensable pour que ça marche)
alter table public.notifications add column if not exists text_content text;

-- 2. CORRECTION DES TRIGGERS POUR GÉRER LES MURS SANS PROPRIÉTAIRE (ANCIENS MURS)

-- Trigger Commentaire Robuste
create or replace function public.handle_new_comment() 
returns trigger as $$
declare
  target_user_id uuid;
begin
  -- On essaie de trouver le propriétaire du mur
  select user_id into target_user_id from public.walls where id = new.wall_id;
  
  -- SÉCURITÉ : On ne crée la notification QUE si le mur a un propriétaire (target_user_id n'est pas NULL)
  -- et que ce n'est pas l'auteur du commentaire lui-même.
  if target_user_id is not null and target_user_id != new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, resource_id, text_content)
    values (target_user_id, new.user_id, 'comment', new.wall_id, substring(new.text from 1 for 100));
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger Like Robuste
create or replace function public.handle_new_like() 
returns trigger as $$
declare
  target_user_id uuid;
begin
  select user_id into target_user_id from public.walls where id = new.wall_id;
  
  if target_user_id is not null and target_user_id != new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, resource_id)
    values (target_user_id, new.user_id, 'like_wall', new.wall_id);
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger Follow Robuste (pour éviter doublons ou erreurs)
create or replace function public.handle_new_follow() 
returns trigger as $$
begin
  -- Vérification basique pour s'assurer que les ID existent
  if new.following_id is not null and new.follower_id is not null then
      insert into public.notifications (recipient_id, actor_id, type)
      values (new.following_id, new.follower_id, 'follow');
  end if;
  return new;
end;
$$ language plpgsql security definer;
