
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../../core/api';
import { auth } from '../../../core/auth';
import { Comment } from '../../../types';

export const useSocialLogic = (wallId: string, onRequestAuth: () => void) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [warning, setWarning] = useState<{ x: number, y: number, message: string } | null>(null);

    const fetchComments = async () => {
        if (!wallId) return; 
        const user = await auth.getUser();
        setCurrentUser(user);
        const data = await api.getComments(wallId, user?.id);
        setComments(data || []);
        setLoading(false);
    };

    useEffect(() => {
        setComments([]);
        setLoading(true);
        if (wallId) fetchComments();
        
        const { data: { subscription } } = auth.onAuthStateChange(async (user) => {
            setCurrentUser(user);
            if (wallId) {
                const data = await api.getComments(wallId, user?.id);
                setComments(data || []);
            }
        });
        return () => subscription.unsubscribe();
    }, [wallId]);

    const commentTree = useMemo(() => {
        const map = new Map<string, Comment>();
        const roots: Comment[] = [];
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

    const handlePost = async (text: string, replyToId: string | null) => {
        if (!currentUser) {
            onRequestAuth();
            return { error: true };
        }

        const authorName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || "Anonyme";
        const avatarUrl = currentUser.user_metadata?.avatar_url;
        
        const { error } = await api.postComment(wallId, currentUser.id, authorName, text, replyToId, avatarUrl);
        
        if (error) {
            setWarning({ x: window.innerWidth / 2, y: window.innerHeight / 2, message: "Erreur lors de l'envoi." });
            return { error: true };
        }
        
        await fetchComments();
        return { error: false };
    };

    const handleLike = async (commentId: string, authorId: string, e: React.MouseEvent) => {
        if (!currentUser) {
            onRequestAuth();
            return;
        }

        // Optimistic update
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                const newLiked = !c.user_has_liked;
                return { ...c, user_has_liked: newLiked, likes_count: (c.likes_count || 0) + (newLiked ? 1 : -1) };
            }
            return c;
        }));

        const { error } = await api.toggleCommentLike(commentId, currentUser.id);
        if (error) {
            setComments(prev => prev.map(c => {
                if (c.id === commentId) {
                    const revertedLiked = !c.user_has_liked;
                    return { ...c, user_has_liked: revertedLiked, likes_count: (c.likes_count || 0) + (revertedLiked ? 1 : -1) };
                }
                return c;
            }));
            setWarning({ x: e.clientX, y: e.clientY, message: "Erreur lors du like." });
        } else {
            // Sync
            const data = await api.getComments(wallId, currentUser.id);
            setComments(data || []);
        }
    };

    return { 
        comments: commentTree, 
        loading, 
        handlePost, 
        handleLike, 
        warning, 
        setWarning 
    };
};
