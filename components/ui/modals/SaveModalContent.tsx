
import React from 'react';
import { Save, Edit3, Cloud, Loader2, Download, Check, Copy, Lock, Globe } from 'lucide-react';
import { ModalConfig } from '../../../types';

interface SaveModalContentProps {
  config: ModalConfig;
  onClose: () => void;
  isSavingCloud?: boolean;
  generatedLink?: string | null;
  onSaveCloud?: () => Promise<boolean>;
  onDownload?: () => void;
  wallName?: string;
  onWallNameChange?: (name: string) => void;
  isPublic?: boolean;
}

export const SaveModalContent: React.FC<SaveModalContentProps> = ({ 
  config, onClose, isSavingCloud, generatedLink, onSaveCloud, onDownload, wallName, onWallNameChange, isPublic
}) => {
  return (
    <div className="p-6">
       <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><Save size={24} /></div>
          <h2 className="text-xl font-bold text-white">{config.title}</h2>
       </div>
       
       {!generatedLink || isSavingCloud ? (
         <div className="space-y-4">
           {/* Input Nom du Mur */}
           <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nom du mur</label>
              <div className="relative">
                  <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input 
                      type="text" 
                      value={wallName} 
                      onChange={(e) => onWallNameChange?.(e.target.value)}
                      className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 outline-none transition-colors font-bold"
                      placeholder="Mon Super Mur"
                  />
              </div>
           </div>

           <button 
             onClick={onSaveCloud} 
             disabled={isSavingCloud || !wallName?.trim()}
             className="w-full p-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/50 rounded-xl flex items-center gap-4 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
           >
              <div className="p-3 bg-blue-500 text-white rounded-lg shadow-lg group-hover:scale-110 transition-transform">
                {isSavingCloud ? <Loader2 size={24} className="animate-spin"/> : (isPublic ? <Globe size={24} /> : <Lock size={24} />)}
              </div>
              <div className="text-left">
                <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">Sauvegarde Cloud</h3>
                <p className="text-xs text-gray-400">
                    {isPublic ? "Mettre à jour dans la Galerie publique." : "Enregistrer dans l'espace privé."}
                </p>
              </div>
           </button>

           <button 
              onClick={onDownload}
              className="w-full p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl flex items-center gap-4 transition-all group"
           >
              <div className="p-3 bg-gray-700 text-gray-300 rounded-lg group-hover:scale-110 transition-transform">
                <Download size={24} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-300 group-hover:text-white transition-colors">Téléchargement Local</h3>
                <p className="text-xs text-gray-500">Sauvegarder un fichier .json</p>
              </div>
           </button>
         </div>
       ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="p-4 bg-emerald-900/20 border border-emerald-500/50 rounded-xl text-center">
              <div className="inline-flex p-3 bg-emerald-500 rounded-full text-white mb-2 shadow-lg ring-4 ring-emerald-500/20">
                <Check size={32} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Sauvegarde réussie !</h3>
              <p className="text-xs text-emerald-400">
                  {isPublic ? "Votre mur est visible dans la galerie." : "Votre mur est bien sauvegardé en privé."}
              </p>
            </div>
            
            {isPublic && (
                <div>
                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Lien de partage</label>
                <div className="flex gap-2">
                    <input readOnly value={generatedLink} className="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono select-all focus:border-blue-500 outline-none" />
                    <button onClick={() => { navigator.clipboard.writeText(generatedLink); alert("Lien copié !"); }} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"><Copy size={20}/></button>
                </div>
                </div>
            )}
          </div>
       )}

       <div className="mt-6 flex justify-end">
         <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">Fermer</button>
       </div>
    </div>
  );
};
