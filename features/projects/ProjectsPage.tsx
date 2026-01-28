
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../core/api';
import { auth } from '../../core/auth';
import { WallCard } from '../gallery/WallCard';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { DeleteProjectModal } from './components/DeleteProjectModal';
import { NotificationsMenu } from '../../components/ui/NotificationsMenu';
import { ArrowLeft, Box, Loader2, Plus, Globe, Lock, Trash2, Edit3, Eye, EyeOff } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

    const loadProjects = useCallback(async (userId: string) => {
        setLoading(true);
        const { data } = await api.getUserProjects(userId);
        if (data) setProjects(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        auth.getUser().then(u => {
            if (!u) { navigate('/'); return; }
            setUser(u);
            loadProjects(u.id);
        });
    }, [navigate, loadProjects]);

    const handleToggleVisibility = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
        e.stopPropagation();
        setTogglingId(id);
        const newStatus = !currentStatus;
        setProjects(prev => prev.map(p => p.id === id ? { ...p, is_public: newStatus, data: { ...p.data, metadata: { ...p.data.metadata, isPublic: newStatus } } } : p));
        await api.toggleWallVisibility(id, newStatus);
        setTogglingId(null);
    };

    const validProjects = projects.filter(p => p && p.id);

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans overflow-y-auto custom-scrollbar">
            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-gray-950/50 backdrop-blur-xl sticky top-0 z-50">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /><span className="font-bold">Hub Public</span>
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-black italic tracking-tighter text-blue-500">MES MURS</span>
                    {user && (
                        <>
                            <NotificationsMenu userId={user.id} />
                            <UserAvatar url={user.user_metadata?.avatar_url} name={user.user_metadata?.display_name || user.email} size="sm" />
                        </>
                    )}
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div><h1 className="text-4xl font-black tracking-tight mb-2">Gestionnaire de Murs</h1><p className="text-gray-500">Gérez vos brouillons privés et vos publications publiques.</p></div>
                    <button onClick={() => navigate('/builder')} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20"><Plus size={20} /><span>Nouveau Mur</span></button>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 text-gray-600"><Loader2 size={48} className="animate-spin mb-4 text-blue-500" /><span className="font-mono text-xs uppercase tracking-widest animate-pulse">Chargement de vos fichiers...</span></div>
                ) : validProjects.length === 0 ? (
                    <div className="text-center py-24 bg-gray-900/30 rounded-3xl border border-white/5 border-dashed">
                        <Box size={48} className="mx-auto mb-4 text-gray-700" /><h2 className="text-xl font-bold text-gray-400 mb-2">Aucun mur trouvé</h2>
                        <button onClick={() => navigate('/builder')} className="text-blue-500 hover:underline">Créer mon premier mur</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {validProjects.map(p => {
                            const isPublic = !!p.is_public;
                            return (
                                <div key={p.id} className="relative group">
                                    <WallCard id={p.id} name={p.name} createdAt={p.created_at} thumbnail={p.data?.metadata?.thumbnail} authorName={user?.user_metadata?.display_name || "Moi"} onClick={() => navigate(`/view/${p.id}`)} />
                                    <div className="absolute top-3 left-3 flex gap-2 pointer-events-none z-10">
                                        {isPublic ? <div className="px-2 py-1 bg-purple-500/90 text-white text-[10px] font-black rounded flex items-center gap-1 backdrop-blur-md shadow-lg"><Globe size={10} /><span>PUBLIÉ</span></div> : <div className="px-2 py-1 bg-gray-800/90 text-gray-300 text-[10px] font-black rounded flex items-center gap-1 backdrop-blur-md shadow-lg border border-white/10"><Lock size={10} /><span>PRIVÉ</span></div>}
                                    </div>
                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <button onClick={(e) => handleToggleVisibility(e, p.id, isPublic)} className={`p-2 rounded-lg backdrop-blur-md border border-white/10 shadow-xl transition-all ${isPublic ? 'bg-purple-600/80 hover:bg-gray-800 text-white' : 'bg-gray-900/80 hover:bg-purple-600 text-gray-400 hover:text-white'}`} disabled={togglingId === p.id}>
                                            {togglingId === p.id ? <Loader2 size={14} className="animate-spin"/> : (isPublic ? <EyeOff size={14} /> : <Eye size={14} />)}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/builder?id=${p.id}`); }} className="p-2 bg-gray-900/80 hover:bg-blue-600 text-white rounded-lg backdrop-blur-md border border-white/10 shadow-xl"><Edit3 size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }} className="p-2 bg-gray-900/80 hover:bg-red-600 text-white rounded-lg backdrop-blur-md border border-white/10 shadow-xl"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {deleteTarget && (
                <DeleteProjectModal 
                    project={deleteTarget} user={user} onClose={() => setDeleteTarget(null)} 
                    onDeleted={(id) => setProjects(prev => prev.filter(p => p.id !== id))} 
                />
            )}
        </div>
    );
};
