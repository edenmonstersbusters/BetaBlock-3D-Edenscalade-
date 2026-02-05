
import React from 'react';
import { X } from 'lucide-react';
import { ModalConfig } from '../../types';
import { ExitModalContent } from './modals/ExitModalContent';
import { ShareModalContent } from './modals/ShareModalContent';
import { SaveModalContent } from './modals/SaveModalContent';
import { AlertModalContent } from './modals/AlertModalContent';

interface GlobalModalProps {
  config: ModalConfig | null;
  onClose: () => void;
  
  // Props spécifiques à la sauvegarde
  isSavingCloud?: boolean;
  generatedLink?: string | null;
  onSaveCloud?: () => Promise<boolean>; // Retourne désormais un booléen pour valider le succès
  onDownload?: () => void;
  wallName?: string;
  onWallNameChange?: (name: string) => void;
}

export const GlobalModal: React.FC<GlobalModalProps> = ({ 
  config, onClose, isSavingCloud, generatedLink, onSaveCloud, onDownload, wallName, onWallNameChange 
}) => {
  if (!config) return null;

  const currentLink = generatedLink || window.location.href;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* BOUTON FERMER GÉNÉRIQUE */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10">
            <X size={20} />
        </button>

        {config.isExitDialog ? (
          <ExitModalContent 
            config={config} 
            onClose={onClose} 
            onSaveCloud={onSaveCloud} 
          />
        ) : config.isShareViewerDialog ? (
          <ShareModalContent 
            config={config} 
            link={currentLink} 
            onClose={onClose} 
            onDownload={onDownload} 
          />
        ) : config.isSaveDialog ? (
          <SaveModalContent 
            config={config} 
            onClose={onClose}
            isSavingCloud={isSavingCloud}
            generatedLink={generatedLink}
            onSaveCloud={onSaveCloud}
            onDownload={onDownload}
            wallName={wallName}
            onWallNameChange={onWallNameChange}
          />
        ) : (
          <AlertModalContent 
            config={config} 
            onClose={onClose} 
          />
        )}
      </div>
    </div>
  );
};
