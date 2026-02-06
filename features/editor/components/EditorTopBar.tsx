
import React from 'react';
import { ArrowLeft, Edit2, Save, Globe } from 'lucide-react';
import { WallMetadata, AppMode } from '../../../types';

interface EditorTopBarProps {
    mode: AppMode;
    metadata: WallMetadata;
    setMetadata: (m: any) => void; 
    isDirty: boolean;
    isEditingName: boolean;
    setIsEditingName: (b: boolean) => void;
    onExit: () => void;
    onSave: () => void;
    onPublish: () => void;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({ 
    mode, metadata, setMetadata, isDirty, isEditingName, setIsEditingName, onExit, onSave, onPublish 
}) => {
    if (mode === 'VIEW') return null;

    return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-3 bg-gray-900 border-b border-white/5 z-[110] relative shrink-0">
            <style>{`
                @keyframes soft-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-1.5px); }
                }
                @keyframes shimmer {
                    0% { left: -150%; }
                    100% { left: 150%; }
                }
                .animate-soft-float {
                    animation: soft-float 4s ease-in-out infinite;
                }
            `}</style>
            
            <div className="flex items-center gap-4 justify-start">
                <button onClick={onExit} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors flex items-center gap-2 group relative overflow-hidden">
                    <div className="absolute top-0 -inset-full h-full w-1/2 z-20 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 group-hover:animate-[shimmer_0.8s_ease-in-out] pointer-events-none" />
                    
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    
                    <img 
                        src="https://i.ibb.co/zTvzzrFM/apple-touch-icon.png" 
                        alt="Logo" 
                        className="w-6 h-6 object-contain animate-soft-float transition-all duration-500 group-hover:scale-110 group-hover:rotate-6" 
                    />
                    
                    <span className="font-black italic tracking-tighter text-blue-500 hidden sm:inline animate-soft-float [animation-delay:0.5s] transition-all duration-500 group-hover:text-blue-400 group-hover:scale-105 origin-left">
                        BetaBlock
                    </span>
                </button>
            </div>
            <div className="flex flex-col items-center justify-center min-w-0 px-4">
                {isEditingName ? (
                  <input 
                    autoFocus
                    className="bg-gray-800 text-white text-sm font-bold border-b border-blue-500 outline-none px-2 py-1 text-center"
                    value={metadata.name}
                    onChange={(e) => { setMetadata((prev: WallMetadata) => ({ ...prev, name: e.target.value })); }}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                  />
                ) : (
                  <div className="relative flex items-center justify-center cursor-pointer group" onClick={() => setIsEditingName(true)}>
                    <h1 className="text-sm font-bold text-white truncate max-w-[200px] md:max-w-[400px] text-center" title={metadata.name}>
                        {metadata.name || "Nouveau mur"}
                    </h1>
                    <div className="absolute left-full flex items-center ml-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Edit2 size={12} className="text-gray-500" />
                    </div>
                  </div>
                )}
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
                    {mode === 'BUILD' ? 'Structure' : 'Prises'}
                    {isDirty && <span className="ml-2 text-blue-400 font-black">•</span>}
                </span>
            </div>
            <div className="flex items-center gap-2 justify-end">
                <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-xl text-xs font-bold transition-all border border-gray-700 hover:border-gray-600">
                    <Save size={14} /> <span className="hidden sm:inline">Sauvegarder</span>
                </button>
                <button onClick={onPublish} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-black transition-all shadow-lg">
                    <Globe size={14} /> <span>PUBLIER</span>
                </button>
            </div>
        </div>
    );
};
