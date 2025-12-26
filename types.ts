
import { ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import React from 'react';

/**
 * Global JSX namespace augmentation for Three.js elements.
 * This ensures that standard Three.js tags used in React Three Fiber are recognized by TypeScript.
 */
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
  /**
   * Modern React (18+) often resolves JSX elements through the React.JSX namespace.
   * Augmenting this ensures compatibility with the latest JSX transforms.
   */
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}

/**
 * Explicitly augment the 'react' module's internal JSX namespace.
 * This handles cases where the compiler resolves types directly through the React module declaration.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
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
  spin: number; // Rotation de la prise sur elle-même en degrees
  
  scale: [number, number, number];
  color?: string;
}

export type AppMode = 'BUILD' | 'SET';
