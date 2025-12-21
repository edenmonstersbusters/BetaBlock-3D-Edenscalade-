
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
  position: [number, number, number]; // World position
  rotation: [number, number, number]; // Euler rotation
  scale: [number, number, number];
  color?: string; // Optional override
}

export type AppMode = 'BUILD' | 'SET';

export type OrientationMap = Record<string, [number, number, number]>;
