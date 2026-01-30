
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../../core/api';
import { auth } from '../../../core/auth';
import { Comment } from '../../../types';
import { MessageCircle, Loader2 } from 'lucide-react';
import { ActionWarning } from '../../../components/ui/ActionWarning';
import { CommentItem } from './social/CommentItem';
import { CommentInput } from './social/CommentInput';

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
    setComments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [wallId]);

  const commentTree = useMemo(() => {
    const map = new Map<string, Comment>();
    const roots: Comment[] = [];
    
    // GUARD : On filtre les commentaires nulls ou malformés dès le début
    const rawComments = JSON.parse(JSON.stringify(comments)).filter((c: any) => c && c.id);

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
          setComments(data || []);
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

        <CommentInput 
            inputText={inputText}
            setInputText={setInputText}
            onPost={handlePost}
            isPosting={isPosting}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
        />

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
