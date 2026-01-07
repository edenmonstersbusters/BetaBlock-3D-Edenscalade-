
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message = "Chargement du mur..." }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 text-blue-400">
        <Loader2 size={48} className="animate-spin" />
        <span className="text-xl font-bold tracking-widest uppercase">{message}</span>
      </div>
    </div>
  );
};
