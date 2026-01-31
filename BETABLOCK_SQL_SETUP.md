
# Configuration Supabase - Gestion de Compte & Soft Delete

Copiez-collez les scripts SQL ci-dessous dans le "SQL Editor" de votre projet Supabase pour permettre la suppression "douce" (Soft Delete) des comptes tout en gardant les murs.

## 1. Mettre à jour la table Profiles
On ajoute une colonne `is_deleted` pour marquer les utilisateurs supprimés sans effacer leurs données.

```sql
-- Ajout du flag de suppression
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
```

## 2. Configuration des URLs de Redirection (Emails)

Pour que les liens fonctionnent, allez dans **Authentication > URL Configuration**.
**Site URL** : `https://betablock-3d.fr`
**Redirect URLs** : Ajoutez impérativement :
- `https://betablock-3d.fr/auth/callback`
- `https://betablock-3d.fr/#/auth/callback`

## 3. Configuration des Templates d'Email (CRITIQUE)

Allez dans **Authentication > Email Templates** et remplacez le contenu **Source Code** des liens.

### A. Confirm Email (Inscription)
Le lien doit pointer vers notre nouvelle page de confirmation :
`<a href="{{ .SiteURL }}/auth/callback?type=signup&redirect_url={{ .ConfirmationURL }}">Confirmer mon email</a>`

### B. Invite User (Invitation)
Le lien pour accepter l'invitation :
`<a href="{{ .SiteURL }}/auth/callback?type=invite&access_token={{ .Token }}&refresh_token={{ .RefreshToken }}">Accepter l'invitation</a>`

### C. Reset Password
Le lien pour la récupération :
`<a href="{{ .SiteURL }}/auth/callback?type=recovery&access_token={{ .Token }}&refresh_token={{ .RefreshToken }}">Réinitialiser le mot de passe</a>`

### D. Confirm Email Change
`<a href="{{ .SiteURL }}/auth/callback?type=email_change&confirmation_url={{ .ConfirmationURL }}">Valider la nouvelle adresse</a>`
