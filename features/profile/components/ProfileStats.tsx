
import React from 'react';
import { Trophy, Activity, Heart, Box, ChevronRight, MapPin, Dumbbell, ExternalLink } from 'lucide-react';
import { UserProfile } from '../../../types';
import { GymSearchSelector } from './GymSearchSelector';

interface ProfileStatsProps {
    profile: UserProfile;
    isEditing: boolean;
    editData: Partial<UserProfile>;
    setEditData: (data: Partial<UserProfile>) => void;
    totalWalls: number;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({ profile, isEditing, editData, setEditData, totalWalls }) => {
    return (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
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
                    {/* Likes */}
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
                                <p className="text-lg font-bold text-white">{profile.stats?.total_walls || totalWalls} murs</p>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-800" />
                    </div>
                </div>
            </div>

            {/* Gym & Loc */}
            <div className="lg:col-span-8 space-y-6">
                <div className="relative group bg-gradient-to-br from-gray-900 to-black border border-white/5 rounded-[40px] p-8 lg:p-12 shadow-2xl">
                    <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row justify-between gap-12">
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3 text-blue-400"><MapPin size={20} /><h3 className="text-xs font-black uppercase tracking-[0.2em]">Localisation</h3></div>
                            {isEditing ? (
                                <input value={editData.location || ''} onChange={e => setEditData({...editData, location: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm outline-none" placeholder="Ex: Paris, France" />
                            ) : (
                                <p className="text-3xl font-black text-white leading-tight">{profile.location || "Planète Terre"}</p>
                            )}
                        </div>
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3 text-purple-400"><Dumbbell size={20} /><h3 className="text-xs font-black uppercase tracking-[0.2em]">Salle Favorite</h3></div>
                            {isEditing ? (
                                <GymSearchSelector value={editData.home_gym || null} onChange={val => setEditData({...editData, home_gym: val})} />
                            ) : (
                                profile.home_gym ? (
                                    <div className="relative overflow-hidden group/card bg-gray-950/40 border border-white/10 rounded-3xl p-6 transition-all hover:bg-gray-950/60 hover:border-blue-500/30 min-h-[120px]">
                                        <Dumbbell size={80} className="absolute -bottom-4 -right-4 text-white/5 -rotate-12 group-hover/card:text-blue-500/10 transition-colors" />
                                        <div className="relative z-10 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <h4 className="text-xl font-black text-white leading-snug group-hover/card:text-blue-400 transition-colors line-clamp-2 pr-6">{profile.home_gym.name}</h4>
                                                {profile.home_gym.uri && <a href={profile.home_gym.uri} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-900 rounded-full text-gray-400 hover:text-white transition-colors flex-shrink-0"><ExternalLink size={16} /></a>}
                                            </div>
                                            <div className="flex flex-col text-sm text-gray-400 font-medium">
                                                <span className="truncate">{profile.home_gym.city}{profile.home_gym.country ? `, ${profile.home_gym.country}` : ''}</span>
                                                <span className="text-[10px] text-gray-600 mt-1 uppercase tracking-wider truncate">{profile.home_gym.address}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : <p className="text-gray-600 italic text-sm">Aucun QG enregistré.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
