
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../core/api';
import { auth } from '../../core/auth';
import { WallCard } from './WallCard';
import { AuthModal } from '../../components/auth/AuthModal';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { Plus, Loader2, Search, Database, LogIn, LogOut, X } from 'lucide-react';

interface GalleryPageProps {
  onResetState?: () => void;
}

export const GalleryPage: React.FC<GalleryPageProps> = ({ onResetState }) => {
  const navigate = useNavigate();
  const [walls, setWalls] = useState<{ id: string; name: string; created_at: string; data?: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Timer pour le debouncing
  const debounceTimerRef = useRef<number | null>(null);

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const loadDefaultWalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await api.getWallsList();
    if (error) {
      setError(error);
    } else {
      setWalls(data || []);
    }
    setLoading(false);
  }, []);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadDefaultWalls();
      return;
    }

    setIsSearching(true);
    setError(null);
    const { data, error } = await api.searchWalls(query.trim());
    if (error) {
      setError(error);
    } else {
      setWalls(data || []);
    }
    setIsSearching(false);
  }, [loadDefaultWalls]);

  // Effet pour gérer le debouncing de la recherche
  useEffect(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    if (!searchQuery.trim()) {
      loadDefaultWalls();
      return;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      performSearch(searchQuery);
    }, 400);

    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery, loadDefaultWalls, performSearch]);

  useEffect(() => {
    auth.getUser().then(setUser);
    const { data: { subscription } } = auth.onAuthStateChange(setUser);
    loadDefaultWalls();
    return () => subscription.unsubscribe();
  }, [loadDefaultWalls]);

  const handleCreateNew = () => {
    if (onResetState) {
        onResetState();
    } else {
        navigate('/builder');
    }
  };

  const handleOpenWall = (id: string) => {
    navigate(`/view/${id}`);
  };

  const handleSignOut = async () => {
      await auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-y-auto custom-scrollbar">
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />}
      
      {/* NAVBAR */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
          <div className="flex items-center gap-2 group cursor-default">
             <div className="text-xl font-black italic tracking-tighter text-white/40 group-hover:text-white/60 transition-colors">BetaBlock</div>
          </div>
          <div>
            {user ? (
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-2 p-1 pr-4 bg-gray-900/60 hover:bg-gray-800 border border-white/5 rounded-full transition-all group backdrop-blur-md"
                    >
                        <UserAvatar 
                            url={user.user_metadata?.avatar_url}
                            name={user.user_metadata?.display_name || user.email}
                            size="sm"
                        />
                        <span className="hidden sm:inline-block font-bold text-gray-300 group-hover:text-white truncate max-w-[150px]">
                            {user.user_metadata?.display_name || user.email?.split('@')[0]}
                        </span>
                    </button>
                    <button onClick={handleSignOut} className="p-2 bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg transition-colors" title="Se déconnecter">
                        <LogOut size={18} />
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-blue-600 border border-white/10 hover:border-blue-500 rounded-full text-sm font-bold transition-all backdrop-blur-md"
                >
                    <LogIn size={16} />
                    <span>Connexion</span>
                </button>
            )}
          </div>
      </div>

      {/* HEADER HERO */}
      <header className="relative py-24 px-6 border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-gradient-to-br from-white via-gray-200 to-gray-600 bg-clip-text text-transparent mb-6 animate-in slide-in-from-bottom-4 duration-700">
                BetaBlock <span className="text-blue-500">Hub</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-in slide-in-from-bottom-6 duration-700 delay-100">
                La plateforme communautaire des ouvreurs virtuels.<br/>
                Explorez, remixez et partagez des créations en 3D.
            </p>
            
            <button 
                onClick={handleCreateNew}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-full transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_50px_rgba(37,99,235,0.5)] hover:-translate-y-1 animate-in zoom-in-50 duration-500 delay-200"
            >
                <Plus className="group-hover:rotate-90 transition-transform duration-300" />
                <span>Créer un Nouveau Mur</span>
            </button>
        </div>
      </header>

      {/* LISTING SECTION */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <div className="flex items-center gap-3 text-sm font-bold text-gray-400 uppercase tracking-widest">
                <Database size={16} className="text-blue-500" />
                <span>
                    {searchQuery.trim() ? `Résultats de recherche (${walls.length})` : `Dernières créations (${walls.length})`}
                </span>
                {(loading || isSearching) && <Loader2 size={16} className="animate-spin text-blue-500" />}
            </div>
            
            {/* Recherche Interactive Globale */}
            <div className="relative group w-full md:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors">
                    {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                </div>
                <input 
                    type="text" 
                    placeholder="Recherche globale (nom, auteur...)" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl py-3 pl-10 pr-10 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all shadow-xl"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>

        {loading && !isSearching ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
                <span className="text-sm font-mono animate-pulse">Chargement de la matrice...</span>
            </div>
        ) : error ? (
            <div className="p-8 border border-red-900/50 bg-red-900/10 rounded-2xl text-center">
                <h3 className="text-red-400 font-bold text-lg mb-2">Erreur de connexion</h3>
                <p className="text-gray-400 text-sm mb-4">{error}</p>
                <button onClick={() => loadDefaultWalls()} className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded-lg text-sm transition-colors">Réessayer</button>
            </div>
        ) : walls.length === 0 ? (
            <div className="text-center py-20 bg-gray-900/30 rounded-3xl border border-white/5 border-dashed animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">Aucun mur trouvé dans la base</h3>
                <p className="text-gray-500 mb-6">La recherche s'est effectuée sur l'ensemble de la base de données.</p>
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="text-blue-400 hover:text-white underline underline-offset-4 decoration-blue-500/30 hover:decoration-blue-500"
                    >
                        Réinitialiser la recherche
                    </button>
                )}
            </div>
        ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${isSearching ? 'opacity-50' : 'opacity-100'}`}>
                {walls.map((wall, idx) => (
                    <div key={wall.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 30}ms` }}>
                        <WallCard 
                            id={wall.id} 
                            name={wall.name || "Mur Sans Nom"} 
                            createdAt={wall.created_at} 
                            thumbnail={wall.data?.metadata?.thumbnail} 
                            authorName={wall.data?.metadata?.authorName}
                            authorAvatarUrl={wall.data?.metadata?.authorAvatarUrl}
                            onClick={() => handleOpenWall(wall.id)}
                        />
                    </div>
                ))}
            </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-gray-600 font-mono">
        <p>BetaBlock 3D v1.1 • Powered by React Three Fiber & Supabase</p>
      </footer>
    </div>
  );
};
