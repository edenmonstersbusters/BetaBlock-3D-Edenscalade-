
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../core/api';
import { auth } from '../../core/auth';
import { WallCard } from './WallCard';
import { AuthModal } from '../../components/auth/AuthModal';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { NotificationsMenu } from '../../components/ui/NotificationsMenu';
import { Plus, Loader2, Search, Database, LogIn, LogOut, LayoutGrid, Globe, X } from 'lucide-react';
import { SEO } from '../../components/SEO';

interface GalleryPageProps {
  onResetState?: () => void;
}

export const GalleryPage: React.FC<GalleryPageProps> = ({ onResetState }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [walls, setWalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const loadDefaultWalls = useCallback(async () => {
    setLoading(true);
    const { data, error } = await api.getWallsList();
    if (error) setError(error);
    else setWalls(data || []);
    setLoading(false);
  }, []);

  const executeSearch = useCallback(async (query: string) => {
      setLoading(true);
      setIsSearching(true);
      const { data } = await api.searchWalls(query);
      setWalls(data || []);
      setLoading(false);
  }, []);

  useEffect(() => {
    auth.getUser().then(setUser);
    const { data: { subscription } } = auth.onAuthStateChange(setUser);
    
    const q = searchParams.get('q');
    
    if (q) {
        setSearchQuery(q);
        executeSearch(q);
    } else {
        loadDefaultWalls();
    }
    
    return () => subscription.unsubscribe();
  }, [loadDefaultWalls, executeSearch, searchParams]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!searchQuery.trim()) {
        resetSearch();
        return;
    }
    setSearchParams({ q: searchQuery });
    executeSearch(searchQuery);
  };

  const resetSearch = () => {
      setSearchQuery('');
      setIsSearching(false);
      setSearchParams({});
      loadDefaultWalls();
  };

  const validWalls = walls.filter(w => w && w.id);

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-y-auto custom-scrollbar flex flex-col">
      <SEO 
        title="Hub Communautaire" 
        description="Explorez des milliers de murs d'escalade 3D créés par la communauté. Rejoignez les ouvreurs et partagez vos créations." 
        breadcrumbs={[
            { name: 'Accueil', url: '/' }
        ]}
        schema={{
            type: 'WebSite',
            data: {
                name: 'BetaBlock 3D',
                url: 'https://betablock-3d.vercel.app/',
                potentialAction: {
                    '@type': 'SearchAction',
                    target: 'https://betablock-3d.vercel.app/?q={search_term_string}',
                    'query-input': 'required name=search_term_string'
                }
            }
        }}
      />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />}
      
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
          <div className="flex items-center gap-2 group cursor-default">
             <span className="text-3xl">🧗</span>
             <div className="text-xl font-black italic tracking-tighter text-blue-500 group-hover:text-blue-400 transition-colors">BetaBlock</div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
                <div className="flex items-center gap-3">
                    {/* Cloche de notification */}
                    <NotificationsMenu userId={user.id} />

                    <button 
                        onClick={() => navigate('/projects')}
                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-full text-xs font-bold transition-all text-gray-400 hover:text-white"
                    >
                        <LayoutGrid size={14} />
                        <span>Mes Murs</span>
                    </button>
                    <button 
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-2 p-1 pr-4 bg-gray-900/60 hover:bg-gray-800 border border-white/5 rounded-full transition-all group backdrop-blur-md"
                    >
                        <UserAvatar userId={user.id} url={user.user_metadata?.avatar_url} name={user.user_metadata?.display_name || user.email} size="sm" />
                        <span className="hidden sm:inline-block font-bold text-gray-300 group-hover:text-white truncate max-w-[150px]">
                            {user.user_metadata?.display_name || user.email?.split('@')[0]}
                        </span>
                    </button>
                    <button onClick={() => auth.signOut()} className="p-2 bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg transition-colors">
                        <LogOut size={18} />
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-bold transition-all"
                >
                    <LogIn size={16} />
                    <span>Connexion</span>
                </button>
            )}
          </div>
      </div>

      <header className="relative py-24 px-6 border-b border-white/10 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">BetaBlock <span className="text-blue-500">Hub</span></h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">La plateforme communautaire des ouvreurs. Explorez les créations publiques ou gérez vos projets privés.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                    onClick={() => navigate('/builder')}
                    className="group flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-full transition-all shadow-lg shadow-blue-600/20"
                >
                    <Plus size={20} />
                    <span>Créer un Nouveau Mur</span>
                </button>
                {user && (
                    <button 
                        onClick={() => navigate('/projects')}
                        className="flex items-center gap-3 px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg rounded-full border border-white/10 transition-all"
                    >
                        <LayoutGrid size={20} />
                        <span>Mes Murs Privés</span>
                    </button>
                )}
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3 text-2xl font-black text-white tracking-tight self-start md:self-auto">
                <Globe className="text-blue-500" size={24} />
                <span>Galerie</span>
            </div>

            <form onSubmit={handleSearch} className="relative w-full md:w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={14} />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value === '') resetSearch();
                    }}
                    placeholder="Rechercher..." 
                    className="w-full bg-gray-900 border border-white/10 rounded-lg py-2 pl-9 pr-8 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:bg-gray-800 outline-none transition-all"
                />
                {searchQuery && (
                    <button 
                        type="button"
                        onClick={resetSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                        <X size={14} />
                    </button>
                )}
            </form>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center h-64"><Loader2 size={48} className="animate-spin text-blue-500" /></div>
        ) : (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {validWalls.map(wall => (
                        <WallCard 
                            key={wall.id} id={wall.id} name={wall.name} createdAt={wall.created_at} 
                            thumbnail={wall.data?.metadata?.thumbnail} 
                            authorId={wall.data?.metadata?.authorId}
                            authorName={wall.data?.metadata?.authorName}
                            authorAvatarUrl={wall.data?.metadata?.authorAvatarUrl}
                            onClick={() => navigate(`/view/${wall.id}`)}
                            isRemix={!!wall.data?.metadata?.parentId}
                            parentName={wall.data?.metadata?.parentName}
                        />
                    ))}
                </div>
                
                {validWalls.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-xl bg-gray-900/50">
                        <Search size={32} className="mb-2 opacity-50"/>
                        <p>{isSearching ? `Aucun résultat pour "${searchQuery}"` : "Aucun mur public disponible."}</p>
                        {isSearching && (
                            <button onClick={resetSearch} className="mt-4 text-sm text-blue-400 hover:underline">
                                Tout afficher
                            </button>
                        )}
                    </div>
                )}
            </>
        )}
      </main>

       <footer className="border-t border-white/5 bg-gray-950 py-12 mt-auto">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-gray-500 text-sm">
              <div className="flex items-center gap-2">
                  <Database size={16} />
                  <span className="font-mono">v1.1 Stable</span>
              </div>
              <div className="font-mono opacity-50">
                  © 2026 BetaBlock. Open Source Climbing Engine.
              </div>
          </div>
      </footer>
    </div>
  );
};
