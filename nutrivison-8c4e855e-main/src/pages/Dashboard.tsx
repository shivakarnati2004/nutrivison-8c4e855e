import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, Camera, History, TrendingUp, Dumbbell, User, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FoodInput } from "@/components/FoodInput";
import { NutritionHistory } from "@/components/NutritionHistory";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { ExerciseModule } from "@/components/ExerciseModule";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileHeader } from "@/components/ProfileHeader";
import { AIChatbot } from "@/components/AIChatbot";
import { CustomMealBuilder } from "@/components/CustomMealBuilder";
import { SocialFeed } from "@/components/social/SocialFeed";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"capture" | "history" | "analytics" | "exercise" | "social">("capture");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showMealBuilder, setShowMealBuilder] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication and onboarding status
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      
      // Check if onboarding is completed
      const { data: profileData, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      
      if (!profileData || !profileData.onboarding_completed) {
        navigate("/onboarding");
        return;
      }
      
      setProfile(profileData);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out. Please try again.",
      });
    }
  };

  const handleFoodSaved = () => {
    setRefreshKey(prev => prev + 1);
    toast({
      title: "Food logged!",
      description: "Your entry has been saved to history.",
    });
  };

  if (!user || !profile) return null;

  const tabs = [
    { id: "capture", label: "Capture", icon: Camera },
    { id: "history", label: "History", icon: History },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "exercise", label: "Exercise", icon: Dumbbell },
    { id: "social", label: "Social", icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" />
              <h1 className="text-xl font-display font-bold">Nutrivision</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <ProfileHeader profile={profile} onSignOut={handleSignOut} />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-card border-b border-border sticky top-[57px] z-30">
        <div className="container mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {activeTab === "capture" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Log Food</h2>
              <Button
                variant={showMealBuilder ? "default" : "outline"}
                onClick={() => setShowMealBuilder(!showMealBuilder)}
                size="sm"
              >
                {showMealBuilder ? "Single Food" : "Build Meal"}
              </Button>
            </div>
            {showMealBuilder ? (
              <CustomMealBuilder userId={user.id} onMealSaved={handleFoodSaved} />
            ) : (
              <FoodInput userId={user.id} onSaved={handleFoodSaved} />
            )}
          </div>
        )}
        {activeTab === "history" && <NutritionHistory userId={user.id} key={refreshKey} />}
        {activeTab === "analytics" && <AnalyticsDashboard userId={user.id} profile={profile} key={refreshKey} />}
        {activeTab === "exercise" && <ExerciseModule userId={user.id} />}
        {activeTab === "social" && <SocialFeed userId={user.id} profile={profile} />}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Made by <span className="font-medium text-foreground">Shiva Karnati</span>
        </div>
      </footer>

      {/* AI Chatbot */}
      <AIChatbot userId={user.id} profile={profile} />
    </div>
  );
};

export default Dashboard;
