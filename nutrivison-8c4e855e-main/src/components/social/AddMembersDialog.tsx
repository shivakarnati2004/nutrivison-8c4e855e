import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddMembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  userId: string;
  onMembersAdded: () => void;
}

interface Friend {
  user_id: string;
  name: string;
  profile_photo_url: string | null;
}

export const AddMembersDialog = ({
  isOpen,
  onClose,
  groupId,
  userId,
  onMembersAdded,
}: AddMembersDialogProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [existingMembers, setExistingMembers] = useState<string[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, groupId, userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch existing group members
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);

      const memberIds = members?.map((m) => m.user_id) || [];
      setExistingMembers(memberIds);

      // Fetch user's friends
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      const friendIds =
        friendships?.map((f) =>
          f.requester_id === userId ? f.addressee_id : f.requester_id
        ) || [];

      // Filter out existing members
      const availableFriendIds = friendIds.filter((id) => !memberIds.includes(id));

      if (availableFriendIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Fetch friend profiles
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", availableFriendIds);

      setFriends(profiles || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedFriends.length === 0) return;

    setAdding(true);
    try {
      const membersToAdd = selectedFriends.map((friendId) => ({
        group_id: groupId,
        user_id: friendId,
        role: "member",
      }));

      const { error } = await supabase.from("group_members").insert(membersToAdd);

      if (error) throw error;

      toast({
        title: "Members added!",
        description: `${selectedFriends.length} friend(s) added to the group.`,
      });

      setSelectedFriends([]);
      onMembersAdded();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setAdding(false);
    }
  };

  const filteredFriends = friends.filter((friend) =>
    friend.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Members to Group
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-muted-foreground">
                {friends.length === 0
                  ? "All your friends are already in this group"
                  : "No friends match your search"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.user_id}
                    onClick={() => toggleFriend(friend.user_id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      selectedFriends.includes(friend.user_id)
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <Checkbox
                      checked={selectedFriends.includes(friend.user_id)}
                      onCheckedChange={() => toggleFriend(friend.user_id)}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={friend.profile_photo_url || undefined} />
                      <AvatarFallback>{friend.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium flex-1">{friend.name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {selectedFriends.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedFriends.length} selected
              </span>
              <Button onClick={handleAddMembers} disabled={adding}>
                {adding ? "Adding..." : `Add ${selectedFriends.length} Member(s)`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
