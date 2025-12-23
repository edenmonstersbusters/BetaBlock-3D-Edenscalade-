
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
  id: string; // The filename without extension, or unique ID from catalogue
  name: string;
  filename: string; // e.g., "hold_01.glb"
  category?: string;
  baseScale?: number;
}

export interface PlacedHold {
  id: string;
  modelId: string; // Reference to HoldDefinition.id
  filename: string; // The actual filename to load from GitHub
  modelBaseScale?: number;
  
  // Attachement local au mur en mètres
  segmentId: string;
  x: number; // Position horizontale en mètres par rapport au centre
  y: number; // Position verticale en mètres par rapport au bas du segment
  spin: number; // Rotation de la prise sur elle-même en degrés
  
  scale: [number, number, number];
  color?: string;
}

export type AppMode = 'BUILD' | 'SET';
