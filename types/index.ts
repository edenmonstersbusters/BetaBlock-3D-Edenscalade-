

/**
 * Global JSX namespace augmentation for Three.js elements.
 * This ensures that elements like <mesh />, <group />, <ambientLight />, etc., are recognized by TypeScript.
 * We augment React.JSX to merge Three.js elements with standard HTML elements without overwriting them.
 */
declare global {
  namespace React {
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
        [elemName: string]: any;
      }
    }
  }
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
        // Index signature removed to avoid "Duplicate index signature" error
    }
  }
}

export interface WallMetadata {
  name: string;
  timestamp: string;
  appVersion: string;
}

export interface WallSegment {
  id: string;
  height: number;
  angle: number;
}

export interface WallConfig {
  width: number;
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