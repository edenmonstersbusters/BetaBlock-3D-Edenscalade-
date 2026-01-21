
import React from 'react';
import { Box } from 'lucide-react';
import { WallCard } from '../../gallery/WallCard';

interface ProfilePortfolioProps {
    walls: any[];
    isOwnProfile: boolean;
    authorName: string;
    authorAvatarUrl?: string;
    onWallClick: (id: string) => void;
    onCreateClick: () => void;
}

export const ProfilePortfolio: React.FC<ProfilePortfolioProps> = ({ walls, isOwnProfile, authorName, authorAvatarUrl, onWallClick, onCreateClick }) => {
    const validWalls = walls.filter(w => w && w.id);

    return (
        <section className="space-y-8 pt-8 relative">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-900 rounded-2xl text-blue-500"><Box size={24} /></div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter">{isOwnProfile ? "Mes Créations" : `Murs de ${authorName}`}</h2>
                        <p className="text-xs text-gray-500 uppercase font-black tracking-widest mt-1">Portfolio d'ouverture</p>
                    </div>
                </div>
                <div className="px-4 py-2 bg-gray-900 border border-white/5 rounded-2xl text-xs font-bold text-gray-400">
                    {validWalls.length} murs
                </div>
            </div>

            {validWalls.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {validWalls.map(wall => (
                        <WallCard 
                            key={wall.id} id={wall.id} name={wall.name} createdAt={wall.created_at} 
                            thumbnail={wall.data?.metadata?.thumbnail} 
                            authorName={authorName} authorAvatarUrl={authorAvatarUrl} 
                            onClick={() => onWallClick(wall.id)} 
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 bg-gray-900/20 rounded-[40px] border border-dashed border-gray-800">
                     <Box size={40} className="text-gray-800 mb-4" />
                     <p className="text-gray-500 font-medium">Aucune création visible pour le moment.</p>
                     {isOwnProfile && (
                         <button onClick={onCreateClick} className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-xs font-bold transition-all">
                             Créer mon premier mur
                         </button>
                     )}
                </div>
            )}
        </section>
    );
};
