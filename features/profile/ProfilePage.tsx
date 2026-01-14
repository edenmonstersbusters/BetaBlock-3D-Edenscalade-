
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../core/api';
import { auth } from '../../core/auth';
import { UserProfile } from '../../types';
import { WallCard } from '../gallery/WallCard';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { ArrowLeft, Edit3, Save, MapPin, Dumbbell, TrendingUp, Activity, Calendar, Box, Heart, Loader2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { userId } = useParams();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [userWalls, setUserWalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    
    // État local pour le formulaire d'édition
    const [editData, setEditData] = useState<Partial<UserProfile>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    useEffect(() => {
        const loadProfileData = async () => {
            setLoading(true);
            const user = await auth.getUser();
            setCurrentUser(user);

            const targetId = userId || user?.id;
            if (!targetId) {
                navigate('/');
                return;
            }

            const profileData = await api.getProfile(targetId);
            const { data: walls } = await api.getWallsList(targetId);

            if (profileData) {
                // Auto-détection du pays si vide et si c'est mon profil
                if (!profileData.location && (!userId || userId === user?.id)) {
                    try {
                         const detectedCountry = new Intl.DisplayNames([navigator.language], { type: 'region' }).of(navigator.language.split('-')[1] || 'FR');
                         profileData.location = detectedCountry || "Terre";
                    } catch (e) { /* Ignorer si l'API n'est pas dispo */ }
                }

                setProfile(profileData);
                setEditData(profileData);
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
        setProfile({ ...profile, ...editData });
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    if (!profile) return null;

    const isOwnProfile = !userId || userId === currentUser?.id;

    // Année d'inscription
    const memberSince = new Date(profile.created_at).getFullYear();

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
            {/* Header / Nav */}
            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-gray-950/50 backdrop-blur-xl sticky top-0 z-50">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold">Galerie</span>
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black italic tracking-tighter opacity-50">Profil</span>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
                
                {/* ZONE A: HERO SECTION & IDENTITY */}
                <section className="relative">
                     {/* Ambiance Lights */}
                    <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
                    
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
                        
                        {/* COLONNE GAUCHE : IDENTITÉ VISUELLE */}
                        <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left gap-6">
                            <UserAvatar 
                                url={isEditing ? editData.avatar_url : profile.avatar_url}
                                name={profile.display_name}
                                size="xl"
                                editable={isOwnProfile} // Toujours editable si c'est mon profil pour encourager l'upload
                                onUpload={handleAvatarUpload}
                                loading={isUploadingAvatar}
                                className="shadow-2xl ring-4 ring-gray-900"
                            />
                            
                            <div>
                                {isEditing ? (
                                    <input 
                                        value={editData.display_name} 
                                        onChange={e => setEditData({...editData, display_name: e.target.value})}
                                        className="text-3xl font-black bg-gray-900 border border-blue-500 rounded-lg px-3 py-1 outline-none w-full text-center lg:text-left mb-2"
                                        placeholder="Votre Pseudo"
                                    />
                                ) : (
                                    <h1 className="text-4xl font-black tracking-tighter text-white">{profile.display_name}</h1>
                                )}
                                
                                <p className="text-sm text-gray-500 font-mono mt-2 flex items-center justify-center lg:justify-start gap-2">
                                    <span>Membre depuis {memberSince}</span>
                                    {profile.location && (
                                        <>
                                            <span>•</span>
                                            <span className="text-blue-400">{profile.location}</span>
                                        </>
                                    )}
                                </p>
                            </div>

                            {/* Bouton d'action principal */}
                            {isOwnProfile && (
                                <button 
                                    onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                                    className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${isEditing ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-gray-800 hover:bg-gray-700 shadow-black/20 border border-white/5'}`}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : (isEditing ? <Save size={18}/> : <Edit3 size={18}/>)}
                                    <span>{isEditing ? "Enregistrer le profil" : "Modifier le profil"}</span>
                                </button>
                            )}
                        </div>

                        {/* COLONNE DROITE : CARTE D'IDENTITÉ GRIMPEUR */}
                        <div className="lg:col-span-8 bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 lg:p-8">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Carte du Grimpeur</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Localisation */}
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 flex items-center gap-2"><MapPin size={12} className="text-blue-500"/> QG / Localisation</label>
                                    {isEditing ? (
                                        <input 
                                            value={editData.location || ''} 
                                            onChange={e => setEditData({...editData, location: e.target.value})}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:border-blue-500 outline-none"
                                            placeholder="Ex: Fontainebleau, France"
                                        />
                                    ) : (
                                        <div className="text-lg font-medium">{profile.location || <span className="text-gray-600 italic">Non renseigné</span>}</div>
                                    )}
                                </div>

                                {/* Salle */}
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 flex items-center gap-2"><Dumbbell size={12} className="text-purple-500"/> Salle Favorite</label>
                                    {isEditing ? (
                                        <input 
                                            value={editData.home_gym || ''} 
                                            onChange={e => setEditData({...editData, home_gym: e.target.value})}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:border-blue-500 outline-none"
                                            placeholder="Ex: Arkose Nation"
                                        />
                                    ) : (
                                        <div className="text-lg font-medium">{profile.home_gym || <span className="text-gray-600 italic">Non renseignée</span>}</div>
                                    )}
                                </div>

                                {/* Niveau */}
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 flex items-center gap-2"><TrendingUp size={12} className="text-emerald-500"/> Niveau Max</label>
                                    {isEditing ? (
                                        <input 
                                            value={editData.climbing_grade || ''} 
                                            onChange={e => setEditData({...editData, climbing_grade: e.target.value})}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:border-blue-500 outline-none"
                                            placeholder="Ex: 7a+"
                                        />
                                    ) : (
                                        <div className="text-lg font-mono font-bold text-emerald-400">{profile.climbing_grade || <span className="text-gray-600 font-sans italic font-normal">--</span>}</div>
                                    )}
                                </div>

                                {/* Style */}
                                <div className="space-y-2">
                                    <label className="text-xs text-gray-400 flex items-center gap-2"><Activity size={12} className="text-orange-500"/> Style</label>
                                    {isEditing ? (
                                        <select 
                                            value={editData.climbing_style || ''} 
                                            onChange={e => setEditData({...editData, climbing_style: e.target.value})}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:border-blue-500 outline-none text-white"
                                        >
                                            <option value="">Sélectionner...</option>
                                            <option value="Bloc">Bloc</option>
                                            <option value="Voie">Voie</option>
                                            <option value="Trad">Trad</option>
                                            <option value="Vitesse">Vitesse</option>
                                            <option value="Polyvalent">Polyvalent</option>
                                        </select>
                                    ) : (
                                        <div className="text-lg font-medium">{profile.climbing_style || <span className="text-gray-600 italic">Non défini</span>}</div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-white/5">
                                <label className="text-xs text-gray-400">Bio</label>
                                {isEditing ? (
                                    <textarea 
                                        value={editData.bio || ''}
                                        onChange={e => setEditData({...editData, bio: e.target.value})}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm focus:border-blue-500 outline-none min-h-[80px]"
                                        placeholder="Quelques mots sur votre grimpe..."
                                    />
                                ) : (
                                    <p className="text-gray-300 leading-relaxed italic">
                                        {profile.bio || "Aucune biographie."}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Rapides */}
                <section className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                         <div className="text-sm text-gray-400 font-bold uppercase">Murs Créés</div>
                         <div className="text-2xl font-black text-white flex items-center gap-2">
                             <Box size={20} className="text-blue-500"/> {profile.stats?.total_walls}
                         </div>
                    </div>
                    <div className="bg-gray-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                         <div className="text-sm text-gray-400 font-bold uppercase">Likes Reçus</div>
                         <div className="text-2xl font-black text-white flex items-center gap-2">
                             <Heart size={20} className="text-red-500"/> {profile.stats?.total_likes}
                         </div>
                    </div>
                </section>

                {/* Wall Listing */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h2 className="text-2xl font-black tracking-tight">
                            {isOwnProfile ? "Mes Créations" : `Murs de ${profile.display_name}`}
                        </h2>
                    </div>

                    {userWalls.length === 0 ? (
                        <div className="py-20 text-center bg-gray-900/30 rounded-3xl border border-dashed border-white/10">
                            <p className="text-gray-500 font-mono">Aucun mur n'a encore été publié.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {userWalls.map(wall => (
                                <WallCard 
                                    key={wall.id}
                                    id={wall.id}
                                    name={wall.name}
                                    createdAt={wall.created_at}
                                    thumbnail={wall.data?.metadata?.thumbnail}
                                    authorName={profile.display_name}
                                    authorAvatarUrl={profile.avatar_url} // Passage de l'avatar
                                    onClick={() => navigate(`/view/${wall.id}`)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};
