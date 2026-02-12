
import React, { useState } from 'react';
import { Lock, Save, Loader2, Send } from 'lucide-react';
import { auth } from '../../../core/auth';
import { useNavigate } from 'react-router-dom';

interface PasswordSectionProps {
    isRecoveryMode: boolean;
    userEmail?: string;
    onSaveSuccess: (msg: string) => void;
    onSaveError: (msg: string) => void;
    isSaving: boolean;
    setIsSaving: (v: boolean) => void;
}

export const PasswordSection: React.FC<PasswordSectionProps> = ({ 
    isRecoveryMode, userEmail, onSaveSuccess, onSaveError, isSaving, setIsSaving 
}) => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRequestPasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userEmail) return;
        
        setIsSaving(true);
        const { error } = await auth.resetPasswordForEmail(userEmail);
        
        if (error) {
            onSaveError(error.message || "Erreur.");
        } else {
            onSaveSuccess("Un lien de réinitialisation sécurisé a été envoyé à votre adresse email.");
        }
        setIsSaving(false);
    };

    const handleSetNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            onSaveError("Les mots de passe ne correspondent pas.");
            return;
        }
        if (password.length < 6) {
            onSaveError("Le mot de passe doit faire au moins 6 caractères.");
            return;
        }

        setIsSaving(true);
        const { error } = await auth.updatePassword(password);
        if (error) {
            onSaveError(error.message || "Erreur.");
        } else {
            onSaveSuccess("Mot de passe mis à jour avec succès.");
            setPassword('');
            setConfirmPassword('');
            navigate('/settings', { replace: true });
        }
        setIsSaving(false);
    };

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 text-emerald-400 border-b border-white/5 pb-2">
                <Lock size={20} />
                <h2 className="text-lg font-bold uppercase tracking-wider">Mot de passe</h2>
            </div>
            
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
                {isRecoveryMode ? (
                    <form onSubmit={handleSetNewPassword} className="space-y-4 animate-in fade-in">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nouveau mot de passe</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Confirmer le mot de passe</label>
                            <input 
                                type="password" 
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                        <button type="submit" disabled={isSaving || !password} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>Enregistrer le nouveau mot de passe</span>
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">
                            Pour garantir la sécurité de votre compte, la modification du mot de passe nécessite une vérification par email.
                        </p>
                        <button onClick={handleRequestPasswordReset} disabled={isSaving} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2 border border-white/5">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            <span>Envoyer un email de modification</span>
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};
