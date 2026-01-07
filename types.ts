import 'react';

/**
 * Global JSX namespace augmentation for Three.js elements.
 * This ensures that elements like <mesh />, <group />, <ambientLight />, etc., are recognized by TypeScript.
 * We augment React.JSX to merge Three.js elements with standard HTML elements without overwriting them.
 */
declare module 'react' {
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

export type AppMode = 'BUILD' | 'SET';

export interface BetaBlockFile {
  version: string;
  metadata: WallMetadata;
  config: WallConfig;
  holds: PlacedHold[];
}