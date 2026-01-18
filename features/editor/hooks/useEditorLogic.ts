
import { useCallback, Dispatch, SetStateAction } from 'react';
import * as THREE from 'three';
import { calculateLocalCoords } from '../../../utils/geometry';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { validateBetaBlockJson } from '../../../utils/validation';
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
  onTriggerImport: () => void; // NOUVEAU : Callback pour ouvrir la fenêtre de fichier
}

export const useEditorLogic = ({
  mode, config, setConfig, holds, setHolds, metadata, setMetadata, user,
  undo, redo, recordAction, state, onHome, onNewWall, onTriggerImport
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

  // 1. IMPORT FICHIER CENTRALISÉ
  const handleImportFile = async (file: File) => {
      try {
          const text = await file.text();
          const json = JSON.parse(text);
          const validated = validateBetaBlockJson(json);
          
          if (validated) {
              saveToHistory(); // Sauvegarde l'état actuel avant l'import
              setConfig(validated.config);
              setHolds(validated.holds);
              setMetadata(prev => ({ 
                  ...validated.metadata, 
                  // On garde l'appVersion actuelle, pas celle du fichier
                  appVersion: prev.appVersion,
                  // Si c'est un nouveau chargement, on garde l'auteur actuel s'il existe
                  authorId: prev.authorId 
              }));
              state.setModal(null); // Fermer d'éventuelles modales
              state.setIsDirty(false); // Reset dirty state car on vient de charger
          } else {
              state.setModal({
                  title: "Erreur de format",
                  message: "Le fichier JSON semble corrompu ou invalide.",
                  isAlert: true
              });
          }
      } catch (e) {
          console.error("Import failed", e);
          state.setModal({
              title: "Erreur de lecture",
              message: "Impossible de lire le fichier.",
              isAlert: true
          });
      }
  };

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
    if (state.isDynamicMeasuring && state.referenceHoldId) {
        state.setIsMeasuring(true);
        state.setSelectedPlacedHoldIds([state.referenceHoldId, newHold.id]);
    }
  };

  // 2. LOGIQUE DE COLLAGE INTELLIGENTE (Smart Paste)
  const handlePaste = (targetPosition?: { x: number, y: number, segmentId: string }) => {
    if (metadata.remixMode === 'structure') return;
    if (mode === 'VIEW') return;
    if (state.clipboard.length === 0) return;

    saveToHistory();

    const sourceHolds = state.clipboard;
    
    // Déterminer le point de référence pour le collage
    // Priorité : 1. Clic Droit (targetPosition) -> 2. Souris sur le mur (Ctrl+V) -> 3. Offset simple
    let refX = 0;
    let refY = 0;
    let targetSegmentId = sourceHolds[0].segmentId; // Par défaut le segment d'origine
    let isOffsetMode = true;

    if (targetPosition) {
        // Cas 1 : Clic Droit "Coller ici"
        refX = targetPosition.x;
        refY = targetPosition.y;
        targetSegmentId = targetPosition.segmentId;
        isOffsetMode = false;
    } else if (state.wallMousePosition) {
        // Cas 2 : Ctrl+V avec la souris sur le mur
        refX = state.wallMousePosition.x;
        refY = state.wallMousePosition.y;
        targetSegmentId = state.wallMousePosition.segmentId;
        isOffsetMode = false;
    }

    // Calculer le centre de gravité du groupe copié pour le repositionnement relatif
    const avgX = sourceHolds.reduce((sum: number, h: PlacedHold) => sum + h.x, 0) / sourceHolds.length;
    const avgY = sourceHolds.reduce((sum: number, h: PlacedHold) => sum + h.y, 0) / sourceHolds.length;

    const newHolds = sourceHolds.map((h: PlacedHold) => {
        let newX, newY, newSegmentId;

        if (isOffsetMode) {
             // Cas simple : décalage +0.1m
             newX = h.x + 0.1;
             newY = h.y + 0.1;
             newSegmentId = h.segmentId;
        } else {
             // Cas intelligent : on centre le groupe sur la souris/cible
             const relX = h.x - avgX;
             const relY = h.y - avgY;
             newX = refX + relX;
             newY = refY + relY;
             // Si on change de segment, on adopte le segment cible
             // Note: Si le collage est multi-segments, cela aplatit tout sur le segment cible, 
             // ce qui est souvent le comportement attendu pour un "Coller ici".
             newSegmentId = targetSegmentId;
        }

        // CLAMPING : Empêcher les prises de sortir du mur
        const segment = config.segments.find(s => s.id === newSegmentId);
        if (segment) {
            newY = Math.max(0, Math.min(segment.height, newY));
            newX = Math.max(-config.width/2, Math.min(config.width/2, newX));
        }

        return {
            ...h,
            id: crypto.randomUUID(),
            x: newX,
            y: newY,
            segmentId: newSegmentId
        };
    });

    setHolds(prev => [...prev, ...newHolds]);
    // Sélectionner les nouvelles prises
    state.setSelectedPlacedHoldIds(newHolds.map((h: PlacedHold) => h.id));
  };

  const removeHoldsAction = useCallback((ids: string[], askConfirm: boolean = false) => {
    if (ids.length === 0 || mode === 'VIEW') return;
    if (metadata.remixMode === 'structure') return;
    
    const executeDelete = () => {
        saveToHistory();
        const idSet = new Set(ids);
        setHolds(prev => prev.filter(h => !idSet.has(h.id)));
        state.setSelectedPlacedHoldIds((prev: string[]) => prev.filter(id => !idSet.has(id)));
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
    paste: () => handlePaste(), // Appelle maintenant le Smart Paste
    save: () => handleAction('save'),
    open: onTriggerImport, // Déclenche maintenant l'import via l'input global
    deleteAction: () => removeHoldsAction(state.selectedPlacedHoldIds)
  }, [performUndo, performRedo, state.selectedPlacedHoldIds, removeHoldsAction, state.clipboard, mode, holds, config, metadata.remixMode, user, state.wallMousePosition, onTriggerImport]);


  return {
    handleImportFile,
    performUndo, performRedo, saveToHistory,
    handlePlaceHold, removeHoldsAction, removeSegmentAction, updateSegmentQuickly, handleAction,
    handleNewWallRequest, handlePaste
  };
};
