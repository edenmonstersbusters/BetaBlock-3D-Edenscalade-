
import React from 'react';
import { LogOut, Save } from 'lucide-react';
import { ModalConfig } from '../../../types';

interface ExitModalContentProps {
  config: ModalConfig;
  onClose: () => void;
  onSaveCloud?: () => Promise<boolean>;
}

export const ExitModalContent: React.FC<ExitModalContentProps> = ({ config, onClose, onSaveCloud }) => {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
         <div className="p-2 rounded-lg bg-red-500/20 text-red-400"><LogOut size={24} /></div>
         <h2 className="text-xl font-bold text-white">{config.title}</h2>
      </div>
      <p className="text-gray-400 text-sm leading-relaxed mb-8">{config.message}</p>
      
      <div className="space-y-3">
        <button 
          onClick={async () => {
              if (onSaveCloud) {
                  const success = await onSaveCloud();
                  // Si la sauvegarde échoue (ex: l'utilisateur n'est pas connecté), on n'appelle pas onConfirm
                  if (!success) return; 
              }
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
  );
};
