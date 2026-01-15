
import { useState } from 'react';
import { HoldDefinition, PlacedHold, ModalConfig, ContextMenuData } from '../../../types';

export const useEditorState = () => {
  // Sélection & Outils
  const [selectedHold, setSelectedHold] = useState<HoldDefinition | null>(null);
  const [selectedPlacedHoldIds, setSelectedPlacedHoldIds] = useState<string[]>([]);
  const [holdSettings, setHoldSettings] = useState({ scale: 1, rotation: 0, color: '#ff8800' });
  
  // Interface
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [clipboard, setClipboard] = useState<PlacedHold[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);

  // Helpers pour la sélection
  const handleSelectPlacedHold = (id: string | null, multi: boolean = false) => {
    if (id === null) { 
        setSelectedPlacedHoldIds([]); 
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
    modal, setModal,
    contextMenu, setContextMenu,
    showAuthModal, setShowAuthModal,
    clipboard, setClipboard,
    isEditingName, setIsEditingName,

    // Actions
    handleSelectPlacedHold
  };
};
