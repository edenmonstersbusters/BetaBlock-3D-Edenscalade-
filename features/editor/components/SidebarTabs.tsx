
import React from 'react';
import { Scaling, Box } from 'lucide-react';

interface SidebarTabsProps {
    activeTab: 'structure' | 'holds';
    onChange: (tab: 'structure' | 'holds') => void;
}

export const SidebarTabs: React.FC<SidebarTabsProps> = ({ activeTab, onChange }) => {
    return (
        <div className="sticky top-0 z-50 flex border-b border-gray-800 bg-gray-950 text-xs font-bold uppercase tracking-wider">
            <button
                onClick={() => onChange('structure')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 transition-all relative ${
                    activeTab === 'structure' 
                        ? 'text-white bg-gray-900' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'
                }`}
            >
                <Scaling size={14} className={activeTab === 'structure' ? 'text-blue-500' : ''} />
                <span>Structure</span>
                {activeTab === 'structure' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400" />
                )}
            </button>

            <div className="w-px bg-gray-800 my-2" />

            <button
                onClick={() => onChange('holds')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 transition-all relative ${
                    activeTab === 'holds' 
                        ? 'text-white bg-gray-900' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'
                }`}
            >
                <Box size={14} className={activeTab === 'holds' ? 'text-emerald-500' : ''} />
                <span>Prises</span>
                {activeTab === 'holds' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400" />
                )}
            </button>
        </div>
    );
};
