import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rss, Users, UserPlus, MessageCircle, Film } from "lucide-react";
import { PostCard } from "./PostCard";
import { CreatePost } from "./CreatePost";
import { FriendsList } from "./FriendsList";
import { GroupsList } from "./GroupsList";
import { MessagesTab } from "./MessagesTab";
import { StoriesBar } from "./StoriesBar";
import { ReelsTab } from "./ReelsTab";

interface SocialFeedProps {
  userId: string;
  profile: any;
}

export const SocialFeed = ({ userId, profile }: SocialFeedProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("feed");
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const postIds = postsData?.map(p => p.id) || [];
      const { data: reactions } = await supabase
        .from("reactions")
        .select("post_id, reaction_type, user_id")
        .in("post_id", postIds);

      const { data: comments } = await supabase
        .from("comments")
        .select("post_id, id")
        .in("post_id", postIds);

      const enrichedPosts = postsData?.map(post => ({
        ...post,
        author: profileMap.get(post.user_id) || { name: "Unknown", profile_photo_url: null },
        reactions: reactions?.filter(r => r.post_id === post.id) || [],
        commentsCount: comments?.filter(c => c.post_id === post.id).length || 0,
        userReaction: reactions?.find(r => r.post_id === post.id && r.user_id === userId)?.reaction_type,
      })) || [];

      setPosts(enrichedPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadMessages = async () => {
    try {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("read", false);

      setUnreadMessages(count || 0);
    } catch (error) {
      console.error("Error fetching unread messages:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchUnreadMessages();

    const channel = supabase
      .channel("social-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchPosts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () => {
        fetchPosts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchUnreadMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">Social</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="feed" className="gap-1.5">
            <Rss className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Feed</span>
          </TabsTrigger>
          <TabsTrigger value="reels" className="gap-1.5">
            <Film className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Reels</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5 relative">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Chat</span>
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center animate-pop-in">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="friends" className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Friends</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Groups</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-4 space-y-4">
          {/* Stories bar */}
          <StoriesBar userId={userId} profile={profile} />

          <CreatePost userId={userId} profile={profile} onPostCreated={fetchPosts} />

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 bg-card rounded-lg border">
              <Rss className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No posts yet.</p>
              <p className="text-sm text-muted-foreground">Add friends to see their posts or create your own!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userId={userId}
                onUpdate={fetchPosts}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="reels" className="mt-4">
          <ReelsTab userId={userId} />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <MessagesTab userId={userId} />
        </TabsContent>

        <TabsContent value="friends" className="mt-4">
          <FriendsList userId={userId} />
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <GroupsList userId={userId} profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
