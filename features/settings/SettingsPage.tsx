
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../../core/auth';
import { api } from '../../core/api';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { NotificationsMenu } from '../../components/ui/NotificationsMenu';
import { ArrowLeft, Lock, Mail, AlertTriangle, Save, Loader2, CheckCircle, ShieldAlert } from 'lucide-react';

export const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Status
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Delete Account State
    const [deleteStep, setDeleteStep] = useState(0); // 0: Idle, 1: Warning, 2: Final
    const [deleteKeyword, setDeleteKeyword] = useState('');

    useEffect(() => {
        const init = async () => {
            const u = await auth.getUser();
            if (!u) {
                // Si on arrive depuis un lien de reset password sans être connecté (cas rare avec Supabase qui auto-connecte), on redirige pas tout de suite
                if (searchParams.get('type') === 'recovery') {
                    // On laisse faire, l'utilisateur est sensé être connecté par le lien magique
                } else {
                    navigate('/login');
                    return;
                }
            }
            setUser(u);
            if (u) setEmail(u.email || '');
            setLoading(false);
        };
        init();

        // Gestion du Recovery Mode
        if (searchParams.get('type') === 'recovery') {
            setMessage({ type: 'success', text: "Mode récupération activé. Veuillez définir votre nouveau mot de passe." });
        }
    }, [navigate, searchParams]);

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        const { error } = await auth.updateEmail(email);
        if (error) {
            setMessage({ type: 'error', text: error });
        } else {
            setMessage({ type: 'success', text: "Un email de confirmation a été envoyé à la nouvelle adresse et à l'ancienne." });
        }
        setIsSaving(false);
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: "Les mots de passe ne correspondent pas." });
            return;
        }
        if (password.length < 6) {
            setMessage({ type: 'error', text: "Le mot de passe doit faire au moins 6 caractères." });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        const { error } = await auth.updatePassword(password);
        if (error) {
            setMessage({ type: 'error', text: error });
        } else {
            setMessage({ type: 'success', text: "Mot de passe mis à jour avec succès." });
            setPassword('');
            setConfirmPassword('');
        }
        setIsSaving(false);
    };

    const handleDeleteAccount = async () => {
        if (deleteKeyword !== 'SUPPRIMER') return;
        
        setIsSaving(true);
        const { error } = await auth.softDeleteAccount(user.id);
        
        if (error) {
            setMessage({ type: 'error', text: "Erreur lors de la suppression : " + error });
            setIsSaving(false);
        } else {
            navigate('/');
        }
    };

    if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans">
            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-gray-950/50 backdrop-blur-xl sticky top-0 z-50">
                <button onClick={() => navigate('/gallery')} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors group" aria-label="Retour à la galerie">
                    <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-black italic tracking-tighter text-gray-500">PARAMÈTRES</span>
                    {user && (
                        <>
                            <NotificationsMenu userId={user.id} />
                            <UserAvatar url={user.user_metadata?.avatar_url} name={user.user_metadata?.display_name} size="sm" />
                        </>
                    )}
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-6 py-12 space-y-12">
                <header>
                    <h1 className="text-3xl font-black mb-2">Paramètres du Compte</h1>
                    <p className="text-gray-500">Gérez vos informations de connexion et de sécurité.</p>
                </header>

                {message && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {message.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                        <span className="font-medium text-sm">{message.text}</span>
                    </div>
                )}

                {/* Email Section */}
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
                        <button type="submit" disabled={isSaving || email === user?.email} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>Mettre à jour l'email</span>
                        </button>
                    </form>
                </section>

                {/* Password Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 text-emerald-400 border-b border-white/5 pb-2">
                        <Lock size={20} />
                        <h2 className="text-lg font-bold uppercase tracking-wider">Mot de passe</h2>
                    </div>
                    <form onSubmit={handleUpdatePassword} className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
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
                        <button type="submit" disabled={isSaving || !password} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2">
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>Changer le mot de passe</span>
                        </button>
                    </form>
                </section>

                {/* Danger Zone */}
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
                                    Cette action rendra votre profil anonyme ("Utilisateur Supprimé"). Vos murs resteront visibles par la communauté mais ne vous seront plus attribués nominativement.
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
                                Pour confirmer la suppression définitive de votre profil, veuillez taper <strong>SUPPRIMER</strong> ci-dessous.
                                <br/><span className="text-xs opacity-50">Vos créations ne seront PAS effacées de la base de données.</span>
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
            </main>
        </div>
    );
};
