import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  Send,
  ThumbsUp,
  Laugh,
  Frown,
  PartyPopper,
  Share2,
  Bookmark,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserProfileView } from "./UserProfileView";

interface PostCardProps {
  post: any;
  userId: string;
  onUpdate: () => void;
}

const REACTIONS = [
  { type: "like", icon: ThumbsUp, label: "Like", color: "text-blue-500" },
  { type: "love", icon: Heart, label: "Love", color: "text-red-500" },
  { type: "celebrate", icon: PartyPopper, label: "Celebrate", color: "text-yellow-500" },
  { type: "laugh", icon: Laugh, label: "Haha", color: "text-amber-500" },
  { type: "sad", icon: Frown, label: "Sad", color: "text-purple-500" },
];

export const PostCard = ({ post, userId, onUpdate }: PostCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showProfileView, setShowProfileView] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkSaved = async () => {
      const { data } = await supabase
        .from("saved_posts")
        .select("id")
        .eq("user_id", userId)
        .eq("post_id", post.id)
        .maybeSingle();
      setIsSaved(!!data);
    };
    checkSaved();
  }, [post.id, userId]);

  const isOwner = post.user_id === userId;

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data: commentsData, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const userIds = [...new Set(commentsData?.map((c) => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      const enrichedComments = commentsData?.map((comment) => ({
        ...comment,
        author: profileMap.get(comment.user_id) || { name: "Unknown", profile_photo_url: null },
      }));

      setComments(enrichedComments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleReaction = async (reactionType: string) => {
    setReacting(true);
    try {
      if (post.userReaction === reactionType) {
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", userId);

        if (error) throw error;
      } else if (post.userReaction) {
        await supabase
          .from("reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", userId);

        const { error } = await supabase.from("reactions").insert({
          post_id: post.id,
          user_id: userId,
          reaction_type: reactionType,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.from("reactions").insert({
          post_id: post.id,
          user_id: userId,
          reaction_type: reactionType,
        });

        if (error) throw error;
      }

      setShowReactions(false);
      onUpdate();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setReacting(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;

    try {
      const { error } = await supabase.from("comments").insert({
        post_id: post.id,
        user_id: userId,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      onUpdate();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDeletePost = async () => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);

      if (error) throw error;

      toast({ title: "Post deleted" });
      onUpdate();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);

      if (error) throw error;

      fetchComments();
      onUpdate();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleSavePost = async () => {
    try {
      if (isSaved) {
        await supabase.from("saved_posts").delete().eq("user_id", userId).eq("post_id", post.id);
        setIsSaved(false);
        toast({ title: "Removed from saved" });
      } else {
        await supabase.from("saved_posts").insert({ user_id: userId, post_id: post.id } as any);
        setIsSaved(true);
        toast({ title: "Post saved!" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleSharePost = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied!" });
    } catch {
      toast({ title: "Link copied!" });
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getReactionCount = (type: string) => {
    return post.reactions?.filter((r: any) => r.reaction_type === type).length || 0;
  };

  const getTotalReactions = () => {
    return post.reactions?.length || 0;
  };

  const getUserReaction = () => {
    return REACTIONS.find((r) => r.type === post.userReaction);
  };

  const isVideoUrl = (url: string) => {
    return url?.match(/\.(mp4|webm|ogg|mov)$/i);
  };

  return (
    <>
      <Card className="animate-fade-in overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowProfileView(true)}
            >
              <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                <AvatarImage src={post.author?.profile_photo_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  {post.author?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold hover:underline">{post.author?.name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{formatTime(post.created_at)}</p>
              </div>
            </div>

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDeletePost} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-3 space-y-3">
          <p className="whitespace-pre-wrap text-base">{post.content}</p>

          {post.image_url && (
            <div className="rounded-xl overflow-hidden bg-muted">
              {isVideoUrl(post.image_url) ? (
                <video
                  src={post.image_url}
                  controls
                  className="w-full max-h-[500px] object-contain"
                  preload="metadata"
                />
              ) : (
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full max-h-[500px] object-contain"
                  loading="lazy"
                />
              )}
            </div>
          )}

          {getTotalReactions() > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
              <div className="flex -space-x-1">
                {REACTIONS.filter((r) => getReactionCount(r.type) > 0)
                  .slice(0, 3)
                  .map((reaction) => (
                    <span
                      key={reaction.type}
                      className={`flex items-center justify-center h-6 w-6 rounded-full bg-background border-2 border-card ${reaction.color}`}
                    >
                      <reaction.icon className="h-3.5 w-3.5" />
                    </span>
                  ))}
              </div>
              <span className="font-medium">{getTotalReactions()}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-3 pt-0">
          <div className="flex items-center justify-between w-full border-t pt-3">
            <div className="relative">
              {/* Backdrop when reactions are shown */}
              {showReactions && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowReactions(false)}
                />
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 reaction-btn min-h-[44px] ${getUserReaction()?.color || ""}`}
                onClick={() => setShowReactions(!showReactions)}
                disabled={reacting}
              >
                {(() => {
                  const reaction = getUserReaction();
                  if (reaction) {
                    const Icon = reaction.icon;
                    return (
                      <>
                        <Icon className="h-4 w-4 animate-pop-in" />
                        {reaction.label}
                      </>
                    );
                  }
                  return (
                    <>
                      <ThumbsUp className="h-4 w-4" />
                      Like
                    </>
                  );
                })()}
              </Button>

              {showReactions && (
                <div className="absolute bottom-full left-0 mb-2 flex gap-1 p-2 bg-card border rounded-full shadow-lg animate-pop-in z-50">
                  {REACTIONS.map((reaction, index) => (
                    <button
                      key={reaction.type}
                      onClick={() => handleReaction(reaction.type)}
                      className={`p-3 min-w-[48px] min-h-[48px] rounded-full hover:bg-muted hover:scale-125 transition-all duration-200 ${reaction.color} ${
                        post.userReaction === reaction.type ? "bg-muted scale-110" : ""
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                      title={reaction.label}
                    >
                      <reaction.icon className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="h-4 w-4" />
              {post.commentsCount > 0 ? `${post.commentsCount}` : ""}
            </Button>

            <Button variant="ghost" size="sm" className="gap-2" onClick={handleSharePost}>
              <Share2 className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" className="gap-2" onClick={handleSavePost}>
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          </div>

          {showComments && (
            <div className="w-full space-y-3 border-t pt-3 animate-slide-up">
              {loadingComments ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {comments.map((comment, index) => (
                    <div
                      key={comment.id}
                      className="flex gap-3 comment-item"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={comment.author?.profile_photo_url} />
                        <AvatarFallback className="text-xs bg-muted">
                          {comment.author?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{comment.author?.name}</p>
                          {comment.user_id === userId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-50 hover:opacity-100"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatTime(comment.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleComment()}
                  className="flex-1"
                />
                <Button size="icon" onClick={handleComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>

      <UserProfileView
        userId={post.user_id}
        currentUserId={userId}
        isOpen={showProfileView}
        onClose={() => setShowProfileView(false)}
      />
    </>
  );
};
