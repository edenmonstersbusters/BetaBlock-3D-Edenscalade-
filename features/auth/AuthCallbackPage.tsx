import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../../core/auth';
import { Loader2, CheckCircle, Mail, KeyRound, UserPlus, ArrowRight } from 'lucide-react';
import { SEO } from '../../components/SEO';

export const AuthCallbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState("Vérification en cours...");
    const [actionType, setActionType] = useState<string | null>(null);

    useEffect(() => {
        const handleAuthCallback = async () => {
            // Supabase gère le hash (#access_token=...) automatiquement à l'init.
            // On attend juste de récupérer la session active.
            
            const type = searchParams.get('type');
            setActionType(type);

            // Petit délai pour laisser Supabase traiter le hash
            await new Promise(r => setTimeout(r, 1000));
            
            const user = await auth.getUser();

            if (type === 'signup') {
                // Confirmation d'email à l'inscription
                if (user) {
                    setStatus('success');
                    setMessage("Votre adresse email a été confirmée avec succès !");
                } else {
                    // Parfois le lien ne connecte pas automatiquement si ouvert dans un autre navigateur
                    setStatus('success'); 
                    setMessage("Email confirmé. Veuillez vous connecter.");
                }
            } 
            else if (type === 'invite') {
                // Invitation acceptée
                if (user) {
                    setStatus('success');
                    setMessage("Invitation acceptée ! Bienvenue sur BetaBlock.");
                    // On redirige vers Settings pour définir le mot de passe
                    setTimeout(() => navigate('/settings?type=recovery'), 2000);
                    return;
                }
            } 
            else if (type === 'recovery') {
                // Reset mot de passe
                if (user) {
                    navigate('/settings?type=recovery');
                } else {
                    setStatus('error');
                    setMessage("Lien de récupération invalide ou expiré.");
                }
            }
            else if (type === 'email_change') {
                if (user) {
                    setStatus('success');
                    setMessage("Votre nouvelle adresse email est validée !");
                    setTimeout(() => navigate('/settings'), 3000);
                }
            }
            else {
                // Fallback générique
                if (user) {
                    navigate('/');
                } else {
                    setStatus('error');
                    setMessage("Lien invalide.");
                }
            }
        };

        handleAuthCallback();
    }, [searchParams, navigate]);

    const handleContinue = () => {
        if (actionType === 'signup') {
            navigate('/login');
        } else {
            navigate('/');
        }
    };

    const getIcon = () => {
        switch(actionType) {
            case 'invite': return <UserPlus size={48} className="text-purple-500 mb-4" />;
            case 'recovery': return <KeyRound size={48} className="text-orange-500 mb-4" />;
            default: return <Mail size={48} className="text-blue-500 mb-4" />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center font-sans">
            <SEO title="Vérification..." />
            
            <div className="bg-gray-900 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600" />
                
                {status === 'loading' ? (
                    <div className="flex flex-col items-center py-8">
                        <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
                        <h1 className="text-xl font-bold text-white mb-2">Vérification...</h1>
                        <p className="text-gray-500 text-sm">Nous validons votre lien sécurisé.</p>
                    </div>
                ) : status === 'success' ? (
                    <div className="flex flex-col items-center py-4 animate-in zoom-in-95 duration-300">
                        <div className="mb-2 relative">
                            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                            <CheckCircle size={64} className="text-emerald-500 relative z-10" />
                        </div>
                        <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Succès !</h1>
                        <p className="text-gray-400 mb-8">{message}</p>
                        
                        <button 
                            onClick={handleContinue}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                        >
                            <span>{actionType === 'signup' ? 'Se connecter' : 'Continuer'}</span>
                            <ArrowRight size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center py-4">
                        {getIcon()}
                        <h1 className="text-xl font-bold text-white mb-2">Lien invalide</h1>
                        <p className="text-gray-500 text-sm mb-6">{message}</p>
                        <button onClick={() => navigate('/')} className="text-blue-500 hover:text-white underline text-sm">Retour à l'accueil</button>
                    </div>
                )}
            </div>
            
            <div className="mt-8 text-gray-600 text-xs font-mono uppercase tracking-widest">
                BetaBlock Security Systems
            </div>
        </div>
    );
};