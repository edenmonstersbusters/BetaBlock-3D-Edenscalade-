
import React from 'react';
import { createPortal } from 'react-dom';
import { X, User } from 'lucide-react';
import { UserProfile } from '../../types';
import { UserAvatar } from './UserAvatar';
import { useNavigate } from 'react-router-dom';

interface UserListModalProps {
  title: string;
  users: UserProfile[];
  onClose: () => void;
}

export const UserListModal: React.FC<UserListModalProps> = ({ title, users, onClose }) => {
  const navigate = useNavigate();

  const handleUserClick = (userId: string) => {
      onClose();
      navigate(`/profile/${userId}`);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
             <h2 className="text-lg font-black text-white">{title}</h2>
             <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                 <X size={20} />
             </button>
        </div>

        <div className="overflow-y-auto p-2 custom-scrollbar flex-1">
            {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <User size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun utilisateur trouvé.</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {users.map(user => (
                        <div 
                            key={user.id}
                            onClick={() => handleUserClick(user.id)}
                            className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors group"
                        >
                            <UserAvatar userId={null} url={user.avatar_url} name={user.display_name} size="md" />
                            <div>
                                <h3 className="text-sm font-bold text-gray-200 group-hover:text-blue-400 transition-colors">{user.display_name}</h3>
                                {user.climbing_grade && (
                                    <span className="text-[10px] text-gray-500 bg-gray-950 px-1.5 py-0.5 rounded border border-white/5">{user.climbing_grade}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
