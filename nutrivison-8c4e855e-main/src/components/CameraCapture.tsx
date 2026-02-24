import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, Loader2, ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NutritionDisplay } from "./NutritionDisplay";

interface CameraCaptureProps {
  userId: string;
}

export const CameraCapture = ({ userId }: CameraCaptureProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [nutritionData, setNutritionData] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (imageData: string) => {
    setAnalyzing(true);
    setNutritionData(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-food", {
        body: { image: imageData, userId },
      });

      if (error) throw error;

      setNutritionData(data);
      toast({
        title: "Analysis complete!",
        description: "Your food has been analyzed successfully.",
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: error.message || "Failed to analyze the image. Please try again.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const handleOpenCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (error: any) {
      if (error.name === "NotAllowedError") {
        toast({
          variant: "destructive",
          title: "Camera access denied",
          description: "Please allow camera access in your browser settings.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Camera unavailable",
          description: "Could not open camera. Try using the Gallery option instead.",
        });
      }
    }
  }, [toast]);

  const handleCapturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.85);
    stopCameraStream();
    setImage(imageData);
    analyzeImage(imageData);
  }, [stopCameraStream]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardContent className="pt-6">
          {showCamera ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto max-h-96 object-contain"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleCapturePhoto} size="lg" className="gap-2">
                  <Camera className="h-5 w-5" />
                  Capture Photo
                </Button>
                <Button variant="outline" onClick={stopCameraStream} size="lg" className="gap-2">
                  <X className="h-5 w-5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : !image ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-xl">
                <ImagePlus className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Upload or Capture Food</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Take a photo or choose from gallery
                </p>
                <div className="flex gap-3">
                  <Button onClick={handleOpenCamera} className="gap-2">
                    <Camera className="h-4 w-4" />
                    Camera
                  </Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Gallery
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden">
                <img src={image} alt="Food" className="w-full h-auto" />
                {analyzing && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                      <p className="font-medium">Analyzing your food...</p>
                    </div>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setImage(null);
                  setNutritionData(null);
                  stopCameraStream();
                }}
                className="w-full"
              >
                Analyze Another Image
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {nutritionData && <NutritionDisplay data={nutritionData} />}
    </div>
  );
};
