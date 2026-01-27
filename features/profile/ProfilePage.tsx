import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../core/api';
import { auth } from '../../core/auth';
import { UserProfile } from '../../types';
import { ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { ProfileHero } from './components/ProfileHero';
import { ProfileStats } from './components/ProfileStats';
import { ProfilePortfolio } from './components/ProfilePortfolio';
import { SEO } from '../../components/SEO';

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

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-500/30">
            <SEO 
                title={`${profile.display_name} - Profil Grimpeur`} 
                description={profile.bio || `Découvrez les ${userWalls.length} murs d'escalade créés par ${profile.display_name} sur BetaBlock 3D.`}
                image={profile.avatar_url}
                type="profile"
                breadcrumbs={[
                    { name: 'Accueil', url: '/' },
                    { name: 'Profils', url: '/' },
                    { name: profile.display_name, url: `/profile/${userId || ''}` }
                ]}
                schema={{
                    type: 'ProfilePage',
                    data: {
                        mainEntity: {
                            '@type': 'Person',
                            name: profile.display_name,
                            description: profile.bio,
                            image: profile.avatar_url,
                            jobTitle: "Route Setter",
                            homeLocation: { '@type': 'Place', name: profile.location },
                            interactionStatistic: {
                                '@type': 'InteractionCounter',
                                interactionType: 'https://schema.org/LikeAction',
                                userInteractionCount: profile.stats?.total_likes || 0
                            }
                        }
                    }
                }}
            />

            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-[100]">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-all group">
                    <div className="p-1.5 rounded-lg bg-gray-900 group-hover:bg-blue-600 transition-colors"><ArrowLeft size={18} /></div>
                    <span className="font-bold text-sm">Retour</span>
                </button>
                <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-blue-500" /><span className="text-xs font-black uppercase tracking-widest text-gray-500">Profil Grimpeur</span></div>
            </div>

            <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
                <ProfileHero 
                    profile={profile} isEditing={isEditing} editData={editData} setEditData={setEditData} 
                    isOwnProfile={isOwnProfile} onEditToggle={() => setIsEditing(true)} onSave={handleSaveProfile} 
                    isSaving={isSaving} onAvatarUpload={handleAvatarUpload} isUploadingAvatar={isUploadingAvatar} 
                    memberSince={new Date(profile.created_at).getFullYear()}
                />
                <ProfileStats 
                    profile={profile} isEditing={isEditing} editData={editData} 
                    setEditData={setEditData} totalWalls={userWalls.length} 
                />
                <ProfilePortfolio 
                    walls={userWalls} isOwnProfile={isOwnProfile} authorName={profile.display_name} 
                    authorAvatarUrl={profile.avatar_url} onWallClick={(id) => navigate(`/view/${id}`)} 
                    onCreateClick={() => navigate('/builder')} 
                />
            </main>

            <footer className="py-12 border-t border-white/5 text-center text-[10px] text-gray-700 font-black uppercase tracking-[0.3em]">BetaBlock // Performance & Design // 2025</footer>
        </div>
    );
};