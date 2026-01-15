
# 🗺️ Structure du Projet BetaBlock 3D

Ce document recense l'intégralité des fichiers du projet, leur rôle, et leur volumétrie approximative. Il sert de carte pour la maintenance et le développement.

**Dernière mise à jour :** v1.2-refactor-p2 (Architecture Hooks)
**Total Fichiers :** ~38 fichiers
**État Global :** Application React/Three.js avec routing, backend Supabase, et architecture modulaire "View/Logic/State".

---

## 📂 Racine (Configuration & Entrée)

| Fichier | Lignes (~approx) | Description |
| :--- | :---: | :--- |
| `index.html` | 45 | Point d'entrée HTML. Contient les styles globaux (scrollbar) et l'importmap. |
| `index.tsx` | 35 | Point d'entrée React. Gère le Router (MemoryRouter) et le montage DOM. |
| `App.tsx` | **150** | **App Shell.** Gère le Routing et l'état global du mur (config, holds, user). Ne contient plus de logique UI complexe. |
| `types.ts` | 85 | Définitions TypeScript globales (Interfaces WallConfig, PlacedHold, UserProfile...). |
| `metadata.json` | 10 | Métadonnées de l'application. |
| `PROJECT_STRUCTURE.md` | N/A | Ce fichier. Documentation de l'architecture. |

---

## 📂 features/ (Fonctionnalités Métier)

### 🏗️ editor/ (Cœur de l'application)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `WallEditorPage.tsx` | **120** | **Vue Principale.** Connecte la logique, l'état et les composants UI. (Allégé grâce aux hooks). |
| `hooks/useEditorState.ts` | 45 | **Hook d'État.** Gère les sélections, les modales, le presse-papier et les paramètres temporaires. |
| `hooks/useEditorLogic.ts` | 150 | **Hook Métier.** Gère les interactions (placer prise, supprimer, raccourcis clavier, flux de sauvegarde). |

### 🏗️ builder/ (Panneaux Latéraux)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `EditorPanel.tsx` | 110 | Panneau latéral gauche (Mode Structure). Gestion des dimensions et segments. |
| `RouteEditorPanel.tsx` | 230 | Panneau latéral gauche (Mode Ouverture). Catalogue, liste des prises, paramètres. |
| `components/SegmentManager.tsx` | 55 | Sous-composant : Liste des panneaux du mur (sliders hauteur/angle). |
| `components/HoldCatalogue.tsx` | 115 | Sous-composant : Grille de sélection des modèles 3D avec prévisualisation. |
| `components/HoldInspector.tsx` | 75 | Sous-composant : Édition des propriétés d'une prise sélectionnée (Couleur, Rotation). |

### 🖼️ gallery/ (Hub Public)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `GalleryPage.tsx` | 150 | Page d'accueil. Liste des murs publics, recherche, navigation. |
| `WallCard.tsx` | 85 | Composant UI : Carte d'aperçu d'un mur (Thumbnail, Auteur, Titre). |

### 👁️ viewer/ (Mode Spectateur)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `ViewerPanel.tsx` | 180 | Panneau latéral pour voir un mur sans l'éditer. Stats, Likes, Auteur. |
| `components/SocialFeed.tsx` | 190 | Système de commentaires et réponses récursif. |
| `components/RemixModal.tsx` | 80 | Modale de choix pour remixer un mur (Structure vs Prises). |

### 👤 profile/ (Utilisateur)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `ProfilePage.tsx` | 280 | Page de profil utilisateur. Avatar, Bio, Stats et liste des murs créés. |

### 📁 projects/ (Dashboard Privé)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `ProjectsPage.tsx` | 130 | Liste des murs privés/publics de l'utilisateur avec gestion (Supprimer, Changer visibilité). |

---

## 📂 core/ (Noyau Logique & 3D)

| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `Scene.tsx` | 160 | Scène Canvas R3F. Gère la lumière, la caméra, le Drag&Drop et le rendu des composants 3D. |
| `WallMesh.tsx` | 140 | Génération procédurale du maillage du mur (Géométrie BufferGeometry) et textures. |
| `HoldModel.tsx` | 85 | Composant 3D d'une prise. Gère le chargement GLTF, la couleur, et les événements souris. |
| `DragController.tsx` | 65 | Logique mathématique pour déplacer les prises sur le mur en suivant la souris (Raycasting). |
| `ScreenshotHandler.tsx` | 55 | Utilitaire pour prendre une photo du canvas 3D (pour les miniatures). |
| `api.ts` | 200 | Couche d'abstraction API. Toutes les fonctions CRUD vers Supabase. |
| `auth.ts` | 75 | Wrapper pour l'authentification Supabase. |
| `supabase.ts` | 15 | Initialisation du client Supabase. |

---

## 📂 components/ (Composants UI Réutilisables)

| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `ui/GlobalModal.tsx` | 180 | Modale polyvalente (Confirmation, Sauvegarde, Partage, Alertes). |
| `ui/ContextMenu.tsx` | 95 | Menu clic-droit contextuel. |
| `ui/LoadingOverlay.tsx` | 20 | Écran de chargement plein écran. |
| `ui/FileControls.tsx` | 45 | Boutons Import/Export JSON local. |
| `ui/ColorPalette.tsx` | 40 | Sélecteur de couleurs prédéfinies. |
| `ui/UserAvatar.tsx` | 70 | Avatar utilisateur avec initiales ou image uploadée. |
| `ui/ActionWarning.tsx` | 30 | Toast notification temporaire. |
| `auth/AuthModal.tsx` | 110 | Formulaire de connexion et d'inscription. |

---

## 📂 hooks/ & utils/ (Logique Pure)

| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `hooks/useHistory.ts` | 55 | Hook personnalisé pour gérer l'Undo/Redo. |
| `hooks/useKeyboardShortcuts.ts` | 50 | Gestionnaire des raccourcis clavier. |
| `utils/geometry.ts` | 60 | Fonctions mathématiques : Conversion 3D <-> 2D. |
| `utils/validation.ts` | 25 | Vérification de l'intégrité des fichiers JSON. |

