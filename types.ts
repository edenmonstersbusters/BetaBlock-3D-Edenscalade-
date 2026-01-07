
import 'react';

/**
 * Global JSX namespace augmentation for Three.js elements.
 * This ensures that elements like <mesh />, <group />, <ambientLight />, etc., are recognized by TypeScript.
 * We augment the global JSX namespace to merge Three.js elements with standard HTML elements without overwriting them.
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      meshStandardMaterial: any;
      ambientLight: any;
      directionalLight: any;
      hemisphereLight: any;
      pointLight: any;
      spotLight: any;
      primitive: any;
      color: any;
    }
  }
}

export interface WallMetadata {
  name: string;
  timestamp: string;
  appVersion: string;
  thumbnail?: string;
  authorId?: string; // ID Supabase de l'auteur
  authorName?: string; // Nom d'affichage (futur)
}

export interface WallSegment {
  id: string;
  height: number; // Length of the segment in meters
  angle: number; // Angle in degrees. 0 = vertical, positive = overhang, negative = slab
}

export interface WallConfig {
  width: number; // Global width in meters
  segments: WallSegment[];
}

export interface HoldDefinition {
  id: string;
  name: string;
  filename: string;
  category?: string;
  baseScale?: number;
}

export interface PlacedHold {
  id: string;
  modelId: string;
  filename: string;
  modelBaseScale?: number;
  segmentId: string;
  x: number;
  y: number;
  spin: number;
  scale: [number, number, number];
  color?: string;
}

export type AppMode = 'BUILD' | 'SET' | 'VIEW';

export interface BetaBlockFile {
  version: string;
  metadata: WallMetadata;
  config: WallConfig;
  holds: PlacedHold[];
}

// --- SOCIAL TYPES ---

export interface Comment {
  id: string;
  wall_id: string;
  user_id: string;
  author_name: string; // Stocké pour simplifier l'affichage sans jointure complexe
  parent_id: string | null;
  text: string;
  created_at: string;
  likes_count?: number; // Count agrégé
  user_has_liked?: boolean; // État pour l'utilisateur courant
  replies?: Comment[]; // Structure d'arbre pour l'UI
}

export interface SocialCounts {
  likes: number;
  comments: number;
}
