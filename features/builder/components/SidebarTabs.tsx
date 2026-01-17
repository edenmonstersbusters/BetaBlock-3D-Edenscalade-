
import React from 'react';
import { LayoutDashboard, Grip, Ruler } from 'lucide-react';

export type EditorTab = 'structure' | 'holds' | 'measure';

interface SidebarTabsProps {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  disabled?: boolean;
}

export const SidebarTabs: React.FC<SidebarTabsProps> = ({ activeTab, onTabChange, disabled }) => {
  const tabs = [
    { id: 'structure', label: 'Structure', icon: LayoutDashboard },
    { id: 'holds', label: 'Prises', icon: Grip },
    { id: 'measure', label: 'Mesure', icon: Ruler },
  ] as const;

  return (
    <div className="flex items-center p-2 bg-gray-950 border-b border-gray-800 gap-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => !disabled && onTabChange(tab.id)}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
              isActive 
                ? 'bg-gray-800 text-white shadow-md border border-gray-700' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon size={14} className={isActive ? 'text-blue-400' : ''} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
