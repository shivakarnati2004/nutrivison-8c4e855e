import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MusicPicker } from "./MusicPicker";

interface UploadReelProps {
  userId: string;
  onClose: () => void;
  onUploaded: () => void;
}

export const UploadReel = ({ userId, onClose, onUploaded }: UploadReelProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast({ variant: "destructive", title: "Video only", description: "Please select a video file" });
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 50MB" });
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);

    // Get duration
    const tempVideo = document.createElement("video");
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      setVideoDuration(Math.round(tempVideo.duration));
    };
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("reels").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("reels").getPublicUrl(path);

      const { error } = await supabase.from("reels").insert({
        user_id: userId,
        video_url: urlData.publicUrl,
        caption: caption || null,
        music_name: music,
      } as any);

      if (error) throw error;
      toast({ title: "Reel uploaded!" });
      onUploaded();
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
          <DialogTitle>Upload Reel</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Tap to select a video</p>
            <p className="text-xs text-muted-foreground mt-1">Up to 60 seconds, max 50MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[300px]">
              <video ref={previewVideoRef} src={preview} className="w-full h-full object-cover" controls />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/50 backdrop-blur-sm"
                onClick={() => { setFile(null); setPreview(null); setVideoDuration(0); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Duration info */}
            <div className={`flex items-center gap-2 text-sm px-1 ${videoDuration > 60 ? "text-destructive" : "text-muted-foreground"}`}>
              {videoDuration > 60 ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              <span>{videoDuration}s {videoDuration > 60 ? "— Recommended max 60s" : ""}</span>
            </div>

            <Input
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
            />

            <MusicPicker selected={music} onSelect={setMusic} />

            <Button onClick={handleSubmit} disabled={uploading} className="w-full">
              {uploading ? "Uploading..." : "Share Reel"}
            </Button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
      </DialogContent>
    </Dialog>
  );
};