
import React from 'react';
import { Share2, Copy, Mail, MessageSquare, Twitter, Facebook, Download } from 'lucide-react';
import { ModalConfig } from '../../../types';

interface ShareModalContentProps {
  config: ModalConfig;
  link: string;
  onClose: () => void;
  onDownload?: () => void;
}

export const ShareModalContent: React.FC<ShareModalContentProps> = ({ config, link, onClose, onDownload }) => {
  const shareByEmail = () => {
    window.location.href = `mailto:?subject=BetaBlock : Regarde mon mur d'escalade !&body=Découvre ce mur sur BetaBlock 3D : ${link}`;
  };

  const shareByWhatsApp = () => {
    window.open(`https://wa.me/?text=Regarde ce mur d'escalade sur BetaBlock 3D : ${link}`, '_blank');
  };

  const shareByTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=Mon nouveau mur sur BetaBlock 3D !&url=${link}`, '_blank');
  };

  return (
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
            <input readOnly value={link} className="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono select-all outline-none focus:border-blue-500" />
            <button onClick={() => { navigator.clipboard.writeText(link); alert("Lien copié !"); }} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"><Copy size={18}/></button>
          </div>
        </div>

        {/* Réseaux Sociaux */}
        <div>
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block text-center">Partager sur</label>
          <div className="flex justify-center gap-4">
            <button onClick={shareByEmail} className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-all transform hover:scale-110 shadow-lg border border-white/5" title="Email"><Mail size={20}/></button>
            <button onClick={shareByWhatsApp} className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-emerald-400 transition-all transform hover:scale-110 shadow-lg border border-white/5" title="WhatsApp/SMS"><MessageSquare size={20}/></button>
            <button onClick={shareByTwitter} className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-blue-400 transition-all transform hover:scale-110 shadow-lg border border-white/5" title="Twitter/X"><Twitter size={20}/></button>
            <button onClick={() => window.open(`https://facebook.com/sharer/sharer.php?u=${link}`, '_blank')} className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-400 hover:text-blue-600 transition-all transform hover:scale-110 shadow-lg border border-white/5" title="Facebook"><Facebook size={20}/></button>
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
  );
};
