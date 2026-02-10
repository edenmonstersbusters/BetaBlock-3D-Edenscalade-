
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Edit2, Save, Globe, FileText, ChevronDown, Upload, Download, Copy, FilePlus } from 'lucide-react';
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
    onImport: (file: File) => void;
    onExport: () => void;
    onNew: () => void;
    onRemix?: () => void;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({ 
    mode, metadata, setMetadata, isDirty, isEditingName, setIsEditingName, 
    onExit, onSave, onPublish, onImport, onExport, onNew, onRemix
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fermer le menu si on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImport(file);
            e.target.value = '';
            setIsMenuOpen(false);
        }
    };

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
                <button onClick={onExit} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors flex items-center gap-2 group relative overflow-hidden" title="Quitter l'éditeur">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <img 
                        src="https://i.ibb.co/zTvzzrFM/apple-touch-icon.png" 
                        alt="Logo" 
                        className="w-6 h-6 object-contain hidden md:block" 
                    />
                </button>

                {/* MENU FICHIER */}
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${isMenuOpen ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                    >
                        <FileText size={14} />
                        <span>Fichier</span>
                        <ChevronDown size={12} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[200]">
                            <div className="py-1">
                                <button onClick={() => { onNew(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200 transition-colors text-left">
                                    <FilePlus size={16} className="text-purple-400" /> 
                                    <span>Nouveau</span>
                                </button>
                                <div className="h-px bg-white/5 my-1" />
                                <button onClick={() => { onSave(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200 transition-colors text-left">
                                    <Save size={16} className="text-emerald-400" /> 
                                    <span>Sauvegarder</span>
                                </button>
                                <button onClick={() => { onPublish(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200 transition-colors text-left">
                                    <Globe size={16} className="text-blue-400" /> 
                                    <span>Publier</span>
                                </button>
                                <div className="h-px bg-white/5 my-1" />
                                <button onClick={() => { fileInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200 transition-colors text-left">
                                    <Upload size={16} className="text-orange-400" /> 
                                    <span>Importer JSON</span>
                                </button>
                                <button onClick={() => { onExport(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200 transition-colors text-left">
                                    <Download size={16} className="text-gray-400" /> 
                                    <span>Exporter JSON</span>
                                </button>
                                {onRemix && (
                                    <>
                                        <div className="h-px bg-white/5 my-1" />
                                        <button onClick={() => { onRemix(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200 transition-colors text-left">
                                            <Copy size={16} className="text-pink-400" /> 
                                            <span>Créer une copie</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Input caché pour l'import */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".json" 
                        onChange={handleFileChange}
                    />
                </div>
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
