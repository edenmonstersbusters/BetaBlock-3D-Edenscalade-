
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '../../core/api';
import { auth } from '../../core/auth';
import { UserProfile } from '../../types';
import { WallCard } from '../gallery/WallCard';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { GymSearchSelector } from './components/GymSearchSelector';
import { ArrowLeft, Edit3, Save, MapPin, Dumbbell, TrendingUp, Activity, Box, Heart, Loader2, Navigation, ExternalLink, ChevronDown } from 'lucide-react';

/**
 * Composant de carte pour afficher une salle favorite de manière élégante
 */
const FavoriteGymCard: React.FC<{ gym: any }> = ({ gym }) => {
    if (!gym) return (
        <div className="flex items-center gap-3 p-4 bg-gray-900/20 border border-dashed border-white/5 rounded-2xl text-gray-600">
            <Dumbbell size={16} className="opacity-20" />
            <span className="text-xs italic">Aucune salle favorite renseignée</span>
        </div>
    );

    if (typeof gym === 'string') {
        return (
            <div className="bg-gray-900/40 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-600/20 text-purple-400 rounded-xl">
                    <Navigation size={18} />
                </div>
                <span className="text-lg font-bold text-white">{gym}</span>
            </div>
        );
    }

    return (
        <div className="group relative bg-gray-900/40 border border-white/10 rounded-2xl p-4 flex items-start gap-4 transition-all hover:bg-gray-800/60 hover:border-purple-500/30 overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                <Dumbbell size={80} className="rotate-12" />
            </div>
            
            <div className="shrink-0 p-3 bg-purple-600/20 text-purple-400 rounded-2xl group-hover:scale-110 transition-transform shadow-lg border border-purple-500/10">
                <Navigation size={22} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <span className="text-[10px] font-black text-purple-500/60 uppercase tracking-[0.2em] mb-1 block">QG Officiel</span>
                        <h4 className="text-[18px] font-black text-white leading-tight tracking-tight uppercase break-words">{gym.name}</h4>
                    </div>
                    {gym.uri && (
                        <a 
                            href={gym.uri} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="p-2 text-gray-600 hover:text-blue-400 transition-colors bg-white/5 rounded-xl border border-white/5 shrink-0"
                            title="Voir sur OpenStreetMap"
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <MapPin size={12} className="text-gray-600" />
                        <span className="truncate">{gym.address}</span>
                    </div>
                    <div className="px-2 py-0.5 bg-purple-500/10 rounded-full text-[9px] font-black text-purple-400 border border-purple-500/20 uppercase tracking-widest">
                        {gym.city}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { userId } = useParams();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [userWalls, setUserWalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    
    const [editData, setEditData] = useState<Partial<UserProfile>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const loadProfileData = useCallback(async (forcedUser?: any) => {
        setLoading(true);
        const user = forcedUser || await auth.getUser();
        setCurrentUser(user);

        const targetId = userId || user?.id;
        
        if (!targetId) {
            if (!userId) navigate('/');
            setLoading(false);
            return;
        }

        const profileData = await api.getProfile(targetId);
        const { data: walls } = await api.getUserProjects(targetId);

        if (profileData) {
            setProfile(profileData);
            setEditData(profileData);
        } else if (user && user.id === targetId) {
            const initial = {
                id: user.id,
                display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
                avatar_url: user.user_metadata?.avatar_url,
                created_at: user.created_at,
                stats: { total_walls: 0, total_likes: 0, beta_level: 1 }
            };
            setProfile(initial);
            setEditData(initial);
        }
        
        setUserWalls(walls || []);
        setLoading(false);
    }, [userId, navigate]);

    useEffect(() => {
        loadProfileData();
        const { data: { subscription } } = auth.onAuthStateChange((user) => {
            if (user) loadProfileData(user);
        });
        return () => subscription.unsubscribe();
    }, [loadProfileData]);

    const handleSaveProfile = async () => {
        if (!profile || !currentUser) return;
        setIsSaving(true);
        try {
            await api.updateProfile(currentUser.id, editData);
            setProfile({ ...profile, ...editData });
            setIsEditing(false);
        } catch (e) {
            alert("Erreur lors de la sauvegarde du profil.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarUpload = async (file: File) => {
        if (!currentUser) return;
        setIsUploadingAvatar(true);
        try {
            const newUrl = await api.uploadAvatar(file);
            if (newUrl) {
                await api.updateProfile(currentUser.id, { avatar_url: newUrl });
                setProfile(prev => prev ? { ...prev, avatar_url: newUrl } : null);
                setEditData(prev => ({ ...prev, avatar_url: newUrl }));
            }
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    if (loading && !profile) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-500" size={48} />
                    <p className="text-gray-500 font-mono text-xs uppercase tracking-widest animate-pulse">Chargement...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
                <Box size={48} className="text-gray-800 mb-4" />
                <h2 className="text-xl font-bold text-gray-400 mb-2">Profil introuvable</h2>
                <button onClick={() => navigate('/')} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-full font-bold transition-all">Retour</button>
            </div>
        );
    }

    const isOwnProfile = !userId || userId === currentUser?.id;
    const memberSince = new Date(profile.created_at).getFullYear();

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-gray-950/50 backdrop-blur-xl sticky top-0 z-50">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold">Galerie</span>
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black italic tracking-tighter opacity-50">Profil de Grimpeur</span>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
                <section className="relative">
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left gap-6">
                            <UserAvatar 
                                url={isEditing ? editData.avatar_url : profile.avatar_url}
                                name={profile.display_name}
                                size="xl"
                                editable={isOwnProfile} 
                                onUpload={handleAvatarUpload}
                                loading={isUploadingAvatar}
                                className="shadow-2xl ring-4 ring-gray-900"
                            />
                            
                            <div className="w-full">
                                {isEditing ? (
                                    <input 
                                        value={editData.display_name} 
                                        onChange={e => setEditData({...editData, display_name: e.target.value})}
                                        className="text-3xl font-black bg-gray-900 border border-blue-500 rounded-lg px-3 py-1 outline-none w-full text-center lg:text-left mb-2"
                                        placeholder="Pseudo"
                                    />
                                ) : (
                                    <h1 className="text-4xl font-black tracking-tighter text-white break-words">{profile.display_name}</h1>
                                )}
                                <p className="text-sm text-gray-500 font-mono mt-2">Membre depuis {memberSince}</p>
                            </div>

                            {isOwnProfile && (
                                <button 
                                    onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                                    className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${isEditing ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-gray-800 hover:bg-gray-700'}`}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : (isEditing ? <Save size={18}/> : <Edit3 size={18}/>)}
                                    <span>{isEditing ? "Enregistrer" : "Modifier"}</span>
                                </button>
                            )}
                        </div>

                        <div className="lg:col-span-8 space-y-6">
                            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 lg:p-8 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-2">Salle favorite</label>
                                    {isEditing ? (
                                        <GymSearchSelector 
                                            value={editData.home_gym || ''} 
                                            onChange={val => setEditData({...editData, home_gym: val})}
                                        />
                                    ) : (
                                        <FavoriteGymCard gym={profile.home_gym} />
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gray-900/30 border border-white/5 rounded-2xl p-4">
                                        <label className="text-[9px] text-gray-500 uppercase tracking-widest">Ville</label>
                                        {isEditing ? (
                                            <input value={editData.location || ''} onChange={e => setEditData({...editData, location: e.target.value})} className="bg-transparent border-none text-white text-sm font-bold w-full p-0" />
                                        ) : (
                                            <div className="text-sm font-bold text-white">{profile.location || "--"}</div>
                                        )}
                                    </div>
                                    <div className="bg-gray-900/30 border border-white/5 rounded-2xl p-4">
                                        <label className="text-[9px] text-gray-500 uppercase tracking-widest">Niveau</label>
                                        {isEditing ? (
                                            <input value={editData.climbing_grade || ''} onChange={e => setEditData({...editData, climbing_grade: e.target.value})} className="bg-transparent border-none text-white text-sm font-bold w-full p-0" />
                                        ) : (
                                            <div className="text-sm font-bold text-emerald-400">{profile.climbing_grade || "--"}</div>
                                        )}
                                    </div>
                                    <div className="bg-gray-900/30 border border-white/5 rounded-2xl p-4 relative">
                                        <label className="text-[9px] text-gray-500 uppercase tracking-widest">Style</label>
                                        {isEditing ? (
                                            <div className="relative mt-1">
                                                <select 
                                                    value={editData.climbing_style || ''} 
                                                    onChange={e => setEditData({...editData, climbing_style: e.target.value})} 
                                                    className="appearance-none bg-gray-950 border border-white/10 text-white text-xs font-bold w-full p-2 rounded-lg cursor-pointer focus:border-blue-500 outline-none transition-all pr-8"
                                                >
                                                    <option value="" className="bg-gray-900">-- Choisir --</option>
                                                    <option value="Bloc" className="bg-gray-900">🧱 Bloc (Salle)</option>
                                                    <option value="Voie (Salle)" className="bg-gray-900">🧗 Voie (Salle)</option>
                                                    <option value="Falaise (Naturel)" className="bg-gray-900">⛰️ Falaise (Naturel)</option>
                                                    <option value="Vitesse" className="bg-gray-900">⚡ Vitesse</option>
                                                    <option value="Traditionnel (Trad)" className="bg-gray-900">⚙️ Traditionnel (Trad)</option>
                                                    <option value="Deep Water Solo" className="bg-gray-900">🌊 Deep Water Solo</option>
                                                    <option value="Alpinisme" className="bg-gray-900">❄️ Alpinisme</option>
                                                    <option value="Combiné" className="bg-gray-900">🏆 Combiné</option>
                                                </select>
                                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
                                            </div>
                                        ) : (
                                            <div className="text-sm font-bold text-white">{profile.climbing_style || "--"}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 pt-6 border-t border-white/5">
                                    <label className="text-[10px] text-gray-500 uppercase tracking-widest">Bio</label>
                                    {isEditing ? (
                                        <textarea value={editData.bio || ''} onChange={e => setEditData({...editData, bio: e.target.value})} className="w-full bg-gray-900/50 border border-white/10 rounded-2xl p-4 text-sm outline-none min-h-[100px]" />
                                    ) : (
                                        <p className="text-gray-300 text-sm italic">{profile.bio || "Pas de bio."}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-8">
                    <h2 className="text-3xl font-black tracking-tighter">Murs de {profile.display_name}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {userWalls.map(wall => (
                            <WallCard 
                                key={wall.id} id={wall.id} name={wall.name} createdAt={wall.created_at} 
                                thumbnail={wall.data?.metadata?.thumbnail} authorId={profile.id}
                                onClick={() => navigate(`/view/${wall.id}`)}
                            />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};
