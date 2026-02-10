
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Edit2, Save, Globe, FileText, ChevronDown, Upload, Download, Copy, FilePlus, Cloud, Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { WallMetadata, AppMode } from '../../../types';

interface EditorTopBarProps {
    mode: AppMode;
    metadata: WallMetadata;
    setMetadata: (m: any) => void; 
    isDirty: boolean;
    isEditingName: boolean;
    setIsEditingName: (b: boolean) => void;
    onExit: () => void;
    onSave: () => void; // Sauvegarde manuelle (Fichier)
    onPublish: () => void; // Action via menu Fichier
    onImport: (file: File) => void;
    onExport: () => void;
    onNew: () => void;
    onRemix?: () => void;
    
    // Nouveaux Props Auto-Save & Toggle
    saveStatus?: 'saved' | 'saving' | 'unsaved' | 'error';
    onTogglePublic?: () => void;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({ 
    mode, metadata, setMetadata, isDirty, isEditingName, setIsEditingName, 
    onExit, onSave, onPublish, onImport, onExport, onNew, onRemix,
    saveStatus = 'saved', onTogglePublic
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Rendu du statut de sauvegarde
    const renderSaveStatus = () => {
        switch(saveStatus) {
            case 'saving':
                return <span className="flex items-center gap-1.5 text-blue-400"><Loader2 size={10} className="animate-spin" /> Enregistrement...</span>;
            case 'unsaved':
                return <span className="flex items-center gap-1.5 text-orange-400"><div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" /> Non enregistré</span>;
            case 'error':
                return <span className="flex items-center gap-1.5 text-red-400"><AlertCircle size={10} /> Erreur de sauvegarde</span>;
            case 'saved':
            default:
                return <span className="flex items-center gap-1.5 text-gray-500"><Cloud size={10} /> Enregistré</span>;
        }
    };

    return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-3 bg-gray-900 border-b border-white/5 z-[110] relative shrink-0 h-[60px]">
            {/* GAUCHE : NAVIGATION & FICHIER */}
            <div className="flex items-center gap-4 justify-start">
                <button onClick={onExit} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors flex items-center gap-2 group relative overflow-hidden" title="Quitter l'éditeur">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <img src="https://i.ibb.co/zTvzzrFM/apple-touch-icon.png" alt="Logo" className="w-6 h-6 object-contain hidden md:block" />
                </button>

                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${isMenuOpen ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                    >
                        <FileText size={14} />
                        <span className="hidden sm:inline">Fichier</span>
                        <ChevronDown size={12} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[200]">
                            <div className="py-1">
                                <button onClick={() => { onNew(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200 transition-colors text-left"><FilePlus size={16} className="text-purple-400" /> <span>Nouveau</span></button>
                                <div className="h-px bg-white/5 my-1" />
                                <button onClick={() => { onSave(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200 transition-colors text-left"><Save size={16} className="text-emerald-400" /> <span>Forcer la sauvegarde</span></button>
                                <button onClick={() => { onPublish(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200 transition-colors text-left"><Globe size={16} className="text-blue-400" /> <span>Publier</span></button>
                                <div className="h-px bg-white/5 my-1" />
                                <button onClick={() => { fileInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200 transition-colors text-left"><Upload size={16} className="text-orange-400" /> <span>Importer JSON</span></button>
                                <button onClick={() => { onExport(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200 transition-colors text-left"><Download size={16} className="text-gray-400" /> <span>Exporter JSON</span></button>
                                {onRemix && (
                                    <>
                                        <div className="h-px bg-white/5 my-1" />
                                        <button onClick={() => { onRemix(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 text-sm text-gray-200 transition-colors text-left"><Copy size={16} className="text-pink-400" /> <span>Créer une copie</span></button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange}/>
                </div>
            </div>

            {/* CENTRE : TITRE & STATUT */}
            <div className="flex flex-col items-center justify-center min-w-0 px-4">
                <div className="flex items-center gap-2">
                    {isEditingName ? (
                      <input 
                        autoFocus
                        className="bg-gray-800 text-white text-sm font-bold border-b border-blue-500 outline-none px-2 py-0.5 text-center min-w-[150px]"
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
                </div>
                
                {/* STATUS INDICATOR (AUTO-SAVE) */}
                <div 
                    className="text-[10px] font-medium tracking-wide uppercase mt-0.5 cursor-pointer hover:underline"
                    onClick={onSave} // Clic force la sauvegarde manuelle
                    title="Cliquer pour forcer la sauvegarde"
                >
                    {renderSaveStatus()}
                </div>
            </div>
            
            {/* DROITE : VISIBILITY TOGGLE */}
            <div className="flex items-center gap-2 justify-end">
                {metadata.isPublic ? (
                    <button 
                        onClick={onTogglePublic}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/50 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_-3px_rgba(37,99,235,0.2)] hover:shadow-[0_0_20px_-3px_rgba(37,99,235,0.4)]"
                        title="Le mur est visible dans la galerie. Cliquez pour le passer en privé."
                    >
                        <Globe size={14} className="animate-pulse-slow" />
                        <span>PUBLIC</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-1"></span>
                    </button>
                ) : (
                    <button 
                        onClick={onTogglePublic}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg text-xs font-bold transition-all"
                        title="Le mur est privé. Cliquez pour le publier."
                    >
                        <Lock size={14} />
                        <span>PRIVÉ</span>
                    </button>
                )}
            </div>
        </div>
    );
};
