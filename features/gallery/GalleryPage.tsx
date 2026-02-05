
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../core/api';
import { auth } from '../../core/auth';
import { WallCard } from './WallCard';
import { AuthModal } from '../../components/auth/AuthModal';
import { GalleryHeader } from './components/GalleryHeader';
import { GalleryHero } from './components/GalleryHero';
import { Loader2, Search, Database, Globe, X } from 'lucide-react';
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
        title="Galerie" 
        description="Explorez des milliers de murs d'escalade 3D créés par la communauté. Rejoignez les ouvreurs et partagez vos créations." 
        breadcrumbs={[
            { name: 'Accueil', url: '/' }
        ]}
        schema={{
            type: 'WebSite',
            data: {
                name: 'BetaBlock 3D',
                url: 'https://betablock-3d.fr/',
                potentialAction: {
                    '@type': 'SearchAction',
                    target: 'https://betablock-3d.fr/?q={search_term_string}',
                    'query-input': 'required name=search_term_string'
                }
            }
        }}
      />
      
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />}
      
      <GalleryHeader 
        user={user} 
        onLogin={() => setShowAuthModal(true)} 
        onLogout={() => auth.signOut()} 
        onNavigate={navigate} 
      />

      <GalleryHero 
        user={user} 
        onNavigate={navigate} 
      />

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
