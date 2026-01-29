
import 'react';

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        mesh: any;
        group: any;
        meshStandardMaterial: any;
        lineBasicMaterial: any;
        boxGeometry: any;
        meshBasicMaterial: any;
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
}

export interface WallMetadata {
  name: string;
  timestamp: string;
  appVersion: string;
  thumbnail?: string;
  authorId?: string;
  authorName?: string;
  authorAvatarUrl?: string;
  isPublic?: boolean;
  
  // Remix fields
  parentId?: string;
  parentName?: string;
  parentAuthorName?: string;
  remixMode?: 'structure' | 'holds' | null;
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

export type AppMode = 'BUILD' | 'SET' | 'VIEW';

export interface BetaBlockFile {
  version: string;
  metadata: WallMetadata;
  config: WallConfig;
  holds: PlacedHold[];
}

export interface UserProfile {
  id: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  
  // New SQL Fields
  bio?: string;
  location?: string;
  home_gym?: {
    name: string;
    city?: string;
    address?: string;
    country?: string;
    uri?: string;
  } | null; // JSONB in SQL
  climbing_grade?: string;
  climbing_style?: string;
  
  created_at: string;
  
  // Computed stats
  stats?: {
    total_walls: number;
    total_likes: number;
    beta_level: number;
    followers_count: number;
    following_count: number;
  };
  
  // State for current user
  is_following?: boolean;
}

export interface Comment {
  id: string;
  wall_id: string;
  user_id: string;
  author_name: string;
  author_avatar_url?: string;
  parent_id: string | null;
  text: string;
  created_at: string;
  likes_count?: number;
  user_has_liked?: boolean;
  replies?: Comment[];
}

export interface SocialCounts {
  likes: number;
  comments: number;
}

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  actor_name?: string;     // Enrichi
  actor_avatar_url?: string; // Enrichi
  type: 'follow' | 'unfollow' | 'new_wall' | 'comment' | 'like_wall' | 'like_comment';
  resource_id?: string;
  resource_name?: string; // Enrichi si c'est un mur
  text_content?: string; // Enrichi pour les commentaires
  is_read: boolean;
  created_at: string;
}

export interface ModalConfig {
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  isAlert?: boolean;
  isSaveDialog?: boolean;
  isExitDialog?: boolean;
  isShareViewerDialog?: boolean;
}

export interface ContextMenuData {
  type: 'HOLD' | 'SEGMENT';
  id: string;
  x: number;
  y: number;
  wallX?: number;
  wallY?: number;
  subMenu?: 'COLOR';
}
