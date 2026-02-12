
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../../core/auth';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { NotificationsMenu } from '../../components/ui/NotificationsMenu';
import { ArrowLeft, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { EmailSection } from './components/EmailSection';
import { PasswordSection } from './components/PasswordSection';
import { DangerZone } from './components/DangerZone';

export const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Global Status
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const isRecoveryMode = searchParams.get('type') === 'recovery';

    useEffect(() => {
        const init = async () => {
            const u = await auth.getUser();
            if (!u && !isRecoveryMode) {
                navigate('/login');
                return;
            }
            setUser(u);
            setLoading(false);
        };
        init();

        if (isRecoveryMode) {
            setMessage({ type: 'success', text: "Identité vérifiée. Vous pouvez maintenant définir votre nouveau mot de passe." });
        }
    }, [navigate, isRecoveryMode]);

    const handleSuccess = (msg: string) => setMessage({ type: 'success', text: msg });
    const handleError = (msg: string) => setMessage({ type: 'error', text: msg });

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
                    <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {message.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                        <span className="font-medium text-sm">{message.text}</span>
                    </div>
                )}

                <EmailSection 
                    currentEmail={user?.email || ''} 
                    onSaveSuccess={handleSuccess} 
                    onSaveError={handleError}
                    isSaving={isSaving}
                    setIsSaving={setIsSaving}
                />

                <PasswordSection 
                    isRecoveryMode={isRecoveryMode}
                    userEmail={user?.email}
                    onSaveSuccess={handleSuccess}
                    onSaveError={handleError}
                    isSaving={isSaving}
                    setIsSaving={setIsSaving}
                />

                <DangerZone 
                    isSaving={isSaving}
                    setIsSaving={setIsSaving}
                    onSaveError={handleError}
                />
            </main>
        </div>
    );
};
