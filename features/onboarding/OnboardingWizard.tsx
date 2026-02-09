
import React, { useState, useEffect } from 'react';
import { api } from '../../core/api';
import { UserProfile } from '../../types';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { GymSearchSelector } from '../profile/components/GymSearchSelector';
import { ArrowRight, CheckCircle, User, Activity, Target, Loader2, Sparkles } from 'lucide-react';

interface OnboardingWizardProps {
  user: any; // Supabase user
  onComplete: () => void;
}

// Étapes du wizard
const STEPS = [
  { id: 'identity', title: 'Identité', icon: User },
  { id: 'climber', title: 'Profil Grimpeur', icon: Activity },
  { id: 'goals', title: 'Objectifs', icon: Target },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Données du formulaire
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    display_name: '',
    avatar_url: '',
    climbing_grade: '6a',
    climbing_style: 'Bloc (Salle)',
    home_gym: null,
    acquisition_source: 'Autre',
    usage_goal: 'Fun'
  });

  // Vérification initiale : L'utilisateur a-t-il déjà fait l'onboarding ?
  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      const profile = await api.getProfile(user.id);
      
      // Si le profil existe ET que l'onboarding est marqué complété -> on ne montre rien
      if (profile && profile.onboarding_completed) {
        onComplete();
        return;
      }

      // Sinon, on pré-remplit avec ce qu'on a
      setFormData(prev => ({
        ...prev,
        display_name: profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || '',
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || '',
        // On garde les valeurs par défaut pour le reste si pas d'info
        ...profile
      }));
      setIsLoading(false);
    };
    checkProfile();
  }, [user, onComplete]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      // Sauvegarde finale avec le marqueur de complétion
      await api.updateProfile(user.id, {
        ...formData,
        onboarding_completed: true
      });
      
      // Petite pause pour l'effet visuel de succès
      setTimeout(() => {
          onComplete();
      }, 1000);
    } catch (e) {
      console.error("Erreur Onboarding", e);
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setIsUploading(true);
    const url = await api.uploadAvatar(file);
    if (url) {
      setFormData(prev => ({ ...prev, avatar_url: url }));
    }
    setIsUploading(false);
  };

  if (isLoading) return null; // Ne rien afficher tant qu'on vérifie

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950/95 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-in fade-in duration-500">
      <div className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* SIDEBAR (Progress) */}
        <div className="w-full md:w-64 bg-gray-950 p-8 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between relative overflow-hidden">
            {/* Décoration de fond */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none" />
            
            <div>
                <div className="flex items-center gap-2 mb-8 text-blue-500 font-black italic text-xl tracking-tighter">
                   BetaBlock <span className="text-white">ID</span>
                </div>
                
                <div className="space-y-6 relative z-10">
                    {STEPS.map((s, index) => {
                        const isActive = step === index;
                        const isDone = step > index;
                        const Icon = s.icon;
                        
                        return (
                            <div key={s.id} className={`flex items-center gap-4 transition-all duration-300 ${isActive ? 'translate-x-2' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isActive ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : isDone ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                                    {isDone ? <CheckCircle size={14} /> : <Icon size={14} />}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-white' : 'text-gray-500'}`}>{s.title}</span>
                                    {isActive && <span className="text-[10px] text-blue-400">En cours...</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="relative z-10 hidden md:block">
                <p className="text-xs text-gray-600 leading-relaxed">
                    Complétez votre profil pour accéder à la communauté et débloquer les fonctionnalités de partage.
                </p>
            </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 p-8 md:p-12 flex flex-col relative">
            <div className="flex-1">
                {/* STEP 1: IDENTITY */}
                {step === 0 && (
                    <div className="space-y-8 animate-in slide-in-from-right duration-300">
                        <div className="text-center">
                            <h2 className="text-3xl font-black text-white mb-2">Bienvenue dans l'équipe.</h2>
                            <p className="text-gray-400">Commençons par les présentations. Comment doit-on vous appeler ?</p>
                        </div>

                        <div className="flex flex-col items-center gap-6">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/40 transition-all duration-500" />
                                <UserAvatar 
                                    url={formData.avatar_url} 
                                    name={formData.display_name || 'Moi'} 
                                    size="xl" 
                                    editable={true}
                                    onUpload={handleAvatarUpload}
                                    loading={isUploading}
                                    className="relative z-10 border-4 border-gray-900"
                                />
                                <p className="text-[10px] text-center text-gray-500 mt-2 uppercase font-bold tracking-widest group-hover:text-blue-400 transition-colors">
                                    Modifier la photo
                                </p>
                            </div>

                            <div className="w-full max-w-xs space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase ml-2">Votre Pseudo</label>
                                <input 
                                    type="text" 
                                    value={formData.display_name} 
                                    onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-center text-white font-bold text-lg focus:border-blue-500 outline-none transition-all shadow-inner placeholder-gray-700"
                                    placeholder="Ex: GrimpeurDuDimanche"
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: CLIMBER PROFILE */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right duration-300">
                        <div>
                            <h2 className="text-2xl font-black text-white mb-2">Votre niveau de grimpe ?</h2>
                            <p className="text-gray-400 text-sm">Cela nous aide à vous proposer des contenus adaptés.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Niveau Max (Bloc)</label>
                                <select 
                                    value={formData.climbing_grade}
                                    onChange={(e) => setFormData({...formData, climbing_grade: e.target.value})}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                >
                                    <option value="4">Débutant (4)</option>
                                    <option value="5a">5a</option>
                                    <option value="5b">5b</option>
                                    <option value="5c">5c</option>
                                    <option value="6a">6a</option>
                                    <option value="6b">6b</option>
                                    <option value="6c">6c</option>
                                    <option value="7a">7a</option>
                                    <option value="7b">7b</option>
                                    <option value="7c">7c</option>
                                    <option value="8a">8a (Machine)</option>
                                    <option value="8b+">8b+ (Alien)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Style Préféré</label>
                                <select 
                                    value={formData.climbing_style}
                                    onChange={(e) => setFormData({...formData, climbing_style: e.target.value})}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                >
                                    <option value="Bloc (Salle)">Bloc (Salle)</option>
                                    <option value="Bloc (Extérieur)">Bloc (Extérieur)</option>
                                    <option value="Voie (Salle)">Voie (Salle)</option>
                                    <option value="Falaise (Couenne)">Falaise (Couenne)</option>
                                    <option value="Trad / Alpinisme">Trad / Alpinisme</option>
                                    <option value="Vitesse">Vitesse</option>
                                    <option value="Deep Water Solo">Deep Water Solo</option>
                                    <option value="Polyvalent">Polyvalent</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Votre Salle Principale (QG)</label>
                            <GymSearchSelector 
                                value={formData.home_gym} 
                                onChange={(gym) => setFormData({...formData, home_gym: gym})}
                                placeholder="Rechercher une salle..."
                            />
                        </div>
                    </div>
                )}

                {/* STEP 3: GOALS */}
                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right duration-300">
                        <div>
                            <h2 className="text-2xl font-black text-white mb-2">Dernière étape !</h2>
                            <p className="text-gray-400 text-sm">Dites-nous en plus sur votre usage de BetaBlock.</p>
                        </div>

                        <div className="space-y-4">
                             <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Objectif Principal</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {['Ouvrir pour ma salle pro', 'Concevoir mon Homewall', 'S\'amuser / Tester', 'Apprendre le route setting'].map((goal) => (
                                        <button 
                                            key={goal}
                                            onClick={() => setFormData({...formData, usage_goal: goal})}
                                            className={`p-4 rounded-xl text-left border transition-all flex items-center justify-between group ${formData.usage_goal === goal ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                        >
                                            <span className="font-bold text-sm">{goal}</span>
                                            {formData.usage_goal === goal && <Sparkles size={16} className="text-blue-400" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-white/5">
                                <label className="text-xs font-bold text-gray-500 uppercase">Comment nous avez-vous connu ?</label>
                                <select 
                                    value={formData.acquisition_source}
                                    onChange={(e) => setFormData({...formData, acquisition_source: e.target.value})}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none text-sm"
                                >
                                    <option value="Autre">Autre</option>
                                    <option value="Google">Recherche Google</option>
                                    <option value="Instagram">Instagram / Réseaux</option>
                                    <option value="Ami">Recommandation d'un ami</option>
                                    <option value="Salle">Vu en salle d'escalade</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/5">
                 {step > 0 ? (
                     <button 
                        onClick={() => setStep(prev => prev - 1)}
                        className="text-gray-500 hover:text-white font-bold text-sm transition-colors"
                     >
                         Retour
                     </button>
                 ) : (
                     <span /> // Spacer
                 )}

                 <button 
                    onClick={handleNext}
                    disabled={isSaving || (step === 0 && !formData.display_name?.trim())}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                 >
                    {isSaving ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            <span>Finalisation...</span>
                        </>
                    ) : (
                        <>
                            <span>{step === STEPS.length - 1 ? 'Commencer l\'aventure' : 'Suivant'}</span>
                            <ArrowRight size={18} />
                        </>
                    )}
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
};
