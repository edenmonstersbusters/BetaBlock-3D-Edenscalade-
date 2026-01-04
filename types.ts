
import React from 'react';
import { ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Global JSX namespace augmentation for Three.js elements.
 * This ensures that elements like <mesh />, <group />, <ambientLight />, etc., are recognized by TypeScript.
 * We augment React.JSX to merge Three.js elements with standard HTML elements without overwriting them.
 * This fix addresses the "Property does not exist on type 'JSX.IntrinsicElements'" errors for both HTML and Three.js tags.
 */
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
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
