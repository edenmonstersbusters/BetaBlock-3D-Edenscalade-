
import { useState, useCallback } from 'react';

interface HistoryState<T> {
  past: T[];
  future: T[];
}

export function useHistory<T>(initialValue: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    future: []
  });

  // Enregistre un nouvel état dans l'historique
  const recordAction = useCallback((currentState: T) => {
    setHistory(prev => ({
      past: [...prev.past, JSON.parse(JSON.stringify(currentState))],
      future: []
    }));
  }, []);

  // Revient en arrière
  const undo = useCallback((currentState: T, applyState: (state: T) => void) => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);
      
      // On applique l'état AVANT de retourner le nouvel historique pour éviter des incohérences
      applyState(previous);

      return {
        past: newPast,
        future: [JSON.parse(JSON.stringify(currentState)), ...prev.future]
      };
    });
  }, []);

  // Rétablit l'action annulée
  const redo = useCallback((currentState: T, applyState: (state: T) => void) => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      const newFuture = prev.future.slice(1);

      applyState(next);

      return {
        past: [...prev.past, JSON.parse(JSON.stringify(currentState))],
        future: newFuture
      };
    });
  }, []);

  return {
    past: history.past,
    future: history.future,
    recordAction,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0
  };
}
