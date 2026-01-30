
import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { ModalConfig } from '../../../types';

interface AlertModalContentProps {
  config: ModalConfig;
  onClose: () => void;
}

export const AlertModalContent: React.FC<AlertModalContentProps> = ({ config, onClose }) => {
  return (
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
        <button 
          onClick={() => { if (config.onConfirm) config.onConfirm(); onClose(); }} 
          className={`px-6 py-2 rounded-xl font-bold transition-all ${config.isAlert ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
        >
          {config.confirmText || "OK"}
        </button>
        {!config.isAlert && (
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all border border-white/5"
          >
            Annuler
          </button>
        )}
      </div>
    </>
  );
};
