
import React from 'react';
import { Plus, LayoutGrid } from 'lucide-react';

interface GalleryHeroProps {
    user: any;
    onNavigate: (path: string) => void;
}

export const GalleryHero: React.FC<GalleryHeroProps> = ({ user, onNavigate }) => {
    return (
        <header className="relative py-24 px-6 border-b border-white/10 overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950 pointer-events-none" />
            <div className="max-w-7xl mx-auto relative z-10 text-center">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">BetaBlock <span className="text-blue-500">Galerie</span></h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">La plateforme communautaire des ouvreurs. Explorez les créations publiques ou gérez vos projets privés.</p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                        onClick={() => onNavigate('/builder')}
                        className="group flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-full transition-all shadow-lg shadow-blue-600/20"
                    >
                        <Plus size={20} />
                        <span>Créer un Nouveau Mur</span>
                    </button>
                    {user && (
                        <button 
                            onClick={() => onNavigate('/projects')}
                            className="flex items-center gap-3 px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg rounded-full border border-white/10 transition-all"
                        >
                            <LayoutGrid size={20} />
                            <span>Mes Murs Privés</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
