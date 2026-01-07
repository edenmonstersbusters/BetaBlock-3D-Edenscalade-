
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../core/api';
import { WallCard } from './WallCard';
import { Plus, Loader2, Search, Database } from 'lucide-react';

export const GalleryPage: React.FC = () => {
  const navigate = useNavigate();
  // Typage mis à jour pour inclure data qui contient la miniature
  const [walls, setWalls] = useState<{ id: string; name: string; created_at: string; data?: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWalls = async () => {
      const { data, error } = await api.getWallsList();
      if (error) {
        setError(error);
      } else {
        setWalls(data || []);
      }
      setLoading(false);
    };
    loadWalls();
  }, []);

  const handleCreateNew = () => {
    navigate('/builder');
  };

  const handleOpenWall = (id: string) => {
    navigate(`/builder?id=${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-y-auto custom-scrollbar">
      {/* HEADER HERO */}
      <header className="relative py-20 px-6 border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-gradient-to-br from-white via-gray-200 to-gray-600 bg-clip-text text-transparent mb-6 animate-in slide-in-from-bottom-4 duration-700">
                BetaBlock <span className="text-blue-500">Hub</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-in slide-in-from-bottom-6 duration-700 delay-100">
                Explorez, créez et partagez des murs d'escalade 3D. <br/>
                Rejoignez la communauté des ouvreurs virtuels.
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
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 text-sm font-bold text-gray-400 uppercase tracking-widest">
                <Database size={16} className="text-blue-500" />
                <span>Murs Récents ({walls.length})</span>
            </div>
            {/* Fake Search Bar for aesthetics */}
            <div className="hidden md:flex items-center bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-400 w-64">
                <Search size={14} className="mr-2" />
                <span>Rechercher...</span>
            </div>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
                <span className="text-sm font-mono animate-pulse">Chargement de la matrice...</span>
            </div>
        ) : error ? (
            <div className="p-8 border border-red-900/50 bg-red-900/10 rounded-2xl text-center">
                <h3 className="text-red-400 font-bold text-lg mb-2">Erreur de connexion</h3>
                <p className="text-gray-400 text-sm mb-4">{error}</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded-lg text-sm transition-colors">Réessayer</button>
            </div>
        ) : walls.length === 0 ? (
            <div className="text-center py-20 bg-gray-900/30 rounded-3xl border border-white/5 border-dashed">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Database className="text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">C'est bien vide ici...</h3>
                <p className="text-gray-500 mb-6">Soyez le premier à publier un mur sur le Hub !</p>
                <button onClick={handleCreateNew} className="text-blue-400 hover:text-white underline underline-offset-4 decoration-blue-500/30 hover:decoration-blue-500">Commencer maintenant</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {walls.map((wall, idx) => (
                    <div key={wall.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                        <WallCard 
                            id={wall.id} 
                            name={wall.name || "Mur Sans Nom"} 
                            createdAt={wall.created_at} 
                            thumbnail={wall.data?.metadata?.thumbnail} // Extraction de la miniature depuis le JSON
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
