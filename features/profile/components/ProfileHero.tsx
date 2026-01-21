
import React from 'react';
import { Edit3, Save, Loader2, Calendar } from 'lucide-react';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { UserProfile } from '../../../types';

interface ProfileHeroProps {
    profile: UserProfile;
    isEditing: boolean;
    editData: Partial<UserProfile>;
    setEditData: (data: Partial<UserProfile>) => void;
    isOwnProfile: boolean;
    onEditToggle: () => void;
    onSave: () => void;
    isSaving: boolean;
    onAvatarUpload: (file: File) => void;
    isUploadingAvatar: boolean;
    memberSince: number;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({
    profile, isEditing, editData, setEditData, isOwnProfile,
    onEditToggle, onSave, isSaving, onAvatarUpload, isUploadingAvatar, memberSince
}) => {
    return (
        <section className="relative flex flex-col md:flex-row items-center md:items-end gap-8 pb-12 border-b border-white/5">
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-20 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <UserAvatar 
                    url={isEditing ? editData.avatar_url : profile.avatar_url} 
                    name={profile.display_name} size="xl" editable={isOwnProfile} 
                    onUpload={onAvatarUpload} loading={isUploadingAvatar} 
                    className="border-4 border-gray-950 relative z-10"
                />
            </div>

            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left min-w-0">
                <div className="flex items-center gap-3 mb-2">
                    <div className="px-2 py-0.5 bg-blue-600 text-[10px] font-black uppercase tracking-tighter rounded">
                        {profile.stats?.beta_level ? `Level ${profile.stats.beta_level}` : 'Ouvreur'}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <Calendar size={12} /><span>Depuis {memberSince}</span>
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
                        onClick={isEditing ? onSave : onEditToggle} 
                        className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black transition-all shadow-xl active:scale-95 ${isEditing ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-gray-800 hover:bg-gray-750 border border-white/10'}`}
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18}/> : (isEditing ? <Save size={18}/> : <Edit3 size={18}/>)}
                        <span>{isEditing ? "Sauvegarder" : "Éditer mon profil"}</span>
                    </button>
                )}
            </div>
        </section>
    );
};
