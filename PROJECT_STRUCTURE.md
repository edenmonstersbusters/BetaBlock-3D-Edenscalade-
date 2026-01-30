
# 🗺️ Structure du Projet BetaBlock 3D

Ce document recense l'intégralité des fichiers du projet, leur rôle, et leur volumétrie (audit v1.5). Il sert de carte pour la maintenance et identifie les zones de refactoring prioritaire.

**État Global :** Application React/Three.js avec architecture modulaire.
**Dette Technique Identifiée :** Le fichier `core/api.ts` est monolithique et doit être découpé.

---

## 🚨 Fichiers Critiques (> 200 lignes ou complexes)

Ces fichiers sont les cibles prioritaires pour le découpage (Refactoring "SANS CODE" Plan).

| Fichier | Lignes | Statut | Action Requise |
| :--- | :---: | :---: | :--- |
| **`core/api.ts`** | **~335** | 🔴 **CRITIQUE** | **À diviser d'urgence.** Contient toute la logique backend (Murs, Users, Social). |
| `features/viewer/components/SocialFeed.tsx` | ~200 | 🟠 LOURD | Séparer logique de tri (Tree) et UI (`CommentItem`). |
| `components/ui/GlobalModal.tsx` | ~190 | 🟠 DENSE | Trop de responsabilités (Save, Share, Alert, Confirm). |
| `features/viewer/ViewerPanel.tsx` | ~186 | 🟠 DENSE | Extraire les sous-sections (Header, Stats). |

---

## 📂 Core (Noyau)

| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `Scene.tsx` | 175 | Canvas R3F, Lumières, Contrôles caméra. (Stable) |
| `WallMesh.tsx` | 150 | Génération procédurale du mesh et textures. |
| `NotificationsContext.tsx` | 132 | Logique globale des notifs temps réel. |
| `auth.ts` | 70 | Wrapper Auth Supabase (SignIn/Up/Out). |
| `HoldModel.tsx` | 100 | Composant 3D d'une prise (GLTF + Draco). |
| `DragController.tsx` | 60 | Logique de déplacement des prises (Raycasting). |
| `ScreenshotHandler.tsx` | 55 | Capture d'écran du canvas (Vue ISO). |
| `supabase.ts` | 15 | Initialisation Client Supabase. |

---

## 📂 Features (Fonctionnalités)

### 🏗️ Builder (Éditeur)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `RouteEditorPanel.tsx` | 140 | Panneau "Ouverture" (Catalogue, Liste, Inspecteur). |
| `WallEditorPage.tsx` | 130 | Orchestrateur principal de l'éditeur. |
| `components/HoldCatalogue.tsx` | 120 | Grille des prises & Preview. |
| `EditorPanel.tsx` | 110 | Panneau "Structure" (Dimensions). |
| `hooks/useEditorLogic.ts` | 100 | Logique métier (Undo, Paste, API). |
| `components/HoldInspector.tsx` | 75 | Édition des propriétés d'une prise. |
| `components/PlacedHoldsList.tsx` | 50 | Liste des prises posées. |
| `components/SegmentManager.tsx` | 50 | Gestion des pans (Hauteur/Angle). |

### 🖼️ Gallery & Viewer
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `GalleryPage.tsx` | 165 | Page d'accueil, Recherche, Grille. |
| `WallCard.tsx` | 90 | UI Carte d'un mur. |
| `ViewerPanel.tsx` | 186 | (Voir section critique). |
| `components/SocialFeed.tsx` | 200 | (Voir section critique). |

### 👤 Profile & Social
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `ProfilePage.tsx` | 120 | Page Profil (Héros, Stats, Portfolio). |
| `components/ProfileHero.tsx` | 110 | En-tête profil (Avatar, Bio, Follow). |
| `components/GymSearchSelector.tsx` | 130 | Recherche de salle (Nominatim API). |
| `components/ProfileStats.tsx` | 90 | Statistiques grimpeur. |

### 📁 Projects
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `ProjectsPage.tsx` | 100 | Gestionnaire de murs privés/publics. |
| `components/DeleteProjectModal.tsx` | 75 | Modale de suppression sécurisée. |

---

## 📂 Components UI (Partagés)

| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `NotificationsMenu.tsx` | 165 | Dropdown des notifications (UI complexe). |
| `ToastNotification.tsx` | 120 | Toasts animés (Portals). |
| `auth/AuthModal.tsx` | 115 | Login / Register Modal. |
| `ContextMenu.tsx` | 85 | Menu clic-droit (Copier/Coller/Supprimer). |
| `UserAvatar.tsx` | 75 | Avatar avec gestion upload & fallback. |
| `UserListModal.tsx` | 60 | Liste Followers/Following. |

---

## 📂 Utils & Hooks

| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `hooks/useWallData.ts` | 120 | Chargement/Sauvegarde des données mur. |
| `hooks/useRealtimeNotifications.ts`| 90 | Gestion WebSocket & Notifications Système. |
| `types.ts` | 90 | Types TypeScript globaux. |
| `utils/geometry.ts` | 65 | Maths 3D (Coordonnées locales/monde). |
| `hooks/useHistory.ts` | 55 | Undo/Redo Engine. |
| `hooks/useKeyboardShortcuts.ts` | 50 | Gestion Raccourcis Clavier. |

