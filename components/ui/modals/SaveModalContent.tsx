
import React, { useState } from 'react';
import { Save, Edit3, Cloud, Loader2, Download, Check, Copy, ChevronRight, ChevronLeft, Tag, Hash, Trophy } from 'lucide-react';
import { ModalConfig, WallMetadata } from '../../../types';
import { CLIMBING_STYLES, GRADES_FR, GRADES_V, convertGrade } from '../../../utils/grading';

interface SaveModalContentProps {
  config: ModalConfig;
  onClose: () => void;
  isSavingCloud?: boolean;
  generatedLink?: string | null;
  onSaveCloud?: () => Promise<boolean>;
  onDownload?: () => void;
  wallName?: string;
  onWallNameChange?: (name: string) => void;
  metadata?: WallMetadata;
  onMetadataChange?: (m: Partial<WallMetadata>) => void;
}

export const SaveModalContent: React.FC<SaveModalContentProps> = ({ 
  config, onClose, isSavingCloud, generatedLink, onSaveCloud, onDownload, wallName, onWallNameChange, metadata, onMetadataChange 
}) => {
  const [step, setStep] = useState(1);
  const isPublishing = config.title.toLowerCase().includes('publier');

  const toggleStyle = (style: string) => {
    const currentStyles = metadata?.styles || [];
    const newStyles = currentStyles.includes(style)
      ? currentStyles.filter(s => s !== style)
      : [...currentStyles, style];
    onMetadataChange?.({ styles: newStyles });
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nom du mur</label>
                <div className="relative">
                    <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                        type="text" 
                        value={wallName} 
                        onChange={(e) => onWallNameChange?.(e.target.value)}
                        className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 outline-none transition-colors font-bold"
                        placeholder="Ex: Le toit du monde"
                    />
                </div>
             </div>

             <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Description (Optionnel)</label>
                <textarea 
                    value={metadata?.description || ''} 
                    onChange={(e) => onMetadataChange?.({ description: e.target.value })}
                    className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 px-4 text-white text-sm focus:border-blue-500 outline-none transition-colors min-h-[80px]"
                    placeholder="Racontez l'histoire de ce mur..."
                />
             </div>

             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => onMetadataChange?.({ climbingType: 'boulder' })}
                  className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-2 transition-all ${metadata?.climbingType === 'boulder' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'}`}
                >
                  <Hash size={20} />
                  <span>BLOC</span>
                </button>
                <button 
                  onClick={() => onMetadataChange?.({ climbingType: 'sport' })}
                  className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-2 transition-all ${metadata?.climbingType === 'sport' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'}`}
                >
                  <Trophy size={20} />
                  <span>VOIE (SPORT)</span>
                </button>
             </div>
             
             <button 
              onClick={() => setStep(2)}
              disabled={!wallName?.trim()}
              className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-30"
             >
               <span>Suivant (Cotation & Styles)</span>
               <ChevronRight size={18} />
             </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cotation FR</label>
                   <select 
                      value={metadata?.gradeFr || '6a'}
                      onChange={(e) => {
                        const val = e.target.value;
                        onMetadataChange?.({ gradeFr: val, gradeV: convertGrade(val, 'FR') });
                      }}
                      className="w-full bg-black border border-gray-700 rounded-xl py-3 px-3 text-white text-sm outline-none focus:border-blue-500"
                   >
                     {GRADES_FR.map(g => <option key={g} value={g}>{g}</option>)}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cotation V</label>
                   <select 
                      value={metadata?.gradeV || 'V3'}
                      onChange={(e) => {
                        const val = e.target.value;
                        onMetadataChange?.({ gradeV: val, gradeFr: convertGrade(val, 'V') });
                      }}
                      className="w-full bg-black border border-gray-700 rounded-xl py-3 px-3 text-white text-sm outline-none focus:border-emerald-500"
                   >
                     {GRADES_V.map(v => <option key={v} value={v}>{v}</option>)}
                   </select>
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Tag size={12}/> Styles du mur</label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                    {CLIMBING_STYLES.map(style => (
                        <button 
                            key={style}
                            onClick={() => toggleStyle(style)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${metadata?.styles?.includes(style) ? 'bg-blue-500 border-blue-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                        >
                            {style}
                        </button>
                    ))}
                </div>
             </div>

             <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="p-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl"><ChevronLeft size={20}/></button>
                <button 
                  onClick={() => setStep(3)}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black shadow-lg shadow-blue-900/20"
                >
                  Valider les métadonnées
                </button>
             </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
             <button 
               onClick={onSaveCloud} 
               disabled={isSavingCloud}
               className="w-full p-6 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/50 rounded-2xl flex items-center gap-4 transition-all group"
             >
                <div className="p-4 bg-emerald-500 text-white rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  {isSavingCloud ? <Loader2 size={32} className="animate-spin"/> : <Cloud size={32} />}
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">Finaliser la publication</h3>
                  <p className="text-xs text-gray-400">Votre mur sera prêt pour la communauté.</p>
                </div>
             </button>

             <button 
                onClick={onDownload}
                className="w-full p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl flex items-center gap-4 transition-all group"
             >
                <div className="p-2 bg-gray-700 text-gray-300 rounded-lg group-hover:scale-110 transition-transform">
                  <Download size={20} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-300 group-hover:text-white transition-colors text-sm">Sauvegarde locale .json</h3>
                </div>
             </button>
             
             <button onClick={() => setStep(2)} className="w-full text-xs text-gray-500 hover:text-white font-bold py-2">Retour aux réglages</button>
          </div>
        );
    }
  };

  if (generatedLink && !isSavingCloud) {
    return (
      <div className="p-6 space-y-4 animate-in slide-in-from-bottom duration-300">
        <div className="p-4 bg-emerald-900/20 border border-emerald-500/50 rounded-xl text-center">
          <div className="inline-flex p-3 bg-emerald-500 rounded-full text-white mb-2 shadow-lg ring-4 ring-emerald-500/20">
            <Check size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">C'est en ligne !</h3>
          <p className="text-xs text-emerald-400">Votre mur est désormais disponible dans le Hub.</p>
        </div>
        
        <div>
          <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Lien de partage</label>
          <div className="flex gap-2">
            <input readOnly value={generatedLink} className="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono select-all focus:border-blue-500 outline-none" />
            <button onClick={() => { navigator.clipboard.writeText(generatedLink); alert("Lien copié !"); }} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"><Copy size={20}/></button>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold">Terminer</button>
      </div>
    );
  }

  return (
    <div className="p-6">
       <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg ${isPublishing ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            <Save size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">{config.title}</h2>
       </div>
       
       {renderStep()}
    </div>
  );
};
