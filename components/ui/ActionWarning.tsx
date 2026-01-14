
import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface ActionWarningProps {
  x: number;
  y: number;
  message: string;
  onClose: () => void;
}

export const ActionWarning: React.FC<ActionWarningProps> = ({ x, y, message, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Temps pour l'animation de sortie
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      className={`fixed z-[1000] pointer-events-none transition-all duration-300 transform ${visible ? 'opacity-100 -translate-y-2' : 'opacity-0 translate-y-0'}`}
      style={{ top: y - 45, left: x - 100 }}
    >
      <div className="bg-gray-900 border border-orange-500/50 text-orange-400 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap">
        <AlertCircle size={14} className="animate-pulse" />
        <span className="text-[11px] font-bold uppercase tracking-tight">{message}</span>
        {/* Petite flèche en bas */}
        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-orange-500/50" />
      </div>
    </div>
  );
};
