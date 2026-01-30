
# 🗺️ Structure du Projet BetaBlock 3D

Ce document recense l'intégralité des fichiers du projet.
**Note :** Une refonte architecturale est planifiée pour diviser les fichiers > 100 lignes.

---

## 🏗️ Architecture Cible V2 (Plan de Refactoring)

Les fichiers suivants sont marqués pour découpage immédiat afin d'améliorer la maintenabilité sans altérer la logique.

### 1. Core API (`core/api/`)
Remplacement de `core/api.ts` par un dossier modulaire :
- `index.ts` (Point d'entrée unique, Facade)
- `walls.ts` (CRUD Murs)
- `social.ts` (Likes, Comments, Follows)
- `profile.ts` (Users, Avatars)
- `notifications.ts` (Notifs système)
- `utils.ts` (Helpers & Error Handling)

### 2. Viewer Social (`features/viewer/components/social/`)
Découpage de `SocialFeed.tsx` :
- `SocialFeed.tsx` (Orchestrateur)
- `CommentItem.tsx` (Composant récursif)
- `CommentInput.tsx` (Formulaire)

### 3. Modales UI (`components/ui/modals/`)
Découpage de `GlobalModal.tsx` :
- `GlobalModal.tsx` (Wrapper)
- `SaveModalContent.tsx`
- `ShareModalContent.tsx`
- `ConfirmModalContent.tsx`

### 4. Viewer Panel (`features/viewer/components/`)
Découpage de `ViewerPanel.tsx` :
- `ViewerPanel.tsx` (Logique & Layout)
- `ViewerStats.tsx` (Grille de statistiques)
- `ViewerHeader.tsx` (Titre & Auteur)

---

## 📂 Core (Noyau)

| Fichier | Lignes Actuelles |
| :--- | :---: |
| `Scene.tsx` | 175 |
| `WallMesh.tsx` | 150 |
| `NotificationsContext.tsx` | 132 |
| `auth.ts` | 70 |
| `HoldModel.tsx` | 100 |
| `DragController.tsx` | 60 |
| `ScreenshotHandler.tsx` | 55 |
| `supabase.ts` | 15 |

---

## 📂 Features (Fonctionnalités)

### 🏗️ Builder (Éditeur)
| Fichier | Lignes Actuelles |
| :--- | :---: |
| `RouteEditorPanel.tsx` | 140 |
| `WallEditorPage.tsx` | 130 |
| `components/HoldCatalogue.tsx` | 120 |
| `EditorPanel.tsx` | 110 |
| `hooks/useEditorLogic.ts` | 100 |
| `components/HoldInspector.tsx` | 75 |

### 🖼️ Gallery & Viewer
| Fichier | Lignes Actuelles |
| :--- | :---: |
| `GalleryPage.tsx` | 165 |
| `WallCard.tsx` | 90 |
| `ViewerPanel.tsx` | 186 |
| `components/SocialFeed.tsx` | 200 |

### 👤 Profile & Social
| Fichier | Lignes Actuelles |
| :--- | :---: |
| `ProfilePage.tsx` | 120 |
| `components/ProfileHero.tsx` | 110 |
| `components/GymSearchSelector.tsx` | 130 |
| `components/ProfileStats.tsx` | 90 |

### 📁 Projects
| Fichier | Lignes Actuelles |
| :--- | :---: |
| `ProjectsPage.tsx` | 100 |
| `components/DeleteProjectModal.tsx` | 75 |

---

## 📂 Components UI (Partagés)

| Fichier | Lignes Actuelles |
| :--- | :---: |
| `NotificationsMenu.tsx` | 165 |
| `ToastNotification.tsx` | 120 |
| `auth/AuthModal.tsx` | 115 |
| `ContextMenu.tsx` | 85 |
| `UserAvatar.tsx` | 75 |
| `UserListModal.tsx` | 60 |

---

## 📂 Utils & Hooks

| Fichier | Lignes Actuelles |
| :--- | :---: |
| `hooks/useWallData.ts` | 120 |
| `hooks/useRealtimeNotifications.ts`| 90 |
| `types.ts` | 90 |
| `utils/geometry.ts` | 65 |
| `hooks/useHistory.ts` | 55 |
| `hooks/useKeyboardShortcuts.ts` | 50 |

