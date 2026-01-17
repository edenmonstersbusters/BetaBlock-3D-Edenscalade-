
import { useCallback, useRef, Dispatch, SetStateAction } from 'react';
import * as THREE from 'three';
import { calculateLocalCoords } from '../../../utils/geometry';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { WallConfig, PlacedHold, AppMode, WallSegment, WallMetadata } from '../../../types';

interface UseEditorLogicProps {
  mode: AppMode;
  config: WallConfig;
  setConfig: Dispatch<SetStateAction<WallConfig>>;
  holds: PlacedHold[];
  setHolds: Dispatch<SetStateAction<PlacedHold[]>>;
  metadata: WallMetadata;
  setMetadata: Dispatch<SetStateAction<WallMetadata>>;
  user: any;
  
  // From History
  undo: (current: any, apply: any) => void;
  redo: (current: any, apply: any) => void;
  recordAction: (state: any) => void;

  // From State Hook
  state: any; 
  
  // Callbacks externes
  onHome: () => void;
  onNewWall: () => void;
}

export const useEditorLogic = ({
  mode, config, setConfig, holds, setHolds, metadata, setMetadata, user,
  undo, redo, recordAction, state, onHome, onNewWall
}: UseEditorLogicProps) => {

  const globalFileInputRef = useRef<HTMLInputElement>(null);

  // --- Gestion de l'Historique ---
  
  const applyHistoryState = useCallback((hState: any) => {
    setConfig(hState.config);
    setHolds(hState.holds);
    state.setIsDirty(true);
  }, [setConfig, setHolds, state]);

  const performUndo = useCallback(() => undo({ config, holds }, applyHistoryState), [undo, config, holds, applyHistoryState]);
  const performRedo = useCallback(() => redo({ config, holds }, applyHistoryState), [redo, config, holds, applyHistoryState]);

  const saveToHistory = useCallback(() => {
    if (mode !== 'VIEW') {
        recordAction({ config, holds });
        state.setIsDirty(true);
    }
  }, [recordAction, config, holds, mode, state]);


  // --- Logique Métier ---

  const handlePlaceHold = (position: THREE.Vector3, normal: THREE.Vector3, segmentId: string) => {
    if (metadata.remixMode === 'structure') return;
    if (!state.selectedHold) return;

    const coords = calculateLocalCoords(position, segmentId, config);
    if (!coords) return;
    
    const segment = config.segments.find(s => s.id === segmentId);
    if (!segment) return;
    
    // Clamp pour rester dans le mur
    const clampedY = Math.max(0, Math.min(segment.height, coords.y));
    const clampedX = Math.max(-config.width/2, Math.min(config.width/2, coords.x));
    
    saveToHistory();
    
    const newHold: PlacedHold = {
      id: crypto.randomUUID(),
      modelId: state.selectedHold.id,
      filename: state.selectedHold.filename,
      modelBaseScale: state.selectedHold.baseScale,
      segmentId: segmentId,
      x: clampedX,
      y: clampedY,
      spin: state.holdSettings.rotation,
      scale: [state.holdSettings.scale, state.holdSettings.scale, state.holdSettings.scale],
      color: state.holdSettings.color,
    };
    
    setHolds(prev => [...prev, newHold]);

    // LOGIQUE DE MESURE DYNAMIQUE
    // Si actif et qu'on a une référence, on bascule en mode mesure statique sur la paire
    if (state.isDynamicMeasuring && state.referenceHoldId) {
        state.setIsMeasuring(true);
        state.setSelectedPlacedHoldIds([state.referenceHoldId, newHold.id]);
    }
  };

  const removeHoldsAction = useCallback((ids: string[], askConfirm: boolean = false) => {
    if (ids.length === 0 || mode === 'VIEW') return;
    if (metadata.remixMode === 'structure') return;
    
    const executeDelete = () => {
        saveToHistory();
        const idSet = new Set(ids);
        setHolds(prev => prev.filter(h => !idSet.has(h.id)));
        state.setSelectedPlacedHoldIds((prev: string[]) => prev.filter(id => !idSet.has(id)));
        // Si la prise de référence est supprimée, on reset
        if (state.referenceHoldId && idSet.has(state.referenceHoldId)) {
            state.setReferenceHoldId(null);
        }
    };

    if (askConfirm) {
        state.setModal({
            title: "Supprimer",
            message: ids.length > 1 ? `Voulez-vous supprimer ces ${ids.length} prises ?` : "Voulez-vous supprimer cette prise ?",
            confirmText: "Supprimer",
            onConfirm: executeDelete
        });
    } else {
        executeDelete();
    }
  }, [saveToHistory, mode, setHolds, metadata.remixMode, state]);

  const removeSegmentAction = useCallback((id: string) => {
    if (mode === 'VIEW' || metadata.remixMode === 'holds') return;
    
    const segmentHolds = holds.filter(h => h.segmentId === id);
    const message = segmentHolds.length > 0 
      ? `Ce pan contient ${segmentHolds.length} prise(s). Elles seront définitivement supprimées. Confirmer la suppression ?`
      : "Voulez-vous vraiment supprimer ce pan de mur ?";
      
    state.setModal({
      title: "Supprimer le pan",
      message,
      confirmText: "Supprimer",
      onConfirm: () => {
        saveToHistory();
        setConfig(prev => ({
          ...prev,
          segments: prev.segments.filter((s) => s.id !== id),
        }));
        setHolds(prev => prev.filter(h => h.segmentId !== id));
      }
    });
  }, [mode, metadata.remixMode, holds, state, saveToHistory, setConfig, setHolds]);

  const updateSegmentQuickly = (id: string, updates: Partial<WallSegment>) => {
      if(mode === 'VIEW') return;
      if (metadata.remixMode === 'holds') return;
      
      const seg = config.segments.find(s => s.id === id);
      if (!seg) return;
      
      const newHeight = updates.height !== undefined ? seg.height + updates.height : seg.height;
      const newAngle = updates.angle !== undefined ? seg.angle + updates.angle : seg.angle;
      
      saveToHistory();
      setConfig(prev => ({ 
          ...prev, 
          segments: prev.segments.map(s => s.id === id ? { 
              ...s, 
              height: Math.max(0.5, newHeight), 
              angle: Math.min(85, Math.max(-15, newAngle)) 
          } : s) 
      }));
  };

  const handleAction = (type: 'save' | 'publish' | 'exit' | 'share') => {
      if (type === 'exit') {
        // En mode VIEW ou si aucune modif, on sort direct
        if (mode === 'VIEW' || !state.isDirty) {
            onHome();
            return;
        }

        // Sinon on demande confirmation
        state.setModal({
          title: "Quitter l'éditeur ?",
          message: "Toute modification non sauvegardée sera perdue.",
          isExitDialog: true,
          onConfirm: onHome
        });
        return;
      }

      if (type === 'share') {
        state.setModal({
          title: "Partager ce mur",
          message: "Lien unique et options de partage.",
          isShareViewerDialog: true
        });
        return;
      }

      if (!user) {
          state.setShowAuthModal(true);
          return;
      }
      
      setMetadata(prev => ({ ...prev, isPublic: type === 'publish' }));
      
      state.setModal({ 
          title: type === 'publish' ? "Publier dans le Hub" : "Enregistrer le projet", 
          message: type === 'publish' ? "Votre mur sera visible par toute la communauté." : "Le projet sera sauvegardé dans votre espace privé.",
          isSaveDialog: true 
      });
  };

  const handleNewWallRequest = () => {
      state.setModal({
          title: "Nouveau Mur",
          message: "Vous allez créer un mur vierge. Toutes les modifications non sauvegardées sur le mur actuel seront perdues.",
          confirmText: "Nouveau Mur",
          isAlert: true,
          onConfirm: onNewWall
      });
  };

  // --- Raccourcis Clavier ---

  useKeyboardShortcuts({
    undo: performUndo, 
    redo: performRedo, 
    selectAll: () => state.setSelectedPlacedHoldIds(holds.map(h => h.id)),
    copy: () => { 
        if (state.selectedPlacedHoldIds.length > 0) {
            const toCopy = holds.filter(h => state.selectedPlacedHoldIds.includes(h.id));
            state.setClipboard(JSON.parse(JSON.stringify(toCopy))); 
        }
    },
    paste: () => { 
        if (metadata.remixMode === 'structure') return;
        if (state.clipboard.length > 0 && mode !== 'VIEW') { 
            saveToHistory(); 
            const toPaste = state.clipboard.map((h: PlacedHold) => ({ 
                ...h, 
                id: crypto.randomUUID(), 
                x: h.x + 0.1, 
                y: Math.min(h.y + 0.1, config.segments.find(s => s.id === h.segmentId)?.height || h.y) 
            }));
            setHolds(prev => [...prev, ...toPaste]); 
        } 
    },
    save: () => handleAction('save'),
    open: () => globalFileInputRef.current?.click(),
    deleteAction: () => removeHoldsAction(state.selectedPlacedHoldIds)
  }, [performUndo, performRedo, state.selectedPlacedHoldIds, removeHoldsAction, state.clipboard, mode, holds, config, metadata.remixMode, user]);


  return {
    globalFileInputRef,
    performUndo, performRedo, saveToHistory,
    handlePlaceHold, removeHoldsAction, removeSegmentAction, updateSegmentQuickly, handleAction,
    handleNewWallRequest
  };
};
