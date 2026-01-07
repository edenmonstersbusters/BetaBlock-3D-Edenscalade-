
import React from 'react';
import { AlertTriangle, Info, Loader2, Cloud, Download, Check, Save, Copy } from 'lucide-react';

export interface ModalConfig {
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  isAlert?: boolean;
  isSaveDialog?: boolean;
}

interface GlobalModalProps {
  config: ModalConfig | null;
  onClose: () => void;
  
  // Props spécifiques à la sauvegarde
  isSavingCloud?: boolean;
  generatedLink?: string | null;
  onSaveCloud?: () => void;
  onDownload?: () => void;
}

export const GlobalModal: React.FC<GlobalModalProps> = ({ 
  config, onClose, isSavingCloud, generatedLink, onSaveCloud, onDownload 
}) => {
  if (!config) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {config.isSaveDialog ? (
          // --- Contenu Spécifique Sauvegarde ---
          <div className="p-6">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><Save size={24} /></div>
                <h2 className="text-xl font-bold text-white">{config.title}</h2>
             </div>
             
             {!generatedLink ? (
               <div className="space-y-4">
                 <button 
                   onClick={onSaveCloud} 
                   disabled={isSavingCloud}
                   className="w-full p-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/50 rounded-xl flex items-center gap-4 transition-all group"
                 >
                    <div className="p-3 bg-blue-500 text-white rounded-lg shadow-lg group-hover:scale-110 transition-transform">
                      {isSavingCloud ? <Loader2 size={24} className="animate-spin"/> : <Cloud size={24} />}
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">Sauvegarde Cloud (Recommandé)</h3>
                      <p className="text-xs text-gray-400">Génère un lien unique pour partager votre mur.</p>
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
                      <p className="text-xs text-gray-500">Télécharge un fichier .json sur votre appareil.</p>
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
        ) : (
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
