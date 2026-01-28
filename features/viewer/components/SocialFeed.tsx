
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../core/api';
import { auth } from '../../../core/auth';
import { Comment } from '../../../types';
import { MessageCircle, Heart, Reply, Send, Loader2, CornerDownRight } from 'lucide-react';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { ActionWarning } from '../../../components/ui/ActionWarning';

const CommentItem: React.FC<{ 
    comment: Comment; 
    depth: number; 
    onReply: (id: string, author: string) => void;
    onLike: (id: string, authorId: string, e: React.MouseEvent) => void;
}> = ({ comment, depth, onReply, onLike }) => {
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

interface SocialFeedProps {
  wallId: string;
  onRequestAuth: () => void;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ wallId, onRequestAuth }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [warning, setWarning] = useState<{ x: number, y: number, message: string } | null>(null);

  const fetchComments = async () => {
    const user = await auth.getUser();
    setCurrentUser(user);
    const data = await api.getComments(wallId, user?.id);
    setComments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [wallId]);

  const commentTree = useMemo(() => {
    const map = new Map<string, Comment>();
    const roots: Comment[] = [];
    const rawComments = JSON.parse(JSON.stringify(comments));

    rawComments.forEach((c: Comment) => {
        c.replies = [];
        map.set(c.id, c);
    });

    rawComments.forEach((c: Comment) => {
        if (c.parent_id && map.has(c.parent_id)) {
            map.get(c.parent_id)!.replies!.push(c);
        } else {
            roots.push(c);
        }
    });

    return roots.reverse();
  }, [comments]);

  const handlePost = async () => {
      if (!inputText.trim()) return;
      if (!currentUser) {
          onRequestAuth();
          return;
      }

      setIsPosting(true);
      const authorName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || "Anonyme";
      const avatarUrl = currentUser.user_metadata?.avatar_url;
      
      const { error } = await api.postComment(wallId, currentUser.id, authorName, inputText, replyTo?.id || null, avatarUrl);
      
      if (error) {
          console.error("Post comment error:", error);
          setWarning({ x: window.innerWidth / 2, y: window.innerHeight / 2, message: "Erreur lors de l'envoi." });
          setIsPosting(false);
          return;
      }
      
      setInputText('');
      setReplyTo(null);
      await fetchComments();
      setIsPosting(false);
  };

  const handleLike = async (commentId: string, authorId: string, e: React.MouseEvent) => {
      if (!currentUser) {
          onRequestAuth();
          return;
      }

      if (currentUser.id === authorId) {
          setWarning({ 
              x: e.clientX, 
              y: e.clientY, 
              message: "Vous ne pouvez pas liker votre commentaire !" 
          });
          return;
      }

      setComments(prev => prev.map(c => {
          if (c.id === commentId) {
              const newLiked = !c.user_has_liked;
              return { 
                  ...c, 
                  user_has_liked: newLiked, 
                  likes_count: (c.likes_count || 0) + (newLiked ? 1 : -1) 
              };
          }
          return c;
      }));

      const { error } = await api.toggleCommentLike(commentId, currentUser.id);
      if (error) {
          // Revert optimistic update
          setComments(prev => prev.map(c => {
              if (c.id === commentId) {
                  const revertedLiked = !c.user_has_liked;
                  return { 
                      ...c, 
                      user_has_liked: revertedLiked, 
                      likes_count: (c.likes_count || 0) + (revertedLiked ? 1 : -1) 
                  };
              }
              return c;
          }));
          setWarning({ x: e.clientX, y: e.clientY, message: "Erreur lors du like." });
      } else {
          // Sync with server
          const data = await api.getComments(wallId, currentUser.id);
          setComments(data);
      }
  };

  return (
    <div className="flex flex-col h-full relative">
        {warning && (
            <ActionWarning 
                x={warning.x} 
                y={warning.y} 
                message={warning.message} 
                onClose={() => setWarning(null)} 
            />
        )}

        <div className="p-3 bg-gray-800/50 rounded-xl mb-4 border border-gray-700">
            {replyTo && (
                <div className="flex items-center justify-between text-xs text-blue-400 mb-2 bg-blue-500/10 px-2 py-1 rounded">
                    <span className="flex items-center gap-1"><CornerDownRight size={12}/> Réponse à {replyTo.author}</span>
                    <button onClick={() => setReplyTo(null)} className="hover:text-white font-bold">X</button>
                </div>
            )}
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={replyTo ? "Votre réponse..." : "Partagez votre méthode..."}
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handlePost()}
                />
                <button 
                    onClick={handlePost} 
                    disabled={isPosting || !inputText.trim()}
                    className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white disabled:opacity-50 transition-colors"
                >
                    {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
            </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {loading ? (
                <div className="flex justify-center py-4"><Loader2 size={24} className="animate-spin text-gray-600" /></div>
            ) : commentTree.length === 0 ? (
                <div className="text-center py-8 text-gray-600 text-xs">
                    <MessageCircle size={24} className="mx-auto mb-2 opacity-50" />
                    <p>Soyez le premier à commenter !</p>
                </div>
            ) : (
                commentTree.map(c => (
                    <CommentItem 
                        key={c.id} 
                        comment={c} 
                        depth={0} 
                        onReply={(id, author) => setReplyTo({ id, author })}
                        onLike={handleLike}
                    />
                ))
            )}
        </div>
    </div>
  );
};
