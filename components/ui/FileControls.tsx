
import React, { useRef } from 'react';
import { Save, FolderOpen, FilePlus } from 'lucide-react';

interface FileControlsProps {
  onExport: () => void;
  onImport: (file: File) => void;
  onNew?: () => void;
}

export const FileControls: React.FC<FileControlsProps> = ({ onExport, onImport, onNew }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file); // Appelle la fonction parent avec le fichier réel
      e.target.value = ''; // Reset pour permettre de recharger le même fichier
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-800">
      <div className="flex items-center space-x-2 text-sm font-medium text-gray-400 uppercase tracking-wider">
        <Save size={14} /><span>Gestion des Fichiers</span>
      </div>
      <div className={`grid gap-2 ${onNew ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {onNew && (
          <button 
            onClick={onNew}
            className="flex items-center justify-center gap-2 py-2 px-2 bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 rounded-lg border border-gray-700 transition-all"
            title="Nouveau mur vierge"
          >
            <FilePlus size={14} className="text-purple-400" />
            <span className="truncate">Nouveau</span>
          </button>
        )}
        <button 
          onClick={onExport}
          className="flex items-center justify-center gap-2 py-2 px-2 bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 rounded-lg border border-gray-700 transition-all"
        >
          <Save size={14} className="text-emerald-400" />
          <span className="truncate">Sauvegarder</span>
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-2 px-2 bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 rounded-lg border border-gray-700 transition-all"
        >
          <FolderOpen size={14} className="text-blue-400" />
          <span className="truncate">Charger</span>
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".json"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
