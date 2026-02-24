import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { CreateStory } from "./CreateStory";
import { StoryViewer } from "./StoryViewer";

interface StoriesBarProps {
  userId: string;
  profile: any;
}

interface StoryGroup {
  user_id: string;
  user_name: string;
  user_photo: string | null;
  stories: any[];
  hasUnviewed: boolean;
}

export const StoriesBar = ({ userId, profile }: StoriesBarProps) => {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);

  const fetchStories = async () => {
    try {
      const { data: stories, error } = await supabase
        .from("stories")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!stories?.length) { setStoryGroups([]); return; }

      const userIds = [...new Set(stories.map((s: any) => s.user_id))];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", userIds);

      const { data: views } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", userId);

      const viewedIds = new Set(views?.map((v: any) => v.story_id) || []);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      const groups: Record<string, StoryGroup> = {};
      stories.forEach((s: any) => {
        if (!groups[s.user_id]) {
          const p = profileMap.get(s.user_id);
          groups[s.user_id] = {
            user_id: s.user_id,
            user_name: p?.name || "Unknown",
            user_photo: p?.profile_photo_url || null,
            stories: [],
            hasUnviewed: false,
          };
        }
        groups[s.user_id].stories.push(s);
        if (!viewedIds.has(s.id)) groups[s.user_id].hasUnviewed = true;
      });

      // Put current user first
      const sorted = Object.values(groups).sort((a, b) => {
        if (a.user_id === userId) return -1;
        if (b.user_id === userId) return 1;
        return 0;
      });

      setStoryGroups(sorted);
    } catch (err) {
      console.error("Error fetching stories:", err);
    }
  };

  useEffect(() => {
    fetchStories();
    const channel = supabase
      .channel("stories-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => fetchStories())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const hasMyStory = storyGroups.some((g) => g.user_id === userId);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
        {/* Add story button */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="relative">
            <Avatar className="h-16 w-16 ring-2 ring-muted">
              <AvatarImage src={profile?.profile_photo_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg">
                {profile?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center border-2 border-background">
              <Plus className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
          <span className="text-xs text-muted-foreground w-16 text-center truncate">Your Story</span>
        </button>

        {/* Story circles */}
        {storyGroups.filter(g => g.user_id !== userId || g.stories.length > 0).map((group) => (
          <button
            key={group.user_id}
            onClick={() => setViewingGroup(group)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <Avatar className={`h-16 w-16 ring-[3px] ${
              group.hasUnviewed
                ? "ring-primary"
                : "ring-muted-foreground/30"
            }`}>
              <AvatarImage src={group.user_photo || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg">
                {group.user_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground w-16 text-center truncate">
              {group.user_id === userId ? "Your Story" : group.user_name}
            </span>
          </button>
        ))}
      </div>

      {showCreate && (
        <CreateStory
          userId={userId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchStories(); }}
        />
      )}

      {viewingGroup && (
        <StoryViewer
          group={viewingGroup}
          userId={userId}
          onClose={() => { setViewingGroup(null); fetchStories(); }}
        />
      )}
    </>
  );
};
