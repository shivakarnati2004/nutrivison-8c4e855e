import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReelCard } from "./ReelCard";
import { UploadReel } from "./UploadReel";
import { Button } from "@/components/ui/button";
import { Plus, Play, Bookmark } from "lucide-react";

interface ReelsTabProps {
  userId: string;
}

export const ReelsTab = ({ userId }: ReelsTabProps) => {
  const [reels, setReels] = useState<any[]>([]);
  const [savedReels, setSavedReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"foryou" | "saved">("foryou");
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reels")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const userIds = [...new Set(data?.map((r: any) => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);
      const reelIds = data?.map((r: any) => r.id) || [];

      const [likesRes, commentsRes, savedRes] = await Promise.all([
        supabase.from("reel_likes").select("reel_id, user_id").in("reel_id", reelIds),
        supabase.from("reel_comments").select("reel_id, id").in("reel_id", reelIds),
        supabase.from("saved_reels").select("reel_id").eq("user_id", userId).in("reel_id", reelIds),
      ]);

      const savedSet = new Set(savedRes.data?.map((s: any) => s.reel_id) || []);

      const enriched = data?.map((reel: any) => ({
        ...reel,
        author: profileMap.get(reel.user_id) || { name: "Unknown", profile_photo_url: null },
        likesCount: likesRes.data?.filter((l: any) => l.reel_id === reel.id).length || 0,
        commentsCount: commentsRes.data?.filter((c: any) => c.reel_id === reel.id).length || 0,
        isLiked: likesRes.data?.some((l: any) => l.reel_id === reel.id && l.user_id === userId),
        isSaved: savedSet.has(reel.id),
      }));

      setReels(enriched || []);
    } catch (err) {
      console.error("Error fetching reels:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedReels = async () => {
    try {
      const { data: savedData } = await supabase
        .from("saved_reels")
        .select("reel_id")
        .eq("user_id", userId);

      if (!savedData?.length) { setSavedReels([]); return; }

      const reelIds = savedData.map((s: any) => s.reel_id);
      const { data } = await supabase.from("reels").select("*").in("id", reelIds);

      const userIds = [...new Set(data?.map((r: any) => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      setSavedReels(data?.map((reel: any) => ({
        ...reel,
        author: profileMap.get(reel.user_id) || { name: "Unknown", profile_photo_url: null },
      })) || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReels();
    fetchSavedReels();
    const channel = supabase
      .channel("reels-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reels" }, () => fetchReels())
      .on("postgres_changes", { event: "*", schema: "public", table: "reel_likes" }, () => fetchReels())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const newIndex = Math.round(container.scrollTop / container.clientHeight);
    if (newIndex !== currentIndex) setCurrentIndex(newIndex);
  }, [currentIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-3">
        <Button
          variant={activeTab === "foryou" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("foryou")}
          className="gap-1.5"
        >
          <Play className="h-3.5 w-3.5" /> For You
        </Button>
        <Button
          variant={activeTab === "saved" ? "default" : "outline"}
          size="sm"
          onClick={() => { setActiveTab("saved"); fetchSavedReels(); }}
          className="gap-1.5"
        >
          <Bookmark className="h-3.5 w-3.5" /> Saved
        </Button>
        <Button
          onClick={() => setShowUpload(true)}
          size="sm"
          variant="outline"
          className="ml-auto gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Upload
        </Button>
      </div>

      {activeTab === "foryou" ? (
        reels.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-2">No reels yet</p>
            <p className="text-muted-foreground text-sm mb-4">Be the first to share a reel!</p>
            <Button onClick={() => setShowUpload(true)}>
              <Plus className="h-4 w-4 mr-2" /> Upload Reel
            </Button>
          </div>
        ) : (
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="h-[calc(100vh-260px)] overflow-y-scroll snap-y snap-mandatory scrollbar-hide rounded-xl"
          >
            {reels.map((reel, index) => (
              <div key={reel.id} className="snap-start h-[calc(100vh-260px)]">
                <ReelCard reel={reel} userId={userId} isActive={index === currentIndex} onUpdate={fetchReels} />
              </div>
            ))}
          </div>
        )
      ) : (
        savedReels.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No saved reels yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
            {savedReels.map((reel: any) => (
              <div key={reel.id} className="relative aspect-[9/16] bg-black cursor-pointer group" onClick={() => { setActiveTab("foryou"); }}>
                <video src={reel.video_url} className="w-full h-full object-cover" muted preload="metadata" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-end p-1.5">
                  <span className="text-white text-[10px] font-medium truncate">{reel.author?.name}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showUpload && (
        <UploadReel userId={userId} onClose={() => setShowUpload(false)} onUploaded={() => { setShowUpload(false); fetchReels(); }} />
      )}
    </div>
  );
};