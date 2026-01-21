
import React, { useState } from 'react';
import { AlertTriangle, Loader2, Trash2, Lock } from 'lucide-react';
import { auth } from '../../../core/auth';
import { api } from '../../../core/api';

interface DeleteProjectModalProps {
    project: any;
    user: any;
    onClose: () => void;
    onDeleted: (id: string) => void;
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({ project, user, onClose, onDeleted }) => {
    const [confirmKeyword, setConfirmKeyword] = useState('');
    const [confirmCode, setConfirmCode] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleFinalDelete = async () => {
        if (confirmKeyword !== 'delete_wall') {
            alert("Veuillez saisir 'delete_wall' pour continuer.");
            return;
        }
        if (!confirmCode) {
            alert("Le mot de passe du compte est requis pour valider l'action.");
            return;
        }

        setIsDeleting(true);
        const { error: authError } = await auth.signIn(user.email, confirmCode);
        
        if (authError) {
            alert("Mot de passe incorrect. Action de suppression annulée pour votre sécurité.");
            setIsDeleting(false);
            return;
        }

        const { error } = await api.deleteWall(project.id);
        
        if (!error) {
            onDeleted(project.id);
            onClose();
        } else {
            alert("Erreur lors de la suppression : " + error);
        }
        setIsDeleting(false);
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-gray-900 border border-red-500/30 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-red-500/20 text-red-500 rounded-2xl"><AlertTriangle size={24} /></div>
                        <div>
                            <h2 className="text-xl font-black text-white">Action Irréversible</h2>
                            <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Suppression du mur</p>
                        </div>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8">
                        <p className="text-sm text-red-200 leading-relaxed">
                            Vous êtes sur le point de supprimer définitivement <span className="font-bold text-white">"{project.name}"</span>. 
                            Toutes les prises, les commentaires et l'historique de ce mur seront effacés.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Étape 1 : Tapez "delete_wall"</label>
                            <input type="text" value={confirmKeyword} onChange={(e) => setConfirmKeyword(e.target.value)} placeholder="delete_wall" className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 px-4 text-white text-sm focus:border-red-500 outline-none transition-all font-mono" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Étape 2 : Mot de passe du compte</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                <input type="password" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} placeholder="Code de connexion" className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-red-500 outline-none transition-all font-mono" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-4">
                            <button onClick={handleFinalDelete} disabled={isDeleting || confirmKeyword !== 'delete_wall' || !confirmCode} className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-red-900/20 flex items-center justify-center gap-3">
                                {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                                <span>CONFIRMER LA SUPPRESSION</span>
                            </button>
                            <button onClick={onClose} className="w-full py-3 text-gray-500 hover:text-white font-bold transition-colors">Annuler</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
