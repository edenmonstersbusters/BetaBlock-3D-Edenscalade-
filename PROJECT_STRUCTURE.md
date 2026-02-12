
# 🗺️ Structure du Projet BetaBlock 3D

## 🌟 Vue d'ensemble Fonctionnelle
BetaBlock 3D est une application web progressive (PWA) dédiée à la conception de murs d'escalade (Route Setting) et à l'aspect social de la grimpe.

**Fonctionnalités Clés :**
1.  **Builder 3D (Éditeur) :** Moteur 3D basé sur Three.js permettant de créer des murs segment par segment (hauteur, angle), d'y poser des prises (catalogue externe), et de manipuler un mannequin articulé pour tester les mouvements.
2.  **Visualiseur (Viewer) :** Mode lecture seule pour explorer les murs, voir les statistiques, et interagir (Like, Commentaire).
3.  **Galerie & Recherche :** Moteur de recherche de murs publics, filtrage, et mise en avant des créations.
4.  **Social :** Profils utilisateurs, abonnements (Follow), notifications temps réel, et intégration des salles (Gyms).
5.  **Système de Fichiers :** Format propriétaire JSON, Import/Export, Sauvegarde Cloud (Supabase), Remix de projets existants.

---

## 🚨 Audit de Complexité (Fichiers > 100 lignes)
*Liste des fichiers nécessitant une refactorisation immédiate pour maintenabilité.*

### 🟥 Critique (> 200 lignes)
1.  `core/Scene.tsx` (~550 lignes) : Le cœur du moteur 3D. Contient la logique de rendu, le raycasting, la physique du mannequin et la gestion des événements.
2.  `features/settings/SettingsPage.tsx` (~220 lignes) : Gestion monolithique de tous les formulaires de compte (Email, MDP, Suppression).
3.  `features/viewer/components/SocialFeed.tsx` (~200 lignes) : Gestion de l'arbre des commentaires, des réponses et des likes.

### 🟧 Élevé (130 - 190 lignes)
4.  `features/viewer/ViewerPanel.tsx` (~186 lignes) : Logique d'affichage, stats, auth checks et header.
5.  `features/onboarding/OnboardingWizard.tsx` (~180 lignes) : Logique des étapes successives et formulaires multiples.
6.  `components/ui/ColorPalette.tsx` (~180 lignes) : Contient la logique complexe de la pipette (EyeDropper) et du canvas.
7.  `features/gallery/GalleryPage.tsx` (~165 lignes) : Mêlange fetch, search logic, UI de grille et header.
8.  `components/ui/NotificationsMenu.tsx` (~165 lignes) : Gestion de l'affichage, du polling et du rendu conditionnel des notifs.
9.  `core/WallMesh.tsx` (~150 lignes) : Génération de géométrie procédurale et texturing.
10. `features/builder/RouteEditorPanel.tsx` (~140 lines) : Logique d'interface pour le mode "Setter" (Pose de prises).
11. `features/editor/components/EditorTopBar.tsx` (~140 lignes) : Trop de menus et de logiques de sauvegarde mélangées.
12. `core/NotificationsContext.tsx` (~132 lignes) : Logique de dédoublonnage temps réel trop complexe pour un Context.
13. `features/profile/components/GymSearchSelector.tsx` (~130 lignes) : Logique de fetch Nominatim et UI de dropdown.
14. `core/api/profile.ts` (~130 lignes) : Mélange de lectures, écritures et uploads.
15. `features/editor/WallEditorPage.tsx` (~130 lignes) : Orchestrateur principal, contient trop de useEffects et de states locaux.

### 🟨 Moyen (100 - 129 lignes)
16. `core/api/walls.ts` (~120 lignes) : CRUD complet des murs.
17. `hooks/useWallData.ts` (~120 lignes) : Hook "Dieu" qui gère le chargement, la sauvegarde et le state global du mur.
18. `features/profile/ProfilePage.tsx` (~120 lignes) : Fetching de données et orchestration de la page profil.
19. `features/builder/components/HoldCatalogue.tsx` (~120 lignes) : Logique d'affichage et de prévisualisation au survol.
20. `components/ui/ToastNotification.tsx` (~120 lignes) : Animations et switch cases trop verbeux.
21. `components/auth/AuthModal.tsx` (~115 lignes) : Gère Login ET Signup dans le même fichier.
22. `features/profile/components/ProfileHero.tsx` (~110 lignes) : Logique de Follow et d'édition mélangée à l'UI.
23. `core/Mannequin.tsx` (~110 lignes) : Logique de calcul des os (IK simplifié) intégrée au composant.
24. `features/builder/EditorPanel.tsx` (~110 lignes) : Gestion des segments (Builder mode).
25. `features/editor/hooks/useEditorLogic.ts` (~105 lignes) : Logique métier de l'éditeur (Undo/Redo/Paste).
26. `core/HoldModel.tsx` (~100 lignes) : Gestion du chargement GLTF, du clonage et des matériaux.
27. `features/projects/ProjectsPage.tsx` (~100 lignes) : Liste des projets et logique de suppression.
28. `features/editor/components/ScaleGuideWidget.tsx` (~100 lignes) : Widget Mannequin UI.
29. `features/auth/AuthCallbackPage.tsx` (~100 lignes) : Gestion de tous les cas de retour Auth (Invite, Recovery, Signup).
30. `api/sitemap.ts` (~100 lignes) : Génération XML serveur.

---

## 📂 Répertoire des Fichiers (Structure Actuelle)

### 🟢 Core (Noyau Technique)
| Fichier | Rôle |
| :--- | :--- |
| `core/Scene.tsx` | Scène 3D principale (Canvas, Lights, Controls). |
| `core/WallMesh.tsx` | Génération procédurale du maillage du mur. |
| `core/HoldModel.tsx` | Composant 3D pour une prise individuelle (GLTF). |
| `core/Mannequin.tsx` | Modèle 3D du grimpeur articulé. |
| `core/DragController.tsx` | Logique de déplacement des prises (Raycaster). |
| `core/ScreenshotHandler.tsx` | Capture d'écran du Canvas pour les miniatures. |
| `core/NotificationsContext.tsx` | Provider React pour les notifications globales. |
| `core/auth.ts` | Wrapper des fonctions d'authentification Supabase. |
| `core/supabase.ts` | Initialisation du client Supabase. |
| `core/api/index.ts` | Point d'entrée de l'API. |
| `core/api/walls.ts` | Appels API liés aux murs. |
| `core/api/social.ts` | Appels API liés aux interactions (Likes, Comments). |
| `core/api/profile.ts` | Appels API liés aux utilisateurs. |
| `core/api/notifications.ts` | Appels API liés aux notifications. |
| `core/api/utils.ts` | Utilitaires d'erreur et d'enrichissement de données. |

### 🏗️ Features (Fonctionnalités Métier)

#### Builder & Editor
| Fichier | Rôle |
| :--- | :--- |
| `features/editor/WallEditorPage.tsx` | Page principale de l'éditeur (Layout). |
| `features/builder/EditorPanel.tsx` | Panneau latéral gauche (Mode Structure). |
| `features/builder/RouteEditorPanel.tsx` | Panneau latéral gauche (Mode Prises). |
| `features/builder/components/*` | Composants UI spécifiques à l'éditeur (Catalogue, Inspecteur...). |
| `features/editor/hooks/*` | Hooks de logique métier (Undo, Redo, State). |
| `features/editor/components/*` | Composants UI de l'éditeur (TopBar, Sidebar...). |

#### Viewer & Galerie
| Fichier | Rôle |
| :--- | :--- |
| `features/gallery/GalleryPage.tsx` | Page d'accueil / Galerie publique. |
| `features/gallery/WallCard.tsx` | Carte d'aperçu d'un mur. |
| `features/viewer/ViewerPanel.tsx` | Panneau latéral en mode consultation. |
| `features/viewer/components/SocialFeed.tsx` | Fil de commentaires. |

#### Profil & User
| Fichier | Rôle |
| :--- | :--- |
| `features/profile/ProfilePage.tsx` | Page de profil utilisateur public/privé. |
| `features/projects/ProjectsPage.tsx` | Gestionnaire de fichiers (Dashboard utilisateur). |
| `features/settings/SettingsPage.tsx` | Paramètres du compte. |
| `features/onboarding/OnboardingWizard.tsx` | Assistant de première connexion. |
| `features/auth/AuthCallbackPage.tsx` | Page de redirection post-email. |

### 🧩 Components (UI Réutilisable)
| Fichier | Rôle |
| :--- | :--- |
| `components/ui/*` | Composants atomiques (Modales, Avatars, Toasts, Menus). |
| `components/auth/AuthModal.tsx` | Pop-up de connexion/inscription. |
| `components/layout/*` | Layouts globaux (Background 3D). |
| `components/SEO.tsx` | Gestion des métadonnées HTML (Helmet). |

### 🛠️ Utils & Hooks
| Fichier | Rôle |
| :--- | :--- |
| `hooks/useWallData.ts` | Hook de chargement des données. |
| `hooks/useHistory.ts` | Gestion de l'historique (Undo/Redo). |
| `hooks/useAutoSave.ts` | Sauvegarde automatique temporisée. |
| `hooks/useKeyboardShortcuts.ts` | Gestion des raccourcis clavier. |
| `hooks/useRealtimeNotifications.ts` | Gestion des souscriptions WebSocket. |
| `utils/geometry.ts` | Calculs mathématiques 3D. |
| `utils/validation.ts` | Validation du format JSON. |
| `types.ts` | Définitions TypeScript globales. |

