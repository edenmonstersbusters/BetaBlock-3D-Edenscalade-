
import React from 'react';
import { Home } from 'lucide-react';

interface ViewerHeaderProps {
    title: string;
    onHome: () => void;
}

export const ViewerHeader: React.FC<ViewerHeaderProps> = ({ title, onHome }) => {
    return (
        <div className="p-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <button 
                    onClick={onHome} 
                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-blue-400 flex-shrink-0 transition-colors" 
                    title="Retour à la Galerie"
                >
                    <Home size={20} />
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold text-blue-400 truncate block w-full leading-tight" title={title}>
                        {title || "Mur Sans Nom"}
                    </h1>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1">
                        <span className="uppercase tracking-wider">SPECTATEUR</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
