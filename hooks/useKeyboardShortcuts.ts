
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
      // SÉCURITÉ : Ignorer si l'utilisateur tape dans un champ texte
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return;
      
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
          handlers.deleteAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handlers, ...dependencies]);
};
