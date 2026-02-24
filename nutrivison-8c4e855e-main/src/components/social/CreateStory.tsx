import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MusicPicker } from "./MusicPicker";

interface CreateStoryProps {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateStory = ({ userId, onClose, onCreated }: CreateStoryProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 50MB" });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("stories").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("stories").getPublicUrl(path);
      const mediaType = file.type.startsWith("video") ? "video" : "image";

      const { error } = await supabase.from("stories").insert({
        user_id: userId,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        caption: caption || null,
        music_name: music,
      } as any);

      if (error) throw error;
      toast({ title: "Story posted!" });
      onCreated();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Tap to upload photo or video</p>
              <p className="text-xs text-muted-foreground mt-1">Max 50MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-muted aspect-[9/16] max-h-[400px]">
              {file?.type.startsWith("video") ? (
                <video src={preview} className="w-full h-full object-cover" controls />
              ) : (
                <img src={preview} className="w-full h-full object-cover" alt="Preview" />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/50 backdrop-blur-sm"
                onClick={() => { setFile(null); setPreview(null); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Input
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
            />

            <MusicPicker selected={music} onSelect={setMusic} />

            <Button onClick={handleSubmit} disabled={uploading} className="w-full">
              {uploading ? "Posting..." : "Share Story"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};