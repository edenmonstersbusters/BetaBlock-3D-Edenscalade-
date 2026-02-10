
import { useEffect, useRef, useState, useCallback } from 'react';

interface AutoSaveProps {
    isDirty: boolean;
    saveFunction: () => Promise<boolean>;
    user: any;
    cloudId: string | null;
    delay?: number;
}

export const useAutoSave = ({ isDirty, saveFunction, user, cloudId, delay = 3000 }: AutoSaveProps) => {
    const [status, setStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const timeoutRef = useRef<any>(null);
    const saveFunctionRef = useRef(saveFunction);

    // Maintien de la référence à la fonction de sauvegarde à jour
    useEffect(() => {
        saveFunctionRef.current = saveFunction;
    }, [saveFunction]);

    // Gestion du cycle de vie de la sauvegarde
    useEffect(() => {
        // Si pas d'utilisateur, on ne peut pas sauvegarder (ni créer) en auto
        if (!user) {
            if (isDirty) setStatus('unsaved');
            return;
        }

        if (isDirty) {
            setStatus('unsaved');
            
            // On clear le timeout précédent
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            // On lance le timer
            timeoutRef.current = setTimeout(async () => {
                setStatus('saving');
                try {
                    // On tente la sauvegarde (qui gérera la création si cloudId est null)
                    const success = await saveFunctionRef.current();
                    if (success) {
                        setStatus('saved');
                        setLastSaved(new Date());
                    } else {
                        setStatus('error');
                    }
                } catch (e) {
                    console.error("Auto-save failed", e);
                    setStatus('error');
                }
            }, delay);
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isDirty, user, delay]); // Retrait de cloudId des dépendances bloquantes

    // Sauvegarde immédiate
    const triggerImmediateSave = useCallback(async () => {
        if (!user) return; // Seul le user est requis
        setStatus('saving');
        const success = await saveFunctionRef.current();
        if (success) {
            setStatus('saved');
            setLastSaved(new Date());
        } else {
            setStatus('error');
        }
    }, [user]);

    // Sauvegarde "On Blur"
    useEffect(() => {
        const handleBlur = () => {
            if (isDirty && user) {
                triggerImmediateSave();
            }
        };
        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [isDirty, user, triggerImmediateSave]);

    return { status, lastSaved, triggerImmediateSave };
};
