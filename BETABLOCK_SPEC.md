# Spécification du Format BetaBlock (.json) - v1.1

Ce document définit la structure stricte des fichiers de données de l'écosystème BetaBlock. Ce format est conçu pour être la source de vérité unique pour l'éditeur, le moteur de simulation (IA) et la plateforme sociale.

## 1. Structure Racine
Le fichier est un objet JSON contenant les propriétés suivantes :
- `version` (string) : La version du schéma (actuellement "1.1").
- `metadata` (object) : Informations sur la création du fichier.
- `config` (object) : Configuration géométrique du mur.
- `holds` (array) : Liste des prises posées.

## 2. Métadonnées (`metadata`)
| Propriété | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Nom du mur donné par l'utilisateur. |
| `timestamp` | string | Date de création/modification au format ISO 8601. |
| `appVersion` | string | Version de l'application BetaBlock 3D. |

## 3. Configuration du Mur (`config`)
| Propriété | Type | Description |
| :--- | :--- | :--- |
| `width` | number | Largeur totale du mur en mètres (1.0 à 20.0). |
| `segments` | array | Liste ordonnée de segments (bas en haut). |

### 3.1 Segment (`WallSegment`)
- `id` (uuid) : Identifiant unique du panneau.
- `height` (number) : Hauteur du segment en mètres (min 0.5).
- `angle` (number) : Inclinaison en degrés (0 = vertical, >0 = dévers, <0 = dalle).

## 4. Prises (`holds`)
Chaque objet dans la liste représente une prise posée sur le mur.
- `id` (uuid) : Identifiant unique de l'instance.
- `modelId` (string) : Référence au catalogue des modèles 3D.
- `filename` (string) : Nom du fichier .glb source.
- `segmentId` (uuid) : ID du segment sur lequel la prise est fixée.
- `x` (number) : Position horizontale (mètres) par rapport au centre du mur.
- `y` (number) : Position verticale (mètres) par rapport au bas du segment spécifié.
- `spin` (number) : Rotation sur l'axe normal (degrés, 0-360).
- `scale` (array[3]) : Multiplicateur de taille [x, y, z].
- `color` (hex string) : Couleur hexadécimale de la prise.

## 5. Règles d'Intégrité
1. **Géométrie :** La position `y` d'une prise ne peut jamais être supérieure à la `height` de son `segmentId`.
2. **Largeur :** La valeur absolue de `x` d'une prise ne peut jamais dépasser `width / 2`.
3. **Continuité :** Les segments sont empilés selon leur index dans le tableau. Le bas du segment `n` est le sommet du segment `n-1`.
