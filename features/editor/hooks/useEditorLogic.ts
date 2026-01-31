
import React, { useCallback, Dispatch, SetStateAction } from 'react';
import * as THREE from 'three';
import { calculateLocalCoords } from '../../../utils/geometry';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { WallConfig, PlacedHold, AppMode, WallSegment, WallMetadata } from '../../../types';
import { useEditorActions } from './useEditorActions';

interface UseEditorLogicProps {
  mode: AppMode;
  config: WallConfig; setConfig: Dispatch<SetStateAction<WallConfig>>;
  holds: PlacedHold[]; setHolds: Dispatch<SetStateAction<PlacedHold[]>>;
  metadata: WallMetadata; setMetadata: Dispatch<SetStateAction<WallMetadata>>;
  user: any;
  undo: (current: any, apply: any) => void; redo: (current: any, apply: any) => void; recordAction: (state: any) => void;
  state: any; 
  onHome: () => void; onNewWall: () => void;
  cursorPosRef: React.MutableRefObject<{ x: number, y: number, segmentId: string } | null>;
}

export const useEditorLogic = ({
  mode, config, setConfig, holds, setHolds, metadata, setMetadata, user,
  undo, redo, recordAction, state, onHome, onNewWall, cursorPosRef
}: UseEditorLogicProps) => {

  const applyHistoryState = useCallback((hState: any) => {
    setConfig(hState.config);
    // Nettoyage préventif des prises nulles pouvant venir de l'historique
    setHolds((Array.isArray(hState.holds) ? hState.holds.filter((h: any) => h && h.id) : []));
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

  // Composition avec les actions globales
  const actions = useEditorActions({
      mode, user, setConfig, setHolds, setMetadata, state, saveToHistory, onHome, onNewWall
  });

  // --- Interaction Mur ---

  const handlePlaceHold = (position: THREE.Vector3, normal: THREE.Vector3, segmentId: string) => {
    if (metadata.remixMode === 'structure' || !state.selectedHold) return;
    const coords = calculateLocalCoords(position, segmentId, config);
    if (!coords) return;
    const segment = config.segments.find(s => s && s.id === segmentId);
    if (!segment) return;
    
    saveToHistory();
    setHolds(prev => [...prev, {
      id: crypto.randomUUID(), modelId: state.selectedHold!.id, filename: state.selectedHold!.filename, modelBaseScale: state.selectedHold!.baseScale,
      segmentId: segmentId, x: Math.max(-config.width/2, Math.min(config.width/2, coords.x)), y: Math.max(0, Math.min(segment.height, coords.y)),
      spin: state.holdSettings.rotation, scale: [state.holdSettings.scale, state.holdSettings.scale, state.holdSettings.scale], color: state.holdSettings.color,
    }]);
  };

  const handlePaste = useCallback((targetPosition?: { x: number, y: number, segmentId: string }) => {
      if (metadata.remixMode === 'structure' || state.clipboard.length === 0 || mode === 'VIEW') return;
      
      const validClipboard = state.clipboard.filter((h: PlacedHold) => h && h.id);
      if (validClipboard.length === 0) return;

      saveToHistory();
      const effectiveTarget = targetPosition || cursorPosRef.current;
      
      if (effectiveTarget) {
          const avgX = validClipboard.reduce((acc: number, h: PlacedHold) => acc + h.x, 0) / validClipboard.length;
          const avgY = validClipboard.reduce((acc: number, h: PlacedHold) => acc + h.y, 0) / validClipboard.length;
          setHolds(prev => [...prev, ...validClipboard.map((h: PlacedHold) => {
              let finalX = effectiveTarget.x + (h.x - avgX);
              let finalY = effectiveTarget.y + (h.y - avgY);
              const seg = config.segments.find(s => s && s.id === effectiveTarget.segmentId);
              if (seg) finalY = Math.max(0, Math.min(seg.height, finalY));
              return { ...h, id: crypto.randomUUID(), segmentId: effectiveTarget.segmentId, x: Math.max(-config.width/2, Math.min(config.width/2, finalX)), y: finalY };
          })]);
      } else {
          setHolds(prev => [...prev, ...validClipboard.map((h: PlacedHold) => ({ ...h, id: crypto.randomUUID(), x: Math.min(h.x + 0.1, config.width/2), y: h.y + 0.1 }))]);
      }
  }, [metadata.remixMode, state.clipboard, mode, saveToHistory, config, setHolds, cursorPosRef]);

  const removeHoldsAction = useCallback((ids: string[], askConfirm: boolean = false) => {
    if (ids.length === 0 || mode === 'VIEW' || metadata.remixMode === 'structure') return;
    const execute = () => { 
        saveToHistory(); 
        const s = new Set(ids); 
        setHolds(p => p.filter(h => h && !s.has(h.id))); 
        state.setSelectedPlacedHoldIds((p: string[]) => p.filter(i => !s.has(i))); 
    };
    askConfirm ? state.setModal({ title: "Supprimer", message: ids.length > 1 ? `Supprimer ces ${ids.length} prises ?` : "Supprimer cette prise ?", confirmText: "Supprimer", onConfirm: execute }) : execute();
  }, [saveToHistory, mode, setHolds, metadata.remixMode, state]);

  const removeSegmentAction = useCallback((id: string) => {
    if (mode === 'VIEW' || metadata.remixMode === 'holds') return;
    const hasHolds = holds.some(h => h && h.segmentId === id);
    state.setModal({
      title: "Supprimer le pan", message: hasHolds ? "Ce pan contient des prises. Tout supprimer ?" : "Supprimer ce pan ?",
      confirmText: "Supprimer", onConfirm: () => { 
          saveToHistory(); 
          setConfig(p => ({ ...p, segments: p.segments.filter(s => s && s.id !== id) })); 
          setHolds(p => p.filter(h => h && h.segmentId !== id)); 
      }
    });
  }, [mode, metadata.remixMode, holds, state, saveToHistory, setConfig, setHolds]);

  const updateSegmentQuickly = (id: string, updates: Partial<WallSegment>) => {
      if(mode === 'VIEW' || metadata.remixMode === 'holds') return;
      const seg = config.segments.find(s => s && s.id === id); if (!seg) return;
      saveToHistory();
      setConfig(prev => ({ ...prev, segments: prev.segments.map(s => (s && s.id === id) ? { ...s, height: Math.max(0.5, (updates.height !== undefined ? seg.height + updates.height : seg.height)), angle: Math.min(85, Math.max(-15, (updates.angle !== undefined ? seg.angle + updates.angle : seg.angle))) } : s) }));
  };

  // --- NOUVELLES FONCTIONS RÉPARÉES ---
  const handleRemoveAllHolds = useCallback(() => {
    if (mode === 'VIEW') return;
    state.setModal({
        title: "Vider le mur",
        message: "Attention, vous allez supprimer toutes les prises posées. Cette action est irréversible (sauf annulation immédiate).",
        confirmText: "Tout supprimer",
        isAlert: true,
        onConfirm: () => {
            saveToHistory();
            setHolds([]);
            state.setSelectedPlacedHoldIds([]);
        }
    });
  }, [mode, saveToHistory, setHolds, state]);

  const handleChangeAllHoldsColor = useCallback((color: string) => {
    if (mode === 'VIEW') return;
    saveToHistory();
    setHolds(prev => prev.map(h => ({ ...h, color: color })));
  }, [mode, saveToHistory, setHolds]);

  useKeyboardShortcuts({
    undo: performUndo, redo: performRedo, selectAll: () => state.setSelectedPlacedHoldIds(holds.filter(h => h && h.id).map(h => h.id)),
    copy: () => { if (state.selectedPlacedHoldIds.length > 0) state.setClipboard(JSON.parse(JSON.stringify(holds.filter(h => h && state.selectedPlacedHoldIds.includes(h.id))))); },
    paste: () => handlePaste(), save: () => actions.handleAction('save'), open: () => {}, deleteAction: () => removeHoldsAction(state.selectedPlacedHoldIds)
  }, [performUndo, performRedo, state.selectedPlacedHoldIds, removeHoldsAction, state.clipboard, mode, holds, config, metadata.remixMode, user, handlePaste, actions]);

  return { 
    performUndo, performRedo, saveToHistory, handlePlaceHold, handlePaste, 
    removeHoldsAction, removeSegmentAction, updateSegmentQuickly, 
    handleRemoveAllHolds, handleChangeAllHoldsColor, // Export des nouvelles fonctions
    ...actions 
  };
};
