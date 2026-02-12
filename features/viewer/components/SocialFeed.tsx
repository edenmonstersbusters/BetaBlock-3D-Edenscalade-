
import React, { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { ActionWarning } from '../../../components/ui/ActionWarning';
import { CommentItem } from './social/CommentItem';
import { CommentInput } from './social/CommentInput';
import { useSocialLogic } from '../hooks/useSocialLogic';

interface SocialFeedProps {
  wallId: string;
  onRequestAuth: () => void;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ wallId, onRequestAuth }) => {
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const { comments, loading, handlePost, handleLike, warning, setWarning } = useSocialLogic(wallId, onRequestAuth);

  const onPostClick = async () => {
      if (!inputText.trim()) return;
      setIsPosting(true);
      const res = await handlePost(inputText, replyTo?.id || null);
      if (!res.error) {
          setInputText('');
          setReplyTo(null);
      }
      setIsPosting(false);
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
            onPost={onPostClick}
            isPosting={isPosting}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
        />

        <div className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
            {loading ? (
                <div className="flex justify-center py-4"><Loader2 size={24} className="animate-spin text-gray-600" /></div>
            ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-600 text-xs">
                    <MessageCircle size={24} className="mx-auto mb-2 opacity-50" />
                    <p>Soyez le premier à commenter !</p>
                </div>
            ) : (
                comments.map(c => (
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
