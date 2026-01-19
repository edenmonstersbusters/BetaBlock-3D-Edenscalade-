
import { useEffect } from 'react';

interface ShortcutHandlers {
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
  copy: () => void;
  paste: () => void;
  save: () => void;
  open: () => void;
  deleteAction: () => void;
}

export const useKeyboardShortcuts = (
  handlers: ShortcutHandlers,
  dependencies: any[] = [] // Dépendances pour rafraîchir le listener si besoin
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si l'utilisateur tape dans un champ texte
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key; 
      const lowerKey = key.toLowerCase();

      if (isCtrl) {
        if (['z', 'y', 'a', 'c', 'v', 's', 'o'].includes(lowerKey)) {
          e.preventDefault(); 
          e.stopPropagation();
          
          switch (lowerKey) {
            case 'z': 
              if (e.shiftKey) handlers.redo(); 
              else handlers.undo(); 
              break;
            case 'y': handlers.redo(); break;
            case 'a': handlers.selectAll(); break;
            case 'c': handlers.copy(); break;
            case 'v': handlers.paste(); break;
            case 's': handlers.save(); break;
            case 'o': handlers.open(); break;
          }
        }
      } else if (key === 'Delete' || key === 'Backspace') {
          // La vérification "si quelque chose est sélectionné" doit être faite dans le handler ou via une condition avant d'appeler ce hook,
          // mais ici on appelle simplement l'action fournie.
          handlers.deleteAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handlers, ...dependencies]);
};
