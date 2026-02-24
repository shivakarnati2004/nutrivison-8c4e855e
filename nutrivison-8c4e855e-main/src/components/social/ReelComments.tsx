import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Send, Trash2, Smile } from "lucide-react";
import { StickerGifPicker } from "./StickerGifPicker";

interface ReelCommentsProps {
  reelId: string;
  userId: string;
  onClose: () => void;
}

export const ReelComments = ({ reelId, userId, onClose }: ReelCommentsProps) => {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reel_comments")
        .select("*")
        .eq("reel_id", reelId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const userIds = [...new Set(data?.map((c: any) => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      setComments(
        data?.map((c: any) => ({
          ...c,
          author: profileMap.get(c.user_id) || { name: "Unknown", profile_photo_url: null },
        })) || []
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComments(); }, [reelId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      await supabase.from("reel_comments").insert({
        reel_id: reelId,
        user_id: userId,
        content: newComment.trim(),
      } as any);
      setNewComment("");
      fetchComments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("reel_comments").delete().eq("id", id);
    fetchComments();
  };

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl z-[10] animate-slide-up"
      style={{ maxHeight: "60vh" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Comments</h3>
        <button onClick={onClose}><X className="h-5 w-5" /></button>
      </div>

      <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: "calc(60vh - 120px)" }}>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 border-b-2 border-primary rounded-full"></div>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">No comments yet</p>
        ) : (
          comments.map((c: any) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={c.author?.profile_photo_url} className="object-cover" />
                <AvatarFallback className="text-xs">{c.author?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{c.author?.name}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(c.created_at)}</span>
                  {c.user_id === userId && (
                    <button onClick={() => handleDelete(c.id)} className="ml-auto opacity-50 hover:opacity-100">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm">{c.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 p-4 border-t items-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground p-1.5 flex-shrink-0">
              <Smile className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" side="top">
            <StickerGifPicker onSelect={(val, _type) => setNewComment((prev) => prev + val)} onClose={() => {}} />
          </PopoverContent>
        </Popover>
        <Input
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1"
        />
        <Button size="icon" onClick={handleSubmit} disabled={!newComment.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};