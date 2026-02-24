import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImagePlus, Type, Mic, Loader2, MicOff, Search, Camera, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FoodAnalysisPreview } from "./FoodAnalysisPreview";

interface FoodInputProps {
  userId: string;
  onSaved?: () => void;
}

interface NutritionData {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
}

export const FoodInput = ({ userId, onSaved }: FoodInputProps) => {
  const [activeTab, setActiveTab] = useState("image");
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [textInput, setTextInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

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
      // Wait for video element to mount
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
        description: "Review the results and choose to save or discard.",
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

  const searchByText = async (searchText: string) => {
    if (!searchText.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a food name to search.",
      });
      return;
    }

    setAnalyzing(true);
    setNutritionData(null);

    try {
      const { data, error } = await supabase.functions.invoke("text-food-search", {
        body: { foodName: searchText.trim() },
      });

      if (error) throw error;

      setNutritionData(data);
      toast({
        title: "Food found!",
        description: "Review the nutrition information.",
      });
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        variant: "destructive",
        title: "Search failed",
        description: error.message || "Could not find nutrition info. Try a different name.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Voice input is not supported in your browser.",
      });
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join("");
      setVoiceText(transcript);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      if (voiceText.trim()) {
        searchByText(voiceText);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      toast({
        variant: "destructive",
        title: "Voice Error",
        description: "Could not recognize speech. Please try again.",
      });
    };

    recognitionRef.current.start();
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleReset = () => {
    setImage(null);
    setNutritionData(null);
    setTextInput("");
    setVoiceText("");
    stopCameraStream();
  };

  const handleSaved = () => {
    handleReset();
    onSaved?.();
  };

  // Show preview if we have nutrition data
  if (nutritionData) {
    return (
      <FoodAnalysisPreview
        data={nutritionData}
        imageUrl={image}
        userId={userId}
        onSave={handleSaved}
        onDiscard={handleReset}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="image" className="gap-2">
                <ImagePlus className="h-4 w-4" />
                <span className="hidden sm:inline">Image</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-2">
                <Type className="h-4 w-4" />
                <span className="hidden sm:inline">Text</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="gap-2">
                <Mic className="h-4 w-4" />
                <span className="hidden sm:inline">Voice</span>
              </TabsTrigger>
            </TabsList>

            {/* Image Upload Tab */}
            <TabsContent value="image">
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
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-xl">
                  <ImagePlus className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Upload Food Image</h3>
                  <p className="text-muted-foreground text-sm mb-6 text-center">
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
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={image} alt="Food" className="w-full h-auto max-h-96 object-contain" />
                    {analyzing && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                          <p className="font-medium">Analyzing your food...</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" onClick={handleReset} className="w-full">
                    Choose Different Image
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Text Input Tab */}
            <TabsContent value="text">
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8">
                  <Type className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Type Food Name</h3>
                  <p className="text-muted-foreground text-sm mb-4 text-center">
                    Enter the name of your food to get nutrition info
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 2 eggs with rice, chicken biryani..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchByText(textInput)}
                    disabled={analyzing}
                  />
                  <Button onClick={() => searchByText(textInput)} disabled={analyzing || !textInput.trim()}>
                    {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Voice Input Tab */}
            <TabsContent value="voice">
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all ${
                    isListening ? "bg-primary animate-pulse" : "bg-muted"
                  }`}>
                    {isListening ? (
                      <Mic className="h-10 w-10 text-primary-foreground" />
                    ) : (
                      <MicOff className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {isListening ? "Listening..." : "Voice Input"}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4 text-center">
                    {isListening 
                      ? "Speak the name of your food" 
                      : "Tap the button and say what you ate"
                    }
                  </p>
                  {voiceText && (
                    <p className="text-center p-3 bg-secondary rounded-lg mb-4">
                      "{voiceText}"
                    </p>
                  )}
                  <Button 
                    onClick={isListening ? stopVoiceInput : startVoiceInput}
                    variant={isListening ? "destructive" : "default"}
                    size="lg"
                    className="gap-2"
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Searching...
                      </>
                    ) : isListening ? (
                      <>
                        <MicOff className="h-5 w-5" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic className="h-5 w-5" />
                        Start Speaking
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
