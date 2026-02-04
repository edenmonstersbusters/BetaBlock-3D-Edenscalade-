
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../core/api';
import { auth } from '../../core/auth';
import { WallCard } from './WallCard';
import { AuthModal } from '../../components/auth/AuthModal';
import { GalleryHeader } from './components/GalleryHeader';
import { GalleryHero } from './components/GalleryHero';
import { Loader2, Search, Database, Globe, X, Filter, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { GRADES_FR, GRADES_V, CLIMBING_STYLES, getGradeSortValue } from '../../utils/grading';

export const GalleryPage: React.FC<{ onResetState?: () => void }> = ({ onResetState }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [walls, setWalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Filtres
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
      climbingType: '',
      grade: '',
      style: '',
      sort: 'recent' // 'recent', 'grade_asc', 'grade_desc'
  });

  const loadWalls = useCallback(async (query?: string) => {
    setLoading(true);
    let result;
    if (query) {
        result = await api.searchWalls(query);
    } else {
        result = await api.getWallsList({
            climbingType: filters.climbingType || undefined,
            gradeFr: filters.grade || undefined,
            styles: filters.style ? [filters.style] : undefined
        });
    }
    
    let filteredData = result.data || [];
    
    // Tri local pour la cotation
    if (filters.sort === 'grade_asc' || filters.sort === 'grade_desc') {
        filteredData = [...filteredData].sort((a, b) => {
            const gradeA = a.grade_fr || '6a';
            const gradeB = b.grade_fr || '6a';
            const valA = getGradeSortValue(gradeA, 'FR');
            const valB = getGradeSortValue(gradeB, 'FR');
            return filters.sort === 'grade_asc' ? valA - valB : valB - valA;
        });
    }

    setWalls(filteredData);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    auth.getUser().then(setUser);
    const { data: { subscription } } = auth.onAuthStateChange(setUser);
    const q = searchParams.get('q');
    if (q) {
        setSearchQuery(q);
        setIsSearching(true);
        loadWalls(q);
    } else {
        loadWalls();
    }
    return () => subscription.unsubscribe();
  }, [loadWalls, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) { resetSearch(); return; }
    setSearchParams({ q: searchQuery });
  };

  const resetSearch = () => {
      setSearchQuery('');
      setIsSearching(false);
      setSearchParams({});
      loadWalls();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-y-auto custom-scrollbar flex flex-col">
      <SEO title="Hub Communautaire" description="Explorez les murs d'escalade 3D de la communauté." />
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />}
      
      <GalleryHeader user={user} onLogin={() => setShowAuthModal(true)} onLogout={() => auth.signOut()} onNavigate={navigate} />
      <GalleryHero user={user} onNavigate={navigate} />

      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3 text-2xl font-black text-white tracking-tight self-start md:self-auto">
                <Globe className="text-blue-500" size={24} />
                <span>Galerie</span>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
                <form onSubmit={handleSearch} className="relative flex-1 md:w-64 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher..." className="w-full bg-gray-900 border border-white/10 rounded-lg py-2 pl-9 pr-8 text-sm outline-none focus:border-blue-500 transition-all" />
                    {searchQuery && <button type="button" onClick={resetSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>}
                </form>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg border transition-all ${showFilters ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-white/10 text-gray-400'}`}
                >
                  <Filter size={18} />
                </button>
            </div>
        </div>

        {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-6 bg-gray-900/50 border border-white/5 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Type</label>
                    <select value={filters.climbingType} onChange={e => setFilters({...filters, climbingType: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500">
                        <option value="">Tous les types</option>
                        <option value="boulder">Bloc</option>
                        <option value="sport">Voie</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cotation (FR)</label>
                    <select value={filters.grade} onChange={e => setFilters({...filters, grade: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500">
                        <option value="">Toutes cotations</option>
                        {GRADES_FR.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Style</label>
                    <select value={filters.style} onChange={e => setFilters({...filters, style: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500">
                        <option value="">Tous les styles</option>
                        {CLIMBING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tri par Cotation</label>
                    <select value={filters.sort} onChange={e => setFilters({...filters, sort: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500">
                        <option value="recent">Plus récent</option>
                        <option value="grade_asc">Cotation Croissante</option>
                        <option value="grade_desc">Cotation Décroissante</option>
                    </select>
                </div>
            </div>
        )}

        {loading ? (
            <div className="flex flex-col items-center justify-center h-64"><Loader2 size={48} className="animate-spin text-blue-500" /></div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {walls.map(wall => (
                    <WallCard 
                        key={wall.id} id={wall.id} name={wall.name} createdAt={wall.created_at} 
                        thumbnail={wall.data?.metadata?.thumbnail} 
                        authorId={wall.data?.metadata?.authorId}
                        authorName={wall.data?.metadata?.authorName}
                        authorAvatarUrl={wall.data?.metadata?.authorAvatarUrl}
                        onClick={() => navigate(`/view/${wall.id}`)}
                        isRemix={!!wall.data?.metadata?.parentId}
                        parentName={wall.data?.metadata?.parentName}
                        climbingType={wall.climbing_type}
                        gradeFr={wall.grade_fr}
                        styles={wall.styles}
                    />
                ))}
                {walls.length === 0 && <div className="col-span-full text-center py-20 text-gray-500 bg-gray-900/30 rounded-3xl border border-dashed border-gray-800"><p>Aucun mur ne correspond à ces critères.</p></div>}
            </div>
        )}
      </main>

      <footer className="border-t border-white/5 bg-gray-950 py-12 mt-auto">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-gray-500 text-sm">
              <div className="font-mono">© 2026 BetaBlock. Open Source Climbing Engine.</div>
          </div>
      </footer>
    </div>
  );
};
