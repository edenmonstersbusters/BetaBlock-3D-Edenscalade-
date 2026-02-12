
import React, { useState } from 'react';
import { Mail, CheckCircle, Save, Loader2 } from 'lucide-react';
import { auth } from '../../../core/auth';

interface EmailSectionProps {
    currentEmail: string;
    onSaveSuccess: (msg: string) => void;
    onSaveError: (msg: string) => void;
    isSaving: boolean;
    setIsSaving: (v: boolean) => void;
}

export const EmailSection: React.FC<EmailSectionProps> = ({ currentEmail, onSaveSuccess, onSaveError, isSaving, setIsSaving }) => {
    const [email, setEmail] = useState(currentEmail);

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const { error } = await auth.updateEmail(email);
        if (error) {
            onSaveError(error.message || "Erreur lors de la mise à jour.");
        } else {
            onSaveSuccess("Un email de confirmation a été envoyé à la nouvelle adresse.");
        }
        setIsSaving(false);
    };

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3 text-blue-400 border-b border-white/5 pb-2">
                <Mail size={20} />
                <h2 className="text-lg font-bold uppercase tracking-wider">Adresse Email</h2>
            </div>
            <form onSubmit={handleUpdateEmail} className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Actuel</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                    />
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-900/10 rounded-lg">
                    <CheckCircle size={16} className="text-blue-400 shrink-0 mt-0.5"/>
                    <p className="text-xs text-blue-300">
                        Pour des raisons de sécurité, un email de confirmation sera envoyé à votre nouvelle adresse. Le changement ne sera effectif qu'après validation.
                    </p>
                </div>
                <button type="submit" disabled={isSaving || email === currentEmail} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>Mettre à jour l'email</span>
                </button>
            </form>
        </section>
    );
};
