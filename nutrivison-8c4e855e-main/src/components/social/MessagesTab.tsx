import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageCircle, Search, ChevronDown, ChevronUp, UserPlus, Users } from "lucide-react";
import { ChatWindow } from "./ChatWindow";

interface MessagesTabProps {
  userId: string;
}

interface Conversation {
  friendId: string;
  friendName: string;
  friendPhoto: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Friend {
  user_id: string;
  name: string;
  profile_photo_url: string | null;
}

export const MessagesTab = ({ userId }: MessagesTabProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedChatProfile, setSelectedChatProfile] = useState<any>(null);
  const [friendsExpanded, setFriendsExpanded] = useState(true);

  useEffect(() => {
    fetchConversations();
    fetchFriends();

    // Subscribe to new messages
    const channel = supabase
      .channel("messages-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchFriends = async () => {
    try {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      const friendIds =
        friendships?.map((f) =>
          f.requester_id === userId ? f.addressee_id : f.requester_id
        ) || [];

      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", friendIds);

      setFriends(profiles || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Get all messages involving this user
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner
      const conversationMap = new Map<string, any[]>();
      messages?.forEach((msg) => {
        const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, []);
        }
        conversationMap.get(partnerId)!.push(msg);
      });

      // Get profiles for all conversation partners
      const partnerIds = Array.from(conversationMap.keys());
      if (partnerIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", partnerIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Build conversation list
      const convList: Conversation[] = [];
      conversationMap.forEach((msgs, partnerId) => {
        const profile = profileMap.get(partnerId);
        const lastMsg = msgs[0];
        const unreadCount = msgs.filter(
          (m) => m.receiver_id === userId && !m.read
        ).length;

        convList.push({
          friendId: partnerId,
          friendName: profile?.name || "Unknown",
          friendPhoto: profile?.profile_photo_url || null,
          lastMessage: lastMsg.message_type === "sticker" ? "🎭 Sticker" : lastMsg.message_type === "gif" ? "🎬 GIF" : lastMsg.content,
          lastMessageTime: lastMsg.created_at,
          unreadCount,
        });
      });

      // Sort by last message time
      convList.sort(
        (a, b) =>
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime()
      );

      setConversations(convList);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (friendId: string, friendName: string, friendPhoto: string | null) => {
    setSelectedChat(friendId);
    setSelectedChatProfile({
      user_id: friendId,
      name: friendName,
      profile_photo_url: friendPhoto,
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.friendName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friends.filter(
    (friend) =>
      friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !conversations.some((conv) => conv.friendId === friend.user_id)
  );

  if (selectedChat && selectedChatProfile) {
    return (
      <ChatWindow
        userId={userId}
        friendId={selectedChat}
        friendProfile={selectedChatProfile}
        onBack={() => {
          setSelectedChat(null);
          setSelectedChatProfile(null);
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations or friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Start New Chat - Friends List */}
        {friends.length > 0 && (
          <Collapsible open={friendsExpanded} onOpenChange={setFriendsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-auto py-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <UserPlus className="h-4 w-4" />
                  Start New Chat ({filteredFriends.length} friends)
                </span>
                {friendsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {filteredFriends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  All friends have conversations
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredFriends.map((friend) => (
                    <Button
                      key={friend.user_id}
                      variant="outline"
                      size="sm"
                      className="gap-2 h-auto py-1.5"
                      onClick={() => openChat(friend.user_id, friend.name || "Unknown", friend.profile_photo_url)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={friend.profile_photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {friend.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[100px]">{friend.name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : filteredConversations.length === 0 && friends.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add friends to start chatting!
            </p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground">
              Click on a friend above to start chatting!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conv) => (
              <div
                key={conv.friendId}
                onClick={() => openChat(conv.friendId, conv.friendName, conv.friendPhoto)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-200 animate-fade-in"
              >
                <Avatar className="h-14 w-14">
                  <AvatarImage src={conv.friendPhoto || undefined} />
                  <AvatarFallback className="text-lg">
                    {conv.friendName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold truncate">{conv.friendName}</h4>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(conv.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <Badge className="animate-pop-in">{conv.unreadCount}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
