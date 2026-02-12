
import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { auth } from '../../../core/auth';
import { useNavigate } from 'react-router-dom';

interface DangerZoneProps {
    isSaving: boolean;
    setIsSaving: (v: boolean) => void;
    onSaveError: (msg: string) => void;
}

export const DangerZone: React.FC<DangerZoneProps> = ({ isSaving, setIsSaving, onSaveError }) => {
    const navigate = useNavigate();
    const [deleteStep, setDeleteStep] = useState(0); 
    const [deleteKeyword, setDeleteKeyword] = useState('');

    const handleDeleteAccount = async () => {
        if (deleteKeyword !== 'SUPPRIMER') return;
        
        setIsSaving(true);
        const { error } = await auth.deleteAccount(); 
        
        if (error) {
            onSaveError("Erreur lors de la suppression : " + (error.message || "Erreur inconnue"));
            setIsSaving(false);
        } else {
            navigate('/');
        }
    };

    return (
        <section className="space-y-6 pt-8">
            <div className="flex items-center gap-3 text-red-500 border-b border-red-900/30 pb-2">
                <ShieldAlert size={20} />
                <h2 className="text-lg font-bold uppercase tracking-wider">Zone de Danger</h2>
            </div>
            
            {deleteStep === 0 ? (
                <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-6 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-red-200">Supprimer mon compte</h3>
                        <p className="text-xs text-red-400/70 mt-1 max-w-sm">
                            Cette action est irréversible. Toutes vos données (murs, likes, commentaires) seront supprimées de nos serveurs.
                        </p>
                    </div>
                    <button onClick={() => setDeleteStep(1)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs transition-colors">
                        Supprimer
                    </button>
                </div>
            ) : (
                <div className="bg-red-950 border border-red-500 rounded-2xl p-6 animate-in zoom-in-95 duration-200">
                    <h3 className="font-bold text-white text-lg mb-2">Êtes-vous absolument sûr ?</h3>
                    <p className="text-sm text-gray-300 mb-6">
                        Pour confirmer la suppression définitive de votre compte et de tout votre contenu, veuillez taper <strong>SUPPRIMER</strong> ci-dessous.
                        <br/><span className="text-xs text-red-400 font-bold">Tout sera effacé instantanément.</span>
                    </p>
                    
                    <input 
                        type="text" 
                        value={deleteKeyword}
                        onChange={e => setDeleteKeyword(e.target.value)}
                        placeholder="SUPPRIMER"
                        className="w-full bg-black border border-red-900 rounded-xl px-4 py-3 text-white font-mono text-center tracking-widest mb-4 focus:border-red-500 outline-none"
                    />

                    <div className="flex gap-3">
                        <button 
                            onClick={handleDeleteAccount} 
                            disabled={deleteKeyword !== 'SUPPRIMER' || isSaving}
                            className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-colors"
                        >
                            {isSaving ? "SUPPRESSION..." : "CONFIRMER LA SUPPRESSION"}
                        </button>
                        <button 
                            onClick={() => { setDeleteStep(0); setDeleteKeyword(''); }}
                            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};
