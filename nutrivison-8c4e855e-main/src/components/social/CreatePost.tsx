import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Image, Video, Send, X, Loader2, Smile } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StickerGifPicker } from "./StickerGifPicker";

interface CreatePostProps {
  userId: string;
  profile: any;
  onPostCreated: () => void;
}

export const CreatePost = ({ userId, profile, onPostCreated }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = type === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ variant: "destructive", title: "File too large", description: `Maximum file size is ${type === "video" ? "50MB" : "10MB"}` });
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `posts/${userId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
      setMediaUrl(publicUrl);
      setMediaType(type);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload failed", description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !mediaUrl) {
      toast({ variant: "destructive", title: "Error", description: "Add some content to post." });
      return;
    }
    setPosting(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: content.trim(),
        image_url: mediaUrl,
        media_type: mediaUrl ? mediaType : null,
        post_type: "general",
      });
      if (error) throw error;
      toast({ title: "Posted!", description: "Your post has been shared." });
      setContent("");
      setMediaUrl(null);
      onPostCreated();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setPosting(false);
    }
  };

  const removeMedia = () => {
    setMediaUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-primary/10">
            <AvatarImage src={profile?.profile_photo_url} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg">
              {profile?.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's on your mind? Share your fitness journey..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="resize-none min-h-[100px] text-base"
            />

            {mediaUrl && (
              <div className="relative inline-block w-full animate-fade-in">
                {mediaType === "video" ? (
                  <video src={mediaUrl} controls className="w-full max-h-64 rounded-lg object-contain bg-muted" />
                ) : (
                  <img src={mediaUrl} alt="Upload preview" className="w-full max-h-64 rounded-lg object-contain bg-muted" />
                )}
                <Button variant="secondary" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md" onClick={removeMedia}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2 text-muted-foreground hover:text-primary">
                  {uploading && mediaType === "image" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
                  Photo
                </Button>
                <Button variant="ghost" size="sm" onClick={() => videoInputRef.current?.click()} disabled={uploading} className="gap-2 text-muted-foreground hover:text-primary">
                  {uploading && mediaType === "video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                  Video
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                      <Smile className="h-4 w-4" /> Stickers
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" side="top">
                    <StickerGifPicker onSelect={(val, _type) => setContent((prev) => prev + val)} onClose={() => {}} />
                  </PopoverContent>
                </Popover>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleMediaUpload(e, "image")} className="hidden" />
                <input ref={videoInputRef} type="file" accept="video/*" onChange={(e) => handleMediaUpload(e, "video")} className="hidden" />
              </div>
              <Button onClick={handlePost} disabled={posting || uploading || (!content.trim() && !mediaUrl)} className="gap-2">
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {posting ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};