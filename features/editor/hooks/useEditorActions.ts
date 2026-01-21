
import { useCallback } from 'react';
import { validateBetaBlockJson } from '../../../utils/validation';
import { WallConfig, PlacedHold, AppMode, WallMetadata } from '../../../types';

interface UseEditorActionsProps {
  mode: AppMode;
  user: any;
  setConfig: (c: WallConfig) => void;
  setHolds: (h: PlacedHold[]) => void;
  setMetadata: (m: any) => void; // Using 'any' briefly to allow flexible updates
  state: any;
  saveToHistory: () => void;
  onHome: () => void;
  onNewWall: () => void;
}

export const useEditorActions = ({
  mode, user, setConfig, setHolds, setMetadata, state, saveToHistory, onHome, onNewWall
}: UseEditorActionsProps) => {

  const handleImportFile = useCallback((file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const validated = validateBetaBlockJson(json);
          
          if (validated) {
            saveToHistory();
            setConfig(validated.config);
            setHolds(validated.holds);
            setMetadata((prev: WallMetadata) => ({
                ...validated.metadata,
                // Nouveau propriétaire si importé par un autre
                authorId: validated.metadata.authorId === user?.id ? user.id : undefined
            }));
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

  const handleAction = useCallback((type: 'save' | 'publish' | 'exit' | 'share') => {
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
        state.setModal({ title: "Partager ce mur", message: "Lien unique et options de partage.", isShareViewerDialog: true });
        return;
      }

      if (!user) {
          state.setShowAuthModal(true);
          return;
      }
      
      setMetadata((prev: WallMetadata) => ({ ...prev, isPublic: type === 'publish' }));
      
      state.setModal({ 
          title: type === 'publish' ? "Publier dans le Hub" : "Enregistrer le projet", 
          message: type === 'publish' ? "Votre mur sera visible par toute la communauté." : "Le projet sera sauvegardé dans votre espace privé.",
          isSaveDialog: true 
      });
  }, [mode, state, user, onHome, setMetadata]);

  const handleNewWallRequest = useCallback(() => {
      state.setModal({
          title: "Nouveau Mur",
          message: "Vous allez créer un mur vierge. Toutes les modifications non sauvegardées sur le mur actuel seront perdues.",
          confirmText: "Nouveau Mur",
          isAlert: true,
          onConfirm: onNewWall
      });
  }, [state, onNewWall]);

  return { handleImportFile, handleAction, handleNewWallRequest };
};
