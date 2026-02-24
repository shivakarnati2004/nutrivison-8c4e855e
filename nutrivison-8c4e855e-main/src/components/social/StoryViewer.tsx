import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Music, Eye, Send, Smile, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StickerGifPicker } from "./StickerGifPicker";

interface StoryViewerProps {
  group: {
    user_id: string;
    user_name: string;
    user_photo: string | null;
    stories: any[];
  };
  userId: string;
  onClose: () => void;
}

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "👏", "🔥", "🎉", "💪"];

export const StoryViewer = ({ group, userId, onClose }: StoryViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const story = group.stories[currentIndex];
  const isOwner = group.user_id === userId;
  const duration = story?.media_type === "video" ? 15000 : 5000;

  const markViewed = useCallback(async () => {
    if (!story || group.user_id === userId) return;
    try {
      await supabase.from("story_views").upsert({
        story_id: story.id,
        viewer_id: userId,
      } as any, { onConflict: "story_id,viewer_id" });
    } catch {}
  }, [story?.id, userId]);

  const fetchViewCount = useCallback(async () => {
    if (!story) return;
    const { count } = await supabase
      .from("story_views")
      .select("*", { count: "exact", head: true })
      .eq("story_id", story.id);
    setViewCount(count || 0);
  }, [story?.id]);

  useEffect(() => {
    markViewed();
    if (isOwner) fetchViewCount();
  }, [currentIndex, markViewed, fetchViewCount, isOwner]);

  useEffect(() => {
    if (videoRef.current && story?.media_type === "video") {
      const video = videoRef.current;
      video.muted = false;
      video.play().then(() => setIsMuted(false)).catch(() => {
        video.muted = true;
        video.play().catch(() => {});
        setIsMuted(true);
      });
    }
  }, [currentIndex, story?.media_type]);

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < group.stories.length - 1) {
            setCurrentIndex((i) => i + 1);
          } else {
            onClose();
          }
          return 0;
        }
        return prev + (100 / (duration / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [currentIndex, duration, group.stories.length, onClose]);

  const goNext = () => {
    if (currentIndex < group.stories.length - 1) setCurrentIndex((i) => i + 1);
    else onClose();
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const sendReply = async (text: string) => {
    if (!text.trim()) return;
    try {
      await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: group.user_id,
        content: `Replied to your story: ${text}`,
        message_type: "story_reply",
      } as any);
      setReplyText("");
      toast({ title: "Reply sent!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleReaction = (emoji: string) => sendReply(emoji);

  const fetchViewers = async () => {
    const { data } = await supabase
      .from("story_views")
      .select("viewer_id, viewed_at")
      .eq("story_id", story.id);
    if (data?.length) {
      const ids = data.map((v: any) => v.viewer_id);
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", ids);
      setViewers(profiles || []);
    }
    setShowViewers(true);
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
    return `${h}h ago`;
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {group.stories.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-75"
              style={{ width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-white/50">
            <AvatarImage src={group.user_photo || undefined} className="object-cover" />
            <AvatarFallback className="text-sm">{group.user_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-semibold text-sm">{group.user_name}</p>
            <p className="text-white/60 text-xs">{formatTime(story.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {story.media_type === "video" && (
            <button onClick={toggleMute} className="text-white p-2">
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}
          <button onClick={onClose} className="text-white p-2">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Media */}
      <div className="w-full h-full flex items-center justify-center">
        {story.media_type === "video" ? (
          <video
            ref={videoRef}
            key={story.id}
            src={story.media_url}
            className="max-w-full max-h-full object-contain"
            autoPlay
            playsInline
          />
        ) : (
          <img key={story.id} src={story.media_url} className="max-w-full max-h-full object-contain" alt="Story" />
        )}
      </div>

      {/* Tap zones */}
      <div className="absolute inset-0 flex z-[5]" style={{ top: "80px", bottom: "140px" }}>
        <div className="w-1/3 cursor-pointer" onClick={goPrev} />
        <div className="w-1/3" onClick={togglePlay} />
        <div className="w-1/3 cursor-pointer" onClick={goNext} />
      </div>

      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-4 px-4">
        {story.music_name && (
          <div className="flex items-center gap-2 text-white/80 text-xs mb-2">
            <Music className="h-3 w-3" />
            <span className="animate-pulse">{story.music_name}</span>
          </div>
        )}
        {story.caption && <p className="text-white text-sm mb-3">{story.caption}</p>}

        {isOwner ? (
          <button onClick={fetchViewers} className="flex items-center gap-2 text-white/70 text-xs">
            <Eye className="h-4 w-4" /> {viewCount} views
          </button>
        ) : (
          <div className="space-y-2">
            {/* Quick reactions */}
            <div className="flex gap-2 justify-center">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-2xl hover:scale-125 transition-transform active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {/* Reply input */}
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-white/70 hover:text-white p-1.5">
                    <Smile className="h-5 w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" side="top">
                  <StickerGifPicker onSelect={(val, _type) => setReplyText((prev) => prev + val)} onClose={() => {}} />
                </PopoverContent>
              </Popover>
              <Input
                placeholder="Reply to story..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendReply(replyText)}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <Button size="icon" variant="ghost" onClick={() => sendReply(replyText)} disabled={!replyText.trim()} className="text-white">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Viewers list */}
      {showViewers && (
        <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl p-4 z-20 max-h-[50vh] overflow-y-auto animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Viewers ({viewCount})</h3>
            <button onClick={() => setShowViewers(false)}><X className="h-5 w-5" /></button>
          </div>
          {viewers.map((v: any) => (
            <div key={v.user_id} className="flex items-center gap-3 py-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={v.profile_photo_url} className="object-cover" />
                <AvatarFallback>{v.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{v.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function togglePlay() {
  // placeholder for center tap - could pause/resume story timer
}