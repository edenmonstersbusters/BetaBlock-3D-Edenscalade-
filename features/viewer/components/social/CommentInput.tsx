
import React from 'react';
import { CornerDownRight, Loader2, Send } from 'lucide-react';

interface CommentInputProps {
    inputText: string;
    setInputText: (text: string) => void;
    onPost: () => void;
    isPosting: boolean;
    replyTo: { id: string; author: string } | null;
    onCancelReply: () => void;
}

export const CommentInput: React.FC<CommentInputProps> = ({ 
    inputText, setInputText, onPost, isPosting, replyTo, onCancelReply 
}) => {
    return (
        <div className="p-3 bg-gray-800/50 rounded-xl mb-4 border border-gray-700">
            {replyTo && (
                <div className="flex items-center justify-between text-xs text-blue-400 mb-2 bg-blue-500/10 px-2 py-1 rounded">
                    <span className="flex items-center gap-1"><CornerDownRight size={12}/> Réponse à {replyTo.author}</span>
                    <button onClick={onCancelReply} className="hover:text-white font-bold">X</button>
                </div>
            )}
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={replyTo ? "Votre réponse..." : "Partagez votre méthode..."}
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && onPost()}
                />
                <button 
                    onClick={onPost} 
                    disabled={isPosting || !inputText.trim()}
                    className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white disabled:opacity-50 transition-colors"
                >
                    {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
            </div>
        </div>
    );
};
