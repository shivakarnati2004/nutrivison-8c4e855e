import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Bookmark, Music, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReelComments } from "./ReelComments";

interface ReelCardProps {
  reel: any;
  userId: string;
  isActive: boolean;
  onUpdate: () => void;
}

export const ReelCard = ({ reel, userId, isActive, onUpdate }: ReelCardProps) => {
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      const video = videoRef.current;
      video.muted = false;
      video.play().then(() => {
        setIsPlaying(true);
        setIsMuted(false);
      }).catch(() => {
        video.muted = true;
        video.play().catch(() => {});
        setIsPlaying(true);
        setIsMuted(true);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleDoubleTap = async () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!reel.isLiked) {
        await handleLike();
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
    lastTapRef.current = now;
  };

  const handleLike = async () => {
    try {
      if (reel.isLiked) {
        await supabase.from("reel_likes").delete().eq("reel_id", reel.id).eq("user_id", userId);
      } else {
        await supabase.from("reel_likes").insert({ reel_id: reel.id, user_id: userId } as any);
      }
      onUpdate();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleSave = async () => {
    try {
      if (reel.isSaved) {
        await supabase.from("saved_reels").delete().eq("reel_id", reel.id).eq("user_id", userId);
        toast({ title: "Removed from saved" });
      } else {
        await supabase.from("saved_reels").insert({ reel_id: reel.id, user_id: userId } as any);
        toast({ title: "Saved!" });
      }
      onUpdate();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied!" });
    } catch {
      toast({ title: "Link copied!" });
    }
  };

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        src={reel.video_url}
        className="w-full h-full object-cover cursor-pointer"
        loop
        playsInline
        onClick={(e) => {
          handleDoubleTap();
          e.stopPropagation();
        }}
      />

      {/* Mute/Unmute toggle */}
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 z-[5] p-2 rounded-full bg-black/40 backdrop-blur-sm text-white"
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {/* Play/Pause overlay */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center z-[2]"
        >
          <Play className="h-16 w-16 text-white/70" />
        </button>
      )}

      {/* Double tap heart */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center z-[3] pointer-events-none">
          <Heart className="h-24 w-24 text-red-500 fill-red-500 animate-pop-in" />
        </div>
      )}

      {/* Right side actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-[4]">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={`p-2 rounded-full ${reel.isLiked ? "text-red-500" : "text-white"}`}>
            <Heart className={`h-7 w-7 ${reel.isLiked ? "fill-red-500" : ""}`} />
          </div>
          <span className="text-white text-xs font-semibold">{reel.likesCount}</span>
        </button>

        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <div className="p-2 text-white">
            <MessageCircle className="h-7 w-7" />
          </div>
          <span className="text-white text-xs font-semibold">{reel.commentsCount}</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="p-2 text-white">
            <Share2 className="h-7 w-7" />
          </div>
          <span className="text-white text-xs font-semibold">Share</span>
        </button>

        <button onClick={handleSave} className="flex flex-col items-center gap-1">
          <div className={`p-2 ${reel.isSaved ? "text-yellow-400" : "text-white"}`}>
            <Bookmark className={`h-7 w-7 ${reel.isSaved ? "fill-yellow-400" : ""}`} />
          </div>
          <span className="text-white text-xs font-semibold">Save</span>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-4 right-16 z-[4]">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-9 w-9 ring-2 ring-white/50">
            <AvatarImage src={reel.author?.profile_photo_url} className="object-cover" />
            <AvatarFallback className="text-xs">{reel.author?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-white font-semibold text-sm">{reel.author?.name}</span>
        </div>
        {reel.caption && (
          <p className="text-white text-sm line-clamp-2 mb-1">{reel.caption}</p>
        )}
        {reel.music_name && (
          <div className="flex items-center gap-1 text-white/70 text-xs">
            <Music className="h-3 w-3" />
            <span>{reel.music_name}</span>
          </div>
        )}
      </div>

      {showComments && (
        <ReelComments
          reelId={reel.id}
          userId={userId}
          onClose={() => { setShowComments(false); onUpdate(); }}
        />
      )}
    </div>
  );
};