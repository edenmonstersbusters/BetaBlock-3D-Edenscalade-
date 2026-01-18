
import { useState } from 'react';
import { HoldDefinition, PlacedHold, ModalConfig, ContextMenuData } from '../../../types';

export const useEditorState = () => {
  // Sélection & Outils
  const [selectedHold, setSelectedHold] = useState<HoldDefinition | null>(null);
  const [selectedPlacedHoldIds, setSelectedPlacedHoldIds] = useState<string[]>([]);
  const [holdSettings, setHoldSettings] = useState({ scale: 1, rotation: 0, color: '#ff8800' });
  
  // Outils de Mesure
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [isDynamicMeasuring, setIsDynamicMeasuring] = useState(false); // Mode mesure prédictive
  const [referenceHoldId, setReferenceHoldId] = useState<string | null>(null); // Prise de départ
  
  // Interface
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [clipboard, setClipboard] = useState<PlacedHold[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // NOUVEAU
  
  // Tracking Souris (Pour coller au curseur)
  const [wallMousePosition, setWallMousePosition] = useState<{ x: number, y: number, segmentId: string } | null>(null); // NOUVEAU

  // Suivi des modifications
  const [isDirty, setIsDirty] = useState(false);

  // Helpers pour la sélection
  const handleSelectPlacedHold = (id: string | null, multi: boolean = false) => {
    if (id === null) { 
        setSelectedPlacedHoldIds([]); 
        return; 
    }
    
    // Si mode mesure activé, on limite la sélection à 2 éléments max
    if (isMeasuring) {
        setSelectedPlacedHoldIds(prev => {
            // Si on clique sur une prise déjà sélectionnée, on la désélectionne
            if (prev.includes(id)) return prev.filter(p => p !== id);
            
            // Si on a déjà 2 prises, la nouvelle remplace la plus ancienne
            if (prev.length >= 2) {
                return [prev[1], id];
            }
            return [...prev, id];
        });
        return;
    }

    if (multi) {
        setSelectedPlacedHoldIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    } else {
        setSelectedPlacedHoldIds([id]);
    }
  };

  return {
    // States
    selectedHold, setSelectedHold,
    selectedPlacedHoldIds, setSelectedPlacedHoldIds,
    holdSettings, setHoldSettings,
    
    isMeasuring, setIsMeasuring,
    isDynamicMeasuring, setIsDynamicMeasuring,
    referenceHoldId, setReferenceHoldId,

    modal, setModal,
    contextMenu, setContextMenu,
    showAuthModal, setShowAuthModal,
    clipboard, setClipboard,
    isEditingName, setIsEditingName,
    isDirty, setIsDirty,
    
    isSidebarOpen, setIsSidebarOpen,
    wallMousePosition, setWallMousePosition,

    // Actions
    handleSelectPlacedHold
  };
};
