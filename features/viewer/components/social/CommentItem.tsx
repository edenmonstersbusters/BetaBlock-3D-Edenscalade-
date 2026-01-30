
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Reply } from 'lucide-react';
import { Comment } from '../../../../types';
import { UserAvatar } from '../../../../components/ui/UserAvatar';

interface CommentItemProps {
    comment: Comment;
    depth: number;
    onReply: (id: string, author: string) => void;
    onLike: (id: string, authorId: string, e: React.MouseEvent) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment, depth, onReply, onLike }) => {
    const navigate = useNavigate();
    const maxDepth = 2;
    const isTooDeep = depth > maxDepth;

    const handleAuthorClick = (e: React.MouseEvent) => {
        if (comment.user_id) {
            e.stopPropagation();
            navigate(`/profile/${comment.user_id}`);
        }
    };

    return (
        <div className={`flex flex-col gap-2 ${depth > 0 ? 'mt-3 relative' : 'py-3 border-b border-gray-800'}`}>
            {depth > 0 && (
                <div className="absolute left-[-16px] top-0 bottom-0 w-px bg-gray-800" />
            )}
            
            <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1 cursor-pointer">
                    <UserAvatar 
                        userId={comment.user_id}
                        name={comment.author_name} 
                        url={comment.author_avatar_url}
                        size="sm"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between">
                        <span 
                            className="text-xs font-bold text-gray-300 truncate hover:underline hover:text-blue-400 cursor-pointer transition-colors"
                            onClick={handleAuthorClick}
                        >
                            {comment.author_name}
                        </span>
                        <span className="text-[9px] text-gray-600">{new Date(comment.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5 whitespace-pre-wrap break-words">{comment.text}</p>
                    
                    <div className="flex items-center gap-4 mt-2">
                        <button 
                            onClick={(e) => onLike(comment.id, comment.user_id, e)}
                            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${comment.user_has_liked ? 'text-red-400' : 'text-gray-600 hover:text-gray-400'}`}
                        >
                            <Heart size={12} fill={comment.user_has_liked ? "currentColor" : "none"} />
                            <span>{comment.likes_count || 0}</span>
                        </button>
                        
                        <button 
                            onClick={() => onReply(comment.id, comment.author_name)}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-blue-400 transition-colors"
                        >
                            <Reply size={12} />
                            <span>Répondre</span>
                        </button>
                    </div>
                </div>
            </div>

            {comment.replies && comment.replies.length > 0 && (
                <div className={`ml-4 ${isTooDeep ? 'border-l-2 border-gray-800 pl-2' : ''}`}>
                    {comment.replies.map(reply => (
                        <CommentItem 
                            key={reply.id} 
                            comment={reply} 
                            depth={depth + 1} 
                            onReply={onReply}
                            onLike={onLike}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
