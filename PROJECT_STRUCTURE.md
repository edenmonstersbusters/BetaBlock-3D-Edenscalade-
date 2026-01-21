
# 🗺️ Structure du Projet BetaBlock 3D

Ce document recense l'intégralité des fichiers du projet, leur rôle, et leur volumétrie approximative. Il sert de carte pour la maintenance et le développement.

**Dernière mise à jour :** v1.3 (Live Profile Sync & Gemini Gym Search)
**Total Fichiers :** ~39 fichiers
**État Global :** Application React/Three.js avec routing, backend Supabase, IA Gemini et architecture modulaire.

---

## 📂 Racine (Configuration & Entrée)

| Fichier | Lignes (~approx) | Description |
| :--- | :---: | :--- |
| `index.html` | 45 | Point d'entrée HTML. Styles globaux et ImportMap. |
| `index.tsx` | 35 | Point d'entrée React. Router et Montage. |
| `App.tsx` | **160** | **App Shell.** Routing, Auth Listener, et chargement initial des données de mur. |
| `types.ts` | 85 | Définitions TypeScript globales. |
| `metadata.json` | 10 | Métadonnées de l'application et permissions. |
| `PROJECT_STRUCTURE.md` | N/A | Ce fichier. |

---

## 📂 features/ (Fonctionnalités Métier)

### 🏗️ editor/ (Cœur de l'application)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `WallEditorPage.tsx` | **230** | **Vue Principale.** Orchestrateur de l'éditeur (Layout, Sidebar, Scene). |
| `hooks/useEditorState.ts` | 45 | **Hook d'État.** Variables locales UI (modales, sélections). |
| `hooks/useEditorLogic.ts` | **240** | **Hook Métier.** Logique complexe (Undo, Paste, Import, API Calls wrappers). |

### 🏗️ builder/ (Panneaux Édition)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `EditorPanel.tsx` | **115** | Panneau Structure (Gauche). Dimensions et segments. |
| `RouteEditorPanel.tsx` | **235** | Panneau Ouverture (Gauche). Catalogue, Inspecteur, Liste. |
| `components/SegmentManager.tsx` | 55 | Liste des segments (sliders). |
| `components/HoldCatalogue.tsx` | **120** | Grille des modèles 3D avec prévisualisation. |
| `components/HoldInspector.tsx` | 75 | Propriétés de la prise sélectionnée. |

### 🖼️ gallery/ (Hub Public)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `GalleryPage.tsx` | **155** | Page d'accueil. Grille, Recherche, Header. |
| `WallCard.tsx` | 85 | Composant UI : Carte d'un mur. |

### 👁️ viewer/ (Mode Spectateur)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `ViewerPanel.tsx` | **185** | Panneau Lecture Seule. Stats, Auteur Live, Social. |
| `components/SocialFeed.tsx` | **195** | Système de commentaires récursif. |
| `components/RemixModal.tsx` | 80 | Choix du mode de remix. |

### 👤 profile/ (Utilisateur)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `ProfilePage.tsx` | **285** | Page Profil. Carte Grimpeur, Edition, Stats. |
| `components/GymSearchSelector.tsx` | **105** | Recherche de salle via Google Gemini API. |

### 📁 projects/ (Dashboard Privé)
| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `ProjectsPage.tsx` | **230** | Gestion des murs (Privé/Public, Suppression sécurisée). |

---

## 📂 core/ (Noyau Logique & 3D)

| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `Scene.tsx` | **165** | Canvas R3F. Caméra, Lumières, DragControls. |
| `WallMesh.tsx` | **150** | Génération du mesh du mur et textures. |
| `HoldModel.tsx` | 90 | Composant 3D d'une prise (GLTF). |
| `DragController.tsx` | 65 | Logique de déplacement sur surface 3D. |
| `ScreenshotHandler.tsx` | 55 | Capture d'écran du canvas. |
| `api.ts` | **285** | **API Layer.** CRUD Supabase + Enrichissement Profils Live. |
| `auth.ts` | 75 | Wrapper Auth Supabase. |
| `supabase.ts` | 15 | Client Supabase. |

---

## 📂 components/ (UI Réutilisable)

| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `ui/GlobalModal.tsx` | **185** | Modale polyvalente (Save, Share, Alert). |
| `ui/ContextMenu.tsx` | 100 | Menu clic-droit. |
| `ui/LoadingOverlay.tsx` | 20 | Loader plein écran. |
| `ui/FileControls.tsx` | 45 | Boutons fichiers. |
| `ui/ColorPalette.tsx` | 40 | Sélecteur couleurs. |
| `ui/UserAvatar.tsx` | 70 | Avatar avec fallback dégradé. |
| `ui/ActionWarning.tsx` | 30 | Toast notification curseur. |
| `auth/AuthModal.tsx` | **115** | Login / Register. |

---

## 📂 hooks/ & utils/ (Helpers)

| Fichier | Lignes | Description |
| :--- | :---: | :--- |
| `hooks/useHistory.ts` | 55 | Hook Undo/Redo générique. |
| `hooks/useKeyboardShortcuts.ts` | 50 | Gestion clavier. |
| `utils/geometry.ts` | 60 | Maths 3D/2D. |
| `utils/validation.ts` | 25 | Validation JSON. |
