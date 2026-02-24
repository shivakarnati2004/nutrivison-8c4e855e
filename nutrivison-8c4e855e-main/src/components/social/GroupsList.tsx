import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Users, MessageSquare, Send, ArrowLeft, LogOut, UserPlus, Smile } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { AddMembersDialog } from "./AddMembersDialog";
import { StickerGifPicker } from "./StickerGifPicker";

interface GroupsListProps {
  userId: string;
  profile: any;
}

export const GroupsList = ({ userId, profile }: GroupsListProps) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupPosts, setGroupPosts] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addMembersDialogOpen, setAddMembersDialogOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const fetchGroups = async () => {
    setLoading(true);
    try {
      // Fetch groups the user is a member of
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);

      const memberGroupIds = memberships?.map(m => m.group_id) || [];

      // Fetch all groups
      const { data: groupsData } = await supabase
        .from("fitness_groups")
        .select("*")
        .order("created_at", { ascending: false });

      // Separate user's groups and other groups
      setGroups(groupsData?.filter(g => memberGroupIds.includes(g.id)) || []);
      setAllGroups(groupsData?.filter(g => !memberGroupIds.includes(g.id)) || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupPosts = async (groupId: string) => {
    try {
      const { data: posts } = await supabase
        .from("group_posts")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      const userIds = [...new Set(posts?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setGroupPosts(posts?.map(p => ({
        ...p,
        author: profileMap.get(p.user_id) || { name: "Unknown" },
      })) || []);
    } catch (error) {
      console.error("Error fetching group posts:", error);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id, role")
        .eq("group_id", groupId);

      const userIds = members?.map(m => m.user_id) || [];
      if (userIds.length === 0) {
        setGroupMembers([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setGroupMembers(members?.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) || { name: "Unknown" },
      })) || []);
    } catch (error) {
      console.error("Error fetching group members:", error);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [userId]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupPosts(selectedGroup.id);
      fetchGroupMembers(selectedGroup.id);

      const channel = supabase
        .channel(`group-${selectedGroup.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "group_posts", filter: `group_id=eq.${selectedGroup.id}` }, () => {
          fetchGroupPosts(selectedGroup.id);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedGroup]);

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Group name is required." });
      return;
    }

    setCreating(true);
    try {
      const { data: group, error } = await supabase
        .from("fitness_groups")
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin
      await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: userId,
        role: "admin",
      });

      toast({ title: "Group created!", description: `${group.name} is ready.` });
      setNewGroupName("");
      setNewGroupDescription("");
      setCreateDialogOpen(false);
      fetchGroups();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setCreating(false);
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: userId,
        role: "member",
      });

      if (error) throw error;

      toast({ title: "Joined group!" });
      fetchGroups();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const leaveGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) throw error;

      toast({ title: "Left group" });
      setSelectedGroup(null);
      fetchGroups();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const sendGroupPost = async (content?: string, messageType: string = "text") => {
    const postContent = content || newPost.trim();
    if (!postContent || !selectedGroup) return;

    setPosting(true);
    try {
      const { error } = await supabase.from("group_posts").insert({
        group_id: selectedGroup.id,
        user_id: userId,
        content: postContent,
        message_type: messageType,
      });

      if (error) throw error;

      setNewPost("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setPosting(false);
    }
  };

  const handleStickerGifSelect = (content: string, type: "sticker" | "gif") => {
    sendGroupPost(content, type);
    setPickerOpen(false);
  };

  const renderPostContent = (post: any) => {
    if (post.message_type === "sticker") {
      return <span className="text-4xl">{post.content}</span>;
    }
    if (post.message_type === "gif") {
      return (
        <img
          src={post.content}
          alt="GIF"
          className="rounded-lg max-w-[180px] max-h-[120px] object-cover"
          loading="lazy"
        />
      );
    }
    return <p className="text-sm">{post.content}</p>;
  };

  const isGroupAdmin = selectedGroup?.created_by === userId || 
    groupMembers.some(m => m.user_id === userId && m.role === "admin");

  if (selectedGroup) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedGroup(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h3 className="font-semibold">{selectedGroup.name}</h3>
            <p className="text-xs text-muted-foreground">
              {groupMembers.length} member{groupMembers.length !== 1 ? "s" : ""} • {selectedGroup.description || "No description"}
            </p>
          </div>
          {isGroupAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1"
              onClick={() => setAddMembersDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Add
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => leaveGroup(selectedGroup.id)} className="text-destructive gap-1">
            <LogOut className="h-4 w-4" />
            Leave
          </Button>
        </div>

        {/* Members preview */}
        <div className="flex items-center gap-1 px-1">
          <div className="flex -space-x-2">
            {groupMembers.slice(0, 5).map((member, idx) => (
              <Avatar key={member.user_id} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={member.profile?.profile_photo_url} />
                <AvatarFallback className="text-xs">{member.profile?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          {groupMembers.length > 5 && (
            <span className="text-xs text-muted-foreground ml-2">+{groupMembers.length - 5} more</span>
          )}
        </div>

        <Card className="flex-1">
          <CardContent className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
            {groupPosts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</p>
            ) : (
              groupPosts.map((post) => (
                <div
                  key={post.id}
                  className={`flex gap-2 ${post.user_id === userId ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={post.author?.profile_photo_url} />
                    <AvatarFallback className="text-xs">{post.author?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[70%] ${post.user_id === userId ? "text-right" : ""}`}>
                    <p className="text-xs text-muted-foreground mb-1">{post.author?.name}</p>
                    <div className={`rounded-lg p-3 ${
                      post.message_type === "sticker" || post.message_type === "gif"
                        ? "bg-transparent p-0"
                        : post.user_id === userId 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary"
                    }`}>
                      {renderPostContent(post)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2 items-center">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-auto p-0 border-0 bg-transparent shadow-none">
              <StickerGifPicker
                onSelect={handleStickerGifSelect}
                onClose={() => setPickerOpen(false)}
              />
            </PopoverContent>
          </Popover>
          <Input
            placeholder="Type a message..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendGroupPost()}
          />
          <Button onClick={() => sendGroupPost()} disabled={posting || !newPost.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <AddMembersDialog
          isOpen={addMembersDialogOpen}
          onClose={() => setAddMembersDialogOpen(false)}
          groupId={selectedGroup.id}
          userId={userId}
          onMembersAdded={() => fetchGroupMembers(selectedGroup.id)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Your Groups</h3>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Morning Runners"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What's this group about?"
                />
              </div>
              <Button onClick={createGroup} disabled={creating} className="w-full">
                {creating ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>You haven't joined any groups yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedGroup(group)}
            >
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{group.name}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{group.description || "No description"}</p>
                  </div>
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Discover groups */}
      {allGroups.length > 0 && (
        <>
          <h3 className="font-semibold pt-4">Discover Groups</h3>
          <div className="grid gap-3">
            {allGroups.map((group) => (
              <Card key={group.id}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{group.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{group.description || "No description"}</p>
                    </div>
                    <Button size="sm" onClick={() => joinGroup(group.id)}>
                      Join
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
