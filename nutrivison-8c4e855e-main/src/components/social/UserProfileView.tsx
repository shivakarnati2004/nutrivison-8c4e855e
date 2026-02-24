import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserCheck, Clock, MessageCircle, MapPin, Target, Activity, Calendar, X } from "lucide-react";
import { PostCard } from "./PostCard";

interface UserProfileViewProps {
  userId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartChat?: (userId: string) => void;
}

export const UserProfileView = ({ userId, currentUserId, isOpen, onClose, onStartChat }: UserProfileViewProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
    }
  }, [isOpen, userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Check friendship status
      const { data: friendship } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
        .maybeSingle();

      if (friendship) {
        const isRelevant = 
          (friendship.requester_id === userId && friendship.addressee_id === currentUserId) ||
          (friendship.requester_id === currentUserId && friendship.addressee_id === userId);
        
        if (isRelevant) {
          setFriendshipStatus(friendship.status);
          setFriendshipId(friendship.id);
        }
      }

      // Fetch posts if friends
      if (friendship?.status === "accepted" || userId === currentUserId) {
        const { data: postsData } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        // Enrich posts with reactions
        if (postsData && postsData.length > 0) {
          const postIds = postsData.map(p => p.id);
          const { data: reactions } = await supabase
            .from("reactions")
            .select("post_id, reaction_type, user_id")
            .in("post_id", postIds);

          const { data: comments } = await supabase
            .from("comments")
            .select("post_id, id")
            .in("post_id", postIds);

          const enrichedPosts = postsData.map(post => ({
            ...post,
            author: { name: profileData?.name, profile_photo_url: profileData?.profile_photo_url },
            reactions: reactions?.filter(r => r.post_id === post.id) || [],
            commentsCount: comments?.filter(c => c.post_id === post.id).length || 0,
            userReaction: reactions?.find(r => r.post_id === post.id && r.user_id === currentUserId)?.reaction_type,
          }));

          setPosts(enrichedPosts);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from("friendships").insert({
        requester_id: currentUserId,
        addressee_id: userId,
        status: "pending",
      });

      if (error) throw error;
      
      toast({ title: "Friend request sent!" });
      setFriendshipStatus("pending");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!friendshipId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (error) throw error;
      
      toast({ title: "Friend request accepted!" });
      setFriendshipStatus("accepted");
      fetchUserData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;
      
      toast({ title: "Friend removed" });
      setFriendshipStatus(null);
      setFriendshipId(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const renderFriendButton = () => {
    if (userId === currentUserId) return null;

    if (friendshipStatus === "accepted") {
      return (
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => onStartChat?.(userId)}>
            <MessageCircle className="h-4 w-4" />
            Message
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRemoveFriend} disabled={actionLoading}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (friendshipStatus === "pending") {
      return (
        <Button variant="secondary" disabled className="gap-2">
          <Clock className="h-4 w-4" />
          Pending
        </Button>
      );
    }

    return (
      <Button onClick={handleSendFriendRequest} disabled={actionLoading} className="gap-2">
        <UserPlus className="h-4 w-4" />
        Add Friend
      </Button>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">User Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b">
              <Avatar className="h-32 w-32 ring-4 ring-primary/20">
                <AvatarImage src={profile.profile_photo_url} />
                <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  {profile.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center sm:text-left space-y-3">
                <div>
                  <h2 className="text-2xl font-bold">{profile.name || "Anonymous"}</h2>
                  {(profile.city || profile.country) && (
                    <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      {[profile.city, profile.state, profile.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {profile.goal && (
                    <Badge variant="secondary" className="gap-1">
                      <Target className="h-3 w-3" />
                      {profile.goal.replace("_", " ")}
                    </Badge>
                  )}
                  {profile.activity_level && (
                    <Badge variant="outline" className="gap-1">
                      <Activity className="h-3 w-3" />
                      {profile.activity_level}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2">
                  {renderFriendButton()}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {profile.age && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{profile.age}</p>
                    <p className="text-xs text-muted-foreground">Years Old</p>
                  </CardContent>
                </Card>
              )}
              {profile.height && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{profile.height}</p>
                    <p className="text-xs text-muted-foreground">cm Height</p>
                  </CardContent>
                </Card>
              )}
              {profile.weight && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{profile.weight}</p>
                    <p className="text-xs text-muted-foreground">kg Weight</p>
                  </CardContent>
                </Card>
              )}
              {profile.daily_calories_target && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{profile.daily_calories_target}</p>
                    <p className="text-xs text-muted-foreground">Cal Target</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Member Since */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Member since {formatDate(profile.created_at)}
            </div>

            {/* Posts Tab */}
            {(friendshipStatus === "accepted" || userId === currentUserId) && (
              <Tabs defaultValue="posts" className="w-full">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                </TabsList>
                <TabsContent value="posts" className="space-y-4 mt-4">
                  {posts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No posts yet</p>
                  ) : (
                    posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        userId={currentUserId}
                        onUpdate={fetchUserData}
                      />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}

            {friendshipStatus !== "accepted" && userId !== currentUserId && (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Add {profile.name} as a friend to see their posts</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">User not found</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
