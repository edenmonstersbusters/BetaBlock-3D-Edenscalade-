
import { useCallback, Dispatch, SetStateAction } from 'react';
import * as THREE from 'three';
import { calculateLocalCoords } from '../../../utils/geometry';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { validateBetaBlockJson } from '../../../utils/validation';
import { WallConfig, PlacedHold, AppMode, WallSegment, WallMetadata, BetaBlockFile } from '../../../types';

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

  // Refs
  cursorPosRef: React.MutableRefObject<{ x: number, y: number, segmentId: string } | null>;
}

export const useEditorLogic = ({
  mode, config, setConfig, holds, setHolds, metadata, setMetadata, user,
  undo, redo, recordAction, state, onHome, onNewWall,
  cursorPosRef
}: UseEditorLogicProps) => {

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

  // 1. IMPORTATION FIABILISÉE
  const handleImportFile = useCallback((file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const validated = validateBetaBlockJson(json);
          
          if (validated) {
            saveToHistory();
            // Mise à jour atomique (ou presque)
            setConfig(validated.config);
            setHolds(validated.holds);
            // On garde l'ID auteur si c'est le même user, sinon on le laisse vide (nouveau propriétaire)
            setMetadata({
                ...validated.metadata,
                authorId: validated.metadata.authorId === user?.id ? user.id : undefined
            });
            state.setIsDirty(true);
            state.setModal({ title: "Succès", message: "Fichier chargé avec succès.", isAlert: true });
          } else {
            state.setModal({ title: "Erreur", message: "Fichier invalide ou corrompu.", isAlert: true });
          }
        } catch (err) {
          console.error(err);
          state.setModal({ title: "Erreur", message: "Impossible de lire le fichier.", isAlert: true });
        }
      };
      reader.readAsText(file);
  }, [saveToHistory, setConfig, setHolds, setMetadata, state, user]);

  // 2. PLACEMENT
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
  };

  // 3. COLLAGE INTELLIGENT (PASTE)
  const handlePaste = useCallback((targetPosition?: { x: number, y: number, segmentId: string }) => {
      if (metadata.remixMode === 'structure') return;
      if (state.clipboard.length === 0 || mode === 'VIEW') return;

      saveToHistory();

      // Déterminer la position cible : soit celle du clic droit, soit celle de la souris (Ctrl+V)
      // Si aucune position souris n'est connue (souris hors du mur), on retombera sur un offset par défaut.
      const effectiveTarget = targetPosition || cursorPosRef.current;

      if (effectiveTarget) {
          // On calcule le centre de gravité du clipboard pour coller "autour" de la cible
          const avgX = state.clipboard.reduce((acc: number, h: PlacedHold) => acc + h.x, 0) / state.clipboard.length;
          const avgY = state.clipboard.reduce((acc: number, h: PlacedHold) => acc + h.y, 0) / state.clipboard.length;

          const toPaste = state.clipboard.map((h: PlacedHold) => {
              const relX = h.x - avgX;
              const relY = h.y - avgY;
              
              // On applique la position cible + le décalage relatif
              let finalX = effectiveTarget.x + relX;
              let finalY = effectiveTarget.y + relY;

              // Clamping intelligent (Magnétisme)
              const seg = config.segments.find(s => s.id === effectiveTarget.segmentId);
              if (seg) {
                  finalY = Math.max(0, Math.min(seg.height, finalY));
              }
              finalX = Math.max(-config.width/2, Math.min(config.width/2, finalX));

              return {
                  ...h,
                  id: crypto.randomUUID(),
                  segmentId: effectiveTarget.segmentId, // On colle tout sur le segment cible
                  x: finalX,
                  y: finalY
              };
          });
          setHolds(prev => [...prev, ...toPaste]);
      } 
      // Si vraiment aucune position n'est connue (Ctrl+V sans survoler le mur), comportement fallback
      else {
          const toPaste = state.clipboard.map((h: PlacedHold) => {
              // On décale légèrement et on clamp
              let finalX = h.x + 0.1;
              let finalY = h.y + 0.1;
              const seg = config.segments.find(s => s.id === h.segmentId);
              
              if (seg) {
                 finalY = Math.min(finalY, seg.height);
              }
              finalX = Math.min(finalX, config.width/2);

              return { 
                  ...h, 
                  id: crypto.randomUUID(), 
                  x: finalX, 
                  y: finalY 
              };
          });
          setHolds(prev => [...prev, ...toPaste]);
      }
  }, [metadata.remixMode, state.clipboard, mode, saveToHistory, config, setHolds, cursorPosRef]);

  const removeHoldsAction = useCallback((ids: string[], askConfirm: boolean = false) => {
    if (ids.length === 0 || mode === 'VIEW') return;
    if (metadata.remixMode === 'structure') return;
    
    const executeDelete = () => {
        saveToHistory();
        const idSet = new Set(ids);
        setHolds(prev => prev.filter(h => !idSet.has(h.id)));
        state.setSelectedPlacedHoldIds((prev: string[]) => prev.filter(id => !idSet.has(id)));
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
        if (mode === 'VIEW' || !state.isDirty) {
            onHome();
            return;
        }
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
    paste: () => handlePaste(), // Appel sans argument = collage clavier
    save: () => handleAction('save'),
    // Note: Pour l'ouverture de fichier via raccourci, il faudrait trigger un input caché.
    // On simplifie en retirant le raccourci 'open' pour l'instant pour éviter la complexité de ref.
    open: () => {}, 
    deleteAction: () => removeHoldsAction(state.selectedPlacedHoldIds)
  }, [performUndo, performRedo, state.selectedPlacedHoldIds, removeHoldsAction, state.clipboard, mode, holds, config, metadata.remixMode, user, handlePaste, handleAction]);


  return {
    performUndo, performRedo, saveToHistory,
    handlePlaceHold, handlePaste, handleImportFile,
    removeHoldsAction, removeSegmentAction, updateSegmentQuickly, handleAction,
    handleNewWallRequest
  };
};
