import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Save, Camera, User, Activity, MapPin, Target, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "", gender: "", age: "", height: "", weight: "",
    goal: "", activity_level: "", country: "", state: "", city: "", profile_photo_url: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      const { data: profileData } = await supabase.from("user_profiles").select("*").eq("user_id", session.user.id).single();
      if (profileData) {
        setProfile(profileData);
        setFormData({
          name: profileData.name || "", gender: profileData.gender || "", age: profileData.age?.toString() || "",
          height: profileData.height?.toString() || "", weight: profileData.weight?.toString() || "",
          goal: profileData.goal || "", activity_level: profileData.activity_level || "",
          country: profileData.country || "", state: profileData.state || "", city: profileData.city || "",
          profile_photo_url: profileData.profile_photo_url || "",
        });
      }
      setLoading(false);
    });
  }, [navigate]);

  const calculateTargets = () => {
    const weight = parseFloat(formData.weight);
    const height = parseFloat(formData.height);
    const age = parseInt(formData.age);
    const gender = formData.gender;
    const activityLevel = formData.activity_level;
    const goal = formData.goal;
    if (!weight || !height || !age || !gender || !activityLevel) return null;
    let bmr: number;
    if (gender === "male") bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    else if (gender === "female") bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    else bmr = 10 * weight + 6.25 * height - 5 * age - 78;
    const activityMultipliers: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);
    let dailyCalories: number;
    if (goal === "lose_fat") dailyCalories = tdee - 500;
    else if (goal === "gain_weight") dailyCalories = tdee + 300;
    else dailyCalories = tdee;
    const proteinGrams = Math.round(weight * 2);
    const fatGrams = Math.round((dailyCalories * 0.25) / 9);
    const carbsGrams = Math.round((dailyCalories - proteinGrams * 4 - fatGrams * 9) / 4);
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), daily_calories_target: Math.round(dailyCalories), daily_protein_target: proteinGrams, daily_fat_target: fatGrams, daily_carbs_target: carbsGrams };
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("profile-photos").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;
      setFormData(prev => ({ ...prev, profile_photo_url: cacheBustedUrl }));
      toast({ title: "Photo uploaded!", description: "Save your profile to keep the change." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload failed", description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const targets = calculateTargets();
      const updateData: any = {
        name: formData.name, gender: formData.gender, age: parseInt(formData.age) || null,
        height: parseFloat(formData.height) || null, weight: parseFloat(formData.weight) || null,
        goal: formData.goal, activity_level: formData.activity_level,
        country: formData.country, state: formData.state, city: formData.city,
        profile_photo_url: formData.profile_photo_url, ...(targets || {}),
      };
      const { error } = await supabase.from("user_profiles").update(updateData).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Profile saved!", description: "Your targets have been recalculated." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const targets = calculateTargets();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-display font-bold">Edit Profile</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Profile Photo */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar
                  className="h-28 w-28 ring-4 ring-primary/20 cursor-pointer"
                  onClick={() => formData.profile_photo_url && setShowPhotoModal(true)}
                >
                  <AvatarImage src={formData.profile_photo_url} className="object-cover" />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold">
                    {formData.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full h-9 w-9 shadow-lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold">{formData.name || "Your Name"}</h2>
                {uploading && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Full-screen photo modal */}
        <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
          <DialogContent className="max-w-lg p-0 bg-black border-none">
            <button onClick={() => setShowPhotoModal(false)} className="absolute top-3 right-3 z-10 text-white/80 hover:text-white">
              <X className="h-6 w-6" />
            </button>
            <img src={formData.profile_photo_url} alt="Profile" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
          </DialogContent>
        </Dialog>

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5" /> Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Your name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} placeholder="Years" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Body Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5" /> Body Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Height (cm)</Label>
                <Input type="number" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} placeholder="cm" />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input type="number" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} placeholder="kg" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals & Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Target className="h-5 w-5" /> Goals & Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Goal</Label>
              <Select value={formData.goal} onValueChange={(v) => setFormData({ ...formData, goal: v })}>
                <SelectTrigger><SelectValue placeholder="Select your goal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose_fat">Lose Fat</SelectItem>
                  <SelectItem value="gain_weight">Gain Weight</SelectItem>
                  <SelectItem value="maintain">Maintain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Activity Level</Label>
              <Select value={formData.activity_level} onValueChange={(v) => setFormData({ ...formData, activity_level: v })}>
                <SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                  <SelectItem value="light">Light (1-3 days/week)</SelectItem>
                  <SelectItem value="moderate">Moderate (3-5 days/week)</SelectItem>
                  <SelectItem value="active">Active (6-7 days/week)</SelectItem>
                  <SelectItem value="very_active">Very Active (intense daily)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><MapPin className="h-5 w-5" /> Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} placeholder="Country" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="State" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="City" />
              </div>
            </div>
          </CardContent>
        </Card>

        {targets && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Your Calculated Targets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div><p className="text-2xl font-bold text-primary">{targets.daily_calories_target}</p><p className="text-xs text-muted-foreground">Daily Calories</p></div>
                <div><p className="text-2xl font-bold text-blue-500">{targets.daily_protein_target}g</p><p className="text-xs text-muted-foreground">Protein</p></div>
                <div><p className="text-2xl font-bold text-orange-500">{targets.daily_carbs_target}g</p><p className="text-xs text-muted-foreground">Carbs</p></div>
                <div><p className="text-2xl font-bold text-yellow-500">{targets.daily_fat_target}g</p><p className="text-xs text-muted-foreground">Fat</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
          <Save className="h-5 w-5" />
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </main>

      <footer className="bg-card border-t border-border py-4 mt-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Made by <span className="font-medium text-foreground">Shiva Karnati</span>
        </div>
      </footer>
    </div>
  );
};

export default Profile;