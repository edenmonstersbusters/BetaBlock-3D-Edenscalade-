
import React from 'react';
import { LogOut, LayoutGrid, LogIn } from 'lucide-react';
import { NotificationsMenu } from '../../../components/ui/NotificationsMenu';
import { UserAvatar } from '../../../components/ui/UserAvatar';

interface GalleryHeaderProps {
    user: any;
    onLogin: () => void;
    onLogout: () => void;
    onNavigate: (path: string) => void;
}

export const GalleryHeader: React.FC<GalleryHeaderProps> = ({ user, onLogin, onLogout, onNavigate }) => {
    return (
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
            <div className="flex items-center gap-2 group cursor-default">
                <span className="text-3xl">🧗</span>
                <div className="text-xl font-black italic tracking-tighter text-blue-500 group-hover:text-blue-400 transition-colors">BetaBlock</div>
            </div>
            <div className="flex items-center gap-4">
                {user ? (
                    <div className="flex items-center gap-3">
                        <NotificationsMenu userId={user.id} />

                        <button 
                            onClick={() => onNavigate('/projects')}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-white/5 rounded-full text-xs font-bold transition-all text-gray-400 hover:text-white"
                        >
                            <LayoutGrid size={14} />
                            <span>Mes Murs</span>
                        </button>
                        <button 
                            onClick={() => onNavigate('/profile')}
                            className="flex items-center gap-2 p-1 pr-4 bg-gray-900/60 hover:bg-gray-800 border border-white/5 rounded-full transition-all group backdrop-blur-md"
                        >
                            <UserAvatar userId={user.id} url={user.user_metadata?.avatar_url} name={user.user_metadata?.display_name || user.email} size="sm" />
                            <span className="hidden sm:inline-block font-bold text-gray-300 group-hover:text-white truncate max-w-[150px]">
                                {user.user_metadata?.display_name || user.email?.split('@')[0]}
                            </span>
                        </button>
                        <button onClick={onLogout} className="p-2 bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={onLogin}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-bold transition-all"
                    >
                        <LogIn size={16} />
                        <span>Connexion</span>
                    </button>
                )}
            </div>
        </div>
    );
};
