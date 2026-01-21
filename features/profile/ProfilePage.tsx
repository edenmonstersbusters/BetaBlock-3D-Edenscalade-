
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../core/api';
import { auth } from '../../core/auth';
import { UserProfile } from '../../types';
import { WallCard } from '../gallery/WallCard';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { GymSearchSelector } from './components/GymSearchSelector';
import { 
    ArrowLeft, Edit3, Save, MapPin, Dumbbell, 
    Activity, Box, Loader2, ExternalLink, 
    Trophy, ShieldCheck, Calendar, Info, 
    ChevronRight, Heart
} from 'lucide-react';

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

    useEffect(() => {
        const loadProfileData = async () => {
            setLoading(true);
            const user = await auth.getUser();
            setCurrentUser(user);

            const targetId = userId || user?.id;
            if (!targetId) { navigate('/'); return; }

            const profileData = await api.getProfile(targetId);
            const { data: walls } = await api.getUserProjects(targetId);

            if (profileData) {
                setProfile(profileData);
                setEditData({
                    display_name: profileData.display_name,
                    avatar_url: profileData.avatar_url,
                    bio: profileData.bio,
                    location: profileData.location,
                    home_gym: profileData.home_gym,
                    climbing_grade: profileData.climbing_grade,
                    climbing_style: profileData.climbing_style
                });
            }
            setUserWalls(walls || []);
            setLoading(false);
        };
        loadProfileData();
    }, [userId, navigate]);

    const handleSaveProfile = async () => {
        if (!profile || !currentUser) return;
        setIsSaving(true);
        await api.updateProfile(currentUser.id, editData);
        setProfile(prev => prev ? { ...prev, ...editData } : null);
        setIsEditing(false);
        setIsSaving(false);
    };

    const handleAvatarUpload = async (file: File) => {
        if (!currentUser) return;
        setIsUploadingAvatar(true);
        const newUrl = await api.uploadAvatar(file);
        if (newUrl) {
            await api.updateProfile(currentUser.id, { avatar_url: newUrl });
            setProfile(prev => prev ? { ...prev, avatar_url: newUrl } : null);
            setEditData(prev => ({ ...prev, avatar_url: newUrl }));
        }
        setIsUploadingAvatar(false);
    };

    if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
    if (!profile) return null;

    const isOwnProfile = !userId || userId === currentUser?.id;
    const memberSince = new Date(profile.created_at).getFullYear();

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-500/30">
            {/* Header / Nav */}
            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-[100]">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-all group">
                    <div className="p-1.5 rounded-lg bg-gray-900 group-hover:bg-blue-600 transition-colors">
                        <ArrowLeft size={18} />
                    </div>
                    <span className="font-bold text-sm">Retour au Hub</span>
                </button>
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-blue-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-gray-500">Profil Grimpeur</span>
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
                {/* Section Hero : Identité */}
                <section className="relative flex flex-col md:flex-row items-center md:items-end gap-8 pb-12 border-b border-white/5">
                    {/* Effets de lumière en fond */}
                    <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute top-20 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                        <UserAvatar 
                            url={isEditing ? editData.avatar_url : profile.avatar_url} 
                            name={profile.display_name} 
                            size="xl" 
                            editable={isOwnProfile} 
                            onUpload={handleAvatarUpload} 
                            loading={isUploadingAvatar} 
                            className="border-4 border-gray-950 relative z-10"
                        />
                    </div>

                    <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="px-2 py-0.5 bg-blue-600 text-[10px] font-black uppercase tracking-tighter rounded">
                                {profile.stats?.beta_level ? `Level ${profile.stats.beta_level}` : 'Ouvreur'}
                            </div>
                            <div className="flex items-center gap-1 text-gray-500 text-xs">
                                <Calendar size={12} />
                                <span>Depuis {memberSince}</span>
                            </div>
                        </div>

                        {isEditing ? (
                            <input 
                                value={editData.display_name || ''} 
                                onChange={e => setEditData({...editData, display_name: e.target.value})} 
                                className="text-4xl font-black bg-gray-900 border-2 border-blue-500 rounded-2xl px-4 py-1 outline-none w-full max-w-md shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
                                placeholder="Votre pseudo"
                            />
                        ) : (
                            <h1 className="text-5xl font-black tracking-tighter text-white drop-shadow-sm truncate w-full">{profile.display_name}</h1>
                        )}

                        <div className="mt-4 text-gray-400 w-full max-w-3xl text-sm leading-relaxed italic">
                            {isEditing ? (
                                <textarea 
                                    value={editData.bio || ''} 
                                    onChange={e => setEditData({...editData, bio: e.target.value})} 
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm focus:border-blue-500 outline-none min-h-[80px] resize-x overflow-auto" 
                                    placeholder="Racontez votre histoire de grimpeur..." 
                                />
                            ) : (
                                <p className="break-words">{profile.bio || "Ce grimpeur n'a pas encore rédigé sa légende."}</p>
                            )}
                        </div>
                    </div>

                    <div className="md:self-start pt-4 shrink-0">
                        {isOwnProfile && (
                            <button 
                                onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)} 
                                className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all shadow-xl active:scale-95 ${isEditing ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-gray-800 hover:bg-gray-750 border border-white/10'}`}
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={18}/> : (isEditing ? <Save size={18}/> : <Edit3 size={18}/>)}
                                <span>{isEditing ? "Sauvegarder" : "Éditer mon profil"}</span>
                            </button>
                        )}
                    </div>
                </section>

                {/* Grid d'informations techniques */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    {/* Colonne de Gauche : Stats & Style */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-gray-900/50 border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
                            {/* Grade */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl"><Trophy size={20} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Niveau Max</p>
                                        {isEditing ? (
                                            <input value={editData.climbing_grade || ''} onChange={e => setEditData({...editData, climbing_grade: e.target.value})} className="bg-gray-800 rounded px-2 py-0.5 text-sm w-16 outline-none border border-emerald-500/30" />
                                        ) : (
                                            <p className="text-2xl font-black text-white font-mono">{profile.climbing_grade || '?'}</p>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-800" />
                            </div>

                            {/* Style */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-orange-500/10 text-orange-400 rounded-2xl"><Activity size={20} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Spécialité</p>
                                        {isEditing ? (
                                            <select value={editData.climbing_style || ''} onChange={e => setEditData({...editData, climbing_style: e.target.value})} className="bg-gray-800 rounded px-2 py-0.5 text-xs outline-none border border-orange-500/30 w-full">
                                                <option value="Bloc (Salle)">Bloc (Salle)</option>
                                                <option value="Bloc (Extérieur)">Bloc (Extérieur)</option>
                                                <option value="Voie (Salle)">Voie (Salle)</option>
                                                <option value="Falaise (Couenne)">Falaise (Couenne)</option>
                                                <option value="Trad / Alpinisme">Trad / Alpinisme</option>
                                                <option value="Vitesse">Vitesse</option>
                                                <option value="Deep Water Solo">Deep Water Solo</option>
                                                <option value="Polyvalent">Polyvalent</option>
                                            </select>
                                        ) : (
                                            <p className="text-lg font-bold text-white">{profile.climbing_style || 'Grimpeur'}</p>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-800" />
                            </div>

                            {/* Likes Reçus Réels */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl"><Heart size={20} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Likes</p>
                                        <p className="text-lg font-bold text-white">{profile.stats?.total_likes || 0} reçus</p>
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-800" />
                            </div>

                            {/* Volume */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl"><Box size={20} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Créations</p>
                                        <p className="text-lg font-bold text-white">{profile.stats?.total_walls || userWalls.length} murs</p>
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-800" />
                            </div>
                        </div>
                    </div>

                    {/* Colonne de Droite : Home Gym & Localisation */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="relative group bg-gradient-to-br from-gray-900 to-black border border-white/5 rounded-[40px] p-8 lg:p-12 shadow-2xl">
                            {/* Note: overflow-hidden supprimé pour ne pas couper le dropdown du GymSelector */}
                            <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
                            
                            <div className="relative z-10 flex flex-col md:flex-row justify-between gap-12">
                                {/* Localisation */}
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center gap-3 text-blue-400">
                                        <MapPin size={20} />
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em]">Localisation</h3>
                                    </div>
                                    {isEditing ? (
                                        <input 
                                            value={editData.location || ''} 
                                            onChange={e => setEditData({...editData, location: e.target.value})} 
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none" 
                                            placeholder="Ex: Paris, France" 
                                        />
                                    ) : (
                                        <p className="text-3xl font-black text-white leading-tight">
                                            {profile.location || "Planète Terre"}
                                        </p>
                                    )}
                                </div>

                                {/* Home Gym Card stylisée */}
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center gap-3 text-purple-400">
                                        <Dumbbell size={20} />
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em]">Salle Favorite</h3>
                                    </div>
                                    
                                    {isEditing ? (
                                        <GymSearchSelector value={editData.home_gym || null} onChange={val => setEditData({...editData, home_gym: val})} />
                                    ) : (
                                        profile.home_gym ? (
                                            <div className="relative overflow-hidden group/card bg-gray-950/40 border border-white/10 rounded-3xl p-6 transition-all hover:bg-gray-950/60 hover:border-blue-500/30 min-h-[120px]">
                                                {/* Filigrane */}
                                                <Dumbbell size={80} className="absolute -bottom-4 -right-4 text-white/5 -rotate-12 group-hover/card:text-blue-500/10 transition-colors" />
                                                
                                                <div className="relative z-10 space-y-3">
                                                    <div className="flex items-start justify-between">
                                                        <h4 className="text-xl font-black text-white leading-snug group-hover/card:text-blue-400 transition-colors line-clamp-2 pr-6">
                                                            {profile.home_gym.name}
                                                        </h4>
                                                        {profile.home_gym.uri && (
                                                            <a href={profile.home_gym.uri} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-900 rounded-full text-gray-400 hover:text-white transition-colors flex-shrink-0">
                                                                <ExternalLink size={16} />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col text-sm text-gray-400 font-medium">
                                                        <span className="truncate">{profile.home_gym.city}{profile.home_gym.country ? `, ${profile.home_gym.country}` : ''}</span>
                                                        <span className="text-[10px] text-gray-600 mt-1 uppercase tracking-wider truncate">{profile.home_gym.address}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-600 italic text-sm">Aucun QG enregistré.</p>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section Portfolio */}
                <section className="space-y-8 pt-8 relative">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gray-900 rounded-2xl text-blue-500">
                                <Box size={24} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black tracking-tighter">
                                    {isOwnProfile ? "Mes Créations" : `Murs de ${profile.display_name}`}
                                </h2>
                                <p className="text-xs text-gray-500 uppercase font-black tracking-widest mt-1">Portfolio d'ouverture</p>
                            </div>
                        </div>
                        <div className="px-4 py-2 bg-gray-900 border border-white/5 rounded-2xl text-xs font-bold text-gray-400">
                            {userWalls.length} murs
                        </div>
                    </div>

                    {userWalls.length > 0 ? (
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {userWalls.map(wall => (
                                <WallCard 
                                    key={wall.id} 
                                    id={wall.id} 
                                    name={wall.name} 
                                    createdAt={wall.created_at} 
                                    thumbnail={wall.data?.metadata?.thumbnail} 
                                    authorName={profile.display_name} 
                                    authorAvatarUrl={profile.avatar_url} 
                                    onClick={() => navigate(`/view/${wall.id}`)} 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 bg-gray-900/20 rounded-[40px] border border-dashed border-gray-800">
                             <Box size={40} className="text-gray-800 mb-4" />
                             <p className="text-gray-500 font-medium">Aucune création visible pour le moment.</p>
                             {isOwnProfile && (
                                 <button onClick={() => navigate('/builder')} className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-xs font-bold transition-all">
                                     Créer mon premier mur
                                 </button>
                             )}
                        </div>
                    )}
                </section>
            </main>

            {/* Footer discret */}
            <footer className="py-12 border-t border-white/5 text-center text-[10px] text-gray-700 font-black uppercase tracking-[0.3em]">
                BetaBlock // Performance & Design // 2025
            </footer>
        </div>
    );
};
