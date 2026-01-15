
import React from 'react';
import { AlertTriangle, Info, Loader2, Cloud, Download, Check, Save, Copy, Edit3, LogOut, Share2, Mail, MessageSquare, Twitter, Facebook, X } from 'lucide-react';
import { ModalConfig } from '../../types';

interface GlobalModalProps {
  config: ModalConfig | null;
  onClose: () => void;
  
  // Props spécifiques à la sauvegarde
  isSavingCloud?: boolean;
  generatedLink?: string | null;
  onSaveCloud?: () => void;
  onDownload?: () => void;
  wallName?: string;
  onWallNameChange?: (name: string) => void;
}

export const GlobalModal: React.FC<GlobalModalProps> = ({ 
  config, onClose, isSavingCloud, generatedLink, onSaveCloud, onDownload, wallName, onWallNameChange 
}) => {
  if (!config) return null;

  const currentLink = generatedLink || window.location.href;

  const shareByEmail = () => {
    window.location.href = `mailto:?subject=BetaBlock : Regarde mon mur d'escalade !&body=Découvre ce mur sur BetaBlock 3D : ${currentLink}`;
  };

  const shareByWhatsApp = () => {
    window.open(`https://wa.me/?text=Regarde ce mur d'escalade sur BetaBlock 3D : ${currentLink}`, '_blank');
  };

  const shareByTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=Mon nouveau mur sur BetaBlock 3D !&url=${currentLink}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* BOUTON FERMER GÉNÉRIQUE */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10">
            <X size={20} />
        </button>

        {/* --- DIALOGUE DE SORTIE (CONFIRMATION) --- */}
        {config.isExitDialog && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 rounded-lg bg-red-500/20 text-red-400"><LogOut size={24} /></div>
               <h2 className="text-xl font-bold text-white">{config.title}</h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">{config.message}</p>
            
            <div className="space-y-3">
              <button 
                onClick={async () => {
                    if (onSaveCloud) await onSaveCloud();
                    if (config.onConfirm) config.onConfirm();
                    onClose();
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-3 font-bold transition-all shadow-lg shadow-emerald-900/20"
              >
                <Save size={18} />
                <span>Sauvegarder et Quitter</span>
              </button>
              <button 
                onClick={() => {
                    if (config.onConfirm) config.onConfirm();
                    onClose();
                }}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl font-bold transition-all border border-white/5"
              >
                Quitter sans sauvegarder
              </button>
              <button 
                onClick={onClose}
                className="w-full py-2 text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* --- DIALOGUE DE PARTAGE SPECTATEUR --- */}
        {config.isShareViewerDialog && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><Share2 size={24} /></div>
              <h2 className="text-xl font-bold text-white">{config.title}</h2>
            </div>

            <div className="space-y-6">
              {/* Lien Unique */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Lien du mur</label>
                <div className="flex gap-2">
                  <input readOnly value={currentLink} className="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono select-all outline-none focus:border-blue-500" />
                  <button onClick={() => { navigator.clipboard.writeText(currentLink); alert("Lien copié !"); }} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"><Copy size={18}/></button>
                </div>
              </div>

              {/* Réseaux Sociaux */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block text-center">Partager sur</label>
                <div className="flex justify-center gap-4">
                  <button onClick={shareByEmail} className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-all transform hover:scale-110 shadow-lg border border-white/5" title="Email"><Mail size={20}/></button>
                  <button onClick={shareByWhatsApp} className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-emerald-400 transition-all transform hover:scale-110 shadow-lg border border-white/5" title="WhatsApp/SMS"><MessageSquare size={20}/></button>
                  <button onClick={shareByTwitter} className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-blue-400 transition-all transform hover:scale-110 shadow-lg border border-white/5" title="Twitter/X"><Twitter size={20}/></button>
                  <button onClick={() => window.open(`https://facebook.com/sharer/sharer.php?u=${currentLink}`, '_blank')} className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-blue-600 transition-all transform hover:scale-110 shadow-lg border border-white/5" title="Facebook"><Facebook size={20}/></button>
                </div>
              </div>

              <div className="h-px bg-white/5" />

              {/* Téléchargement Local */}
              <button 
                onClick={onDownload}
                className="w-full p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl flex items-center gap-4 transition-all group"
              >
                <div className="p-3 bg-gray-700 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform shadow-lg">
                  <Download size={20} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-200 group-hover:text-white transition-colors">Exporter le .json</h3>
                  <p className="text-xs text-gray-500">Sauvegarder une copie locale pour usage hors-ligne.</p>
                </div>
              </button>

              <button 
                onClick={onClose}
                className="w-full py-2 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest mt-2"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {config.isSaveDialog && (
          // --- Contenu Spécifique Sauvegarde ---
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
                      {isSavingCloud ? <Loader2 size={24} className="animate-spin"/> : <Cloud size={24} />}
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">Sauvegarde Cloud</h3>
                      <p className="text-xs text-gray-400">Publier sur le Hub communautaire.</p>
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
                    <p className="text-xs text-emerald-400">Votre mur est en sécurité dans le cloud.</p>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Lien de partage</label>
                    <div className="flex gap-2">
                      <input readOnly value={generatedLink} className="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono select-all focus:border-blue-500 outline-none" />
                      <button onClick={() => { navigator.clipboard.writeText(generatedLink); alert("Lien copié !"); }} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"><Copy size={20}/></button>
                    </div>
                  </div>
                </div>
             )}

             <div className="mt-6 flex justify-end">
               <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">Fermer</button>
             </div>
          </div>
        )}

        {(config.isAlert || (!config.isSaveDialog && !config.isExitDialog && !config.isShareViewerDialog)) && (
          // --- Contenu Standard (Alertes / Confirmations) ---
          <>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${config.isAlert ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {config.isAlert ? <Info size={24} /> : <AlertTriangle size={24} />}
                </div>
                <h2 className="text-xl font-bold text-white">{config.title}</h2>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{config.message}</p>
            </div>
            <div className="p-4 bg-gray-950/50 flex flex-row-reverse gap-3">
              <button onClick={() => { if (config.onConfirm) config.onConfirm(); onClose(); }} className={`px-6 py-2 rounded-xl font-bold transition-all ${config.isAlert ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>{config.confirmText || "OK"}</button>
              {!config.isAlert && <button onClick={onClose} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all border border-white/5">Annuler</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
