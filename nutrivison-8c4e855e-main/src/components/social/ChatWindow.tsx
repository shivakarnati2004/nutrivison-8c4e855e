import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Send, Smile } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StickerGifPicker } from "./StickerGifPicker";

interface ChatWindowProps {
  userId: string;
  friendId: string;
  friendProfile: {
    user_id: string;
    name: string;
    profile_photo_url: string | null;
  };
  onBack: () => void;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  message_type?: string;
}

export const ChatWindow = ({ userId, friendId, friendProfile, onBack }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    markMessagesAsRead();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${friendId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.receiver_id === userId) {
            setMessages((prev) => [...prev, newMsg]);
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, friendId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", friendId)
        .eq("receiver_id", userId)
        .eq("read", false);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async (content?: string, messageType: string = "text") => {
    const messageContent = content || newMessage.trim();
    if (!messageContent) return;

    setSending(true);
    try {
      const { data, error } = await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: friendId,
        content: messageContent,
        message_type: messageType,
      }).select().single();

      if (error) throw error;
      
      setMessages((prev) => [...prev, data]);
      setNewMessage("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send message",
      });
    } finally {
      setSending(false);
    }
  };

  const handleStickerGifSelect = (content: string, type: "sticker" | "gif") => {
    sendMessage(content, type);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.message_type === "sticker") {
      return <span className="text-5xl">{msg.content}</span>;
    }
    if (msg.message_type === "gif") {
      return (
        <img
          src={msg.content}
          alt="GIF"
          className="rounded-lg max-w-[200px] max-h-[150px] object-cover"
          loading="lazy"
        />
      );
    }
    return <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>;
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = "";
  messages.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msg.created_at, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="flex-row items-center gap-3 py-3 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-12 w-12">
          <AvatarImage src={friendProfile.profile_photo_url || undefined} />
          <AvatarFallback className="text-lg">
            {friendProfile.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{friendProfile.name}</h3>
          <p className="text-xs text-muted-foreground">Tap to view profile</p>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-center">
              No messages yet. Say hello! 👋
            </p>
          </div>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-3">
              <div className="flex justify-center">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {formatDate(group.date)}
                </span>
              </div>
              {group.messages.map((msg, msgIndex) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"} animate-slide-up`}
                  style={{ animationDelay: `${msgIndex * 50}ms` }}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                      msg.message_type === "sticker" || msg.message_type === "gif"
                        ? "bg-transparent"
                        : msg.sender_id === userId
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    {renderMessageContent(msg)}
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.sender_id === userId && msg.message_type === "text"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="p-4 border-t">
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
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={() => sendMessage()} disabled={sending || !newMessage.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
