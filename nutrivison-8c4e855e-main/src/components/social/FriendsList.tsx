import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, UserCheck, Clock, Users, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserProfileView } from "./UserProfileView";

interface FriendsListProps {
  userId: string;
}

export const FriendsList = ({ userId }: FriendsListProps) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("friends");
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
  }, [userId]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const { data: friendships, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (error) throw error;

      const friendIds = friendships?.map(f => 
        f.requester_id === userId ? f.addressee_id : f.requester_id
      ) || [];

      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, name, profile_photo_url, city, country, goal")
          .in("user_id", friendIds);

        setFriends(profiles || []);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { data: requests, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("addressee_id", userId)
        .eq("status", "pending");

      if (error) throw error;

      if (requests && requests.length > 0) {
        const requesterIds = requests.map(r => r.requester_id);
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, name, profile_photo_url")
          .in("user_id", requesterIds);

        const enrichedRequests = requests.map(req => ({
          ...req,
          requester: profiles?.find(p => p.user_id === req.requester_id),
        }));

        setPendingRequests(enrichedRequests);
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url, city, country")
        .ilike("name", `%${searchQuery}%`)
        .neq("user_id", userId)
        .limit(20);

      if (error) throw error;

      const userIds = data?.map(u => u.user_id) || [];
      const { data: friendships } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      const enrichedResults = data?.map(user => {
        const friendship = friendships?.find(f => 
          (f.requester_id === userId && f.addressee_id === user.user_id) ||
          (f.addressee_id === userId && f.requester_id === user.user_id)
        );
        return {
          ...user,
          friendshipStatus: friendship?.status || null,
        };
      });

      setSearchResults(enrichedResults || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const sendFriendRequest = async (addresseeId: string) => {
    try {
      const { error } = await supabase.from("friendships").insert({
        requester_id: userId,
        addressee_id: addresseeId,
        status: "pending",
      });

      if (error) throw error;

      toast({ title: "Friend request sent!" });
      searchUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (error) throw error;

      toast({ title: "Friend request accepted!" });
      fetchFriends();
      fetchPendingRequests();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const rejectRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;

      toast({ title: "Friend request declined" });
      fetchPendingRequests();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const removeFriend = async (friendUserId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendUserId}),and(requester_id.eq.${friendUserId},addressee_id.eq.${userId})`);

      if (error) throw error;

      toast({ title: "Friend removed" });
      fetchFriends();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="animate-pulse-soft">
                {pendingRequests.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchQuery && (
            <div className="space-y-2 animate-fade-in">
              <h4 className="text-sm font-medium text-muted-foreground">Search Results</h4>
              {searching ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((user, index) => (
                    <div 
                      key={user.user_id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => setSelectedProfile(user.user_id)}
                      >
                        <Avatar className="h-14 w-14 ring-2 ring-primary/10">
                          <AvatarImage src={user.profile_photo_url} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg">
                            {user.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold hover:underline">{user.name}</p>
                          {(user.city || user.country) && (
                            <p className="text-xs text-muted-foreground">
                              {[user.city, user.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProfile(user.user_id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {user.friendshipStatus === "accepted" ? (
                          <Badge variant="secondary" className="gap-1">
                            <UserCheck className="h-3 w-3" />
                            Friends
                          </Badge>
                        ) : user.friendshipStatus === "pending" ? (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        ) : (
                          <Button size="sm" onClick={() => sendFriendRequest(user.user_id)}>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!searchQuery && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="friends">
                  My Friends ({friends.length})
                </TabsTrigger>
                <TabsTrigger value="requests" className="relative">
                  Requests
                  {pendingRequests.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs animate-pop-in">
                      {pendingRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="mt-4 space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground">No friends yet</p>
                    <p className="text-sm text-muted-foreground">Search for users to add friends!</p>
                  </div>
                ) : (
                  friends.map((friend, index) => (
                    <div 
                      key={friend.user_id} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => setSelectedProfile(friend.user_id)}
                      >
                        <Avatar className="h-14 w-14 ring-2 ring-primary/10">
                          <AvatarImage src={friend.profile_photo_url} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg">
                            {friend.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold hover:underline">{friend.name}</p>
                          {friend.goal && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {friend.goal.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProfile(friend.user_id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFriend(friend.user_id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="requests" className="mt-4 space-y-2">
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground">No pending requests</p>
                  </div>
                ) : (
                  pendingRequests.map((request, index) => (
                    <div 
                      key={request.id} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg animate-slide-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => setSelectedProfile(request.requester?.user_id)}
                      >
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={request.requester?.profile_photo_url} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg">
                            {request.requester?.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-semibold hover:underline">{request.requester?.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => acceptRequest(request.id)}>
                          Accept
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => rejectRequest(request.id)}>
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {selectedProfile && (
        <UserProfileView
          userId={selectedProfile}
          currentUserId={userId}
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </>
  );
};
