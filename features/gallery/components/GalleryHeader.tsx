
import React from 'react';
import { LogOut, LayoutGrid, LogIn, Settings } from 'lucide-react';
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
            <style>{`
                @keyframes soft-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-1.5px); }
                }
                @keyframes shimmer {
                    0% { left: -150%; }
                    100% { left: 150%; }
                }
                .animate-soft-float {
                    animation: soft-float 4s ease-in-out infinite;
                }
            `}</style>
            
            <div onClick={() => onNavigate('/')} className="flex items-center gap-2 group cursor-pointer relative overflow-hidden p-2 rounded-xl transition-all">
                {/* Shimmer Flash Effect */}
                <div className="absolute top-0 -inset-full h-full w-1/2 z-20 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 group-hover:animate-[shimmer_0.8s_ease-in-out] pointer-events-none" />
                
                <img 
                    src="https://i.ibb.co/zTvzzrFM/apple-touch-icon.png" 
                    alt="Logo BetaBlock" 
                    className="w-8 h-8 object-contain animate-soft-float transition-all duration-500 group-hover:scale-110 group-hover:rotate-6" 
                />
                <div className="text-xl font-black italic tracking-tighter text-blue-500 animate-soft-float [animation-delay:0.5s] transition-all duration-500 group-hover:text-blue-400 group-hover:scale-105 origin-left">
                    BetaBlock
                </div>
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
                        
                        <button 
                            onClick={() => onNavigate('/settings')}
                            className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors border border-white/5"
                            title="Paramètres"
                        >
                            <Settings size={18} />
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
