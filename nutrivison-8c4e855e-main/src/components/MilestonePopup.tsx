import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Share2, X, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

interface MilestonePopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  milestone: string;
  userId: string;
  icon?: React.ReactNode;
}

export const MilestonePopup = ({
  isOpen,
  onClose,
  title,
  description,
  milestone,
  userId,
  icon,
}: MilestonePopupProps) => {
  const [sharing, setSharing] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    setSharing(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: `🏆 Achievement Unlocked!\n\n${title}\n${description}\n\n#NutriVision #Achievement #FitnessGoals`,
        post_type: "achievement",
      });

      if (error) throw error;

      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#f59e0b", "#3b82f6"],
      });

      toast({
        title: "Shared!",
        description: "Your achievement has been posted to your feed!",
      });
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to share achievement",
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 relative">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pop-in">
              {icon || <Trophy className="h-10 w-10 text-white" />}
            </div>
            <div className="absolute -top-2 -right-2 animate-bounce">
              <Sparkles className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {title}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center my-4">
          <div className="bg-muted/50 px-6 py-3 rounded-full">
            <p className="text-sm font-medium text-muted-foreground">{milestone}</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Maybe Later
          </Button>
          <Button onClick={handleShare} disabled={sharing} className="gap-2">
            <Share2 className="h-4 w-4" />
            {sharing ? "Sharing..." : "Share to Feed"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Export milestone types for use in analytics
export const MILESTONES = {
  FIRST_MEAL_LOGGED: {
    id: "first_meal_logged",
    title: "First Steps!",
    description: "You logged your first meal. Your nutrition journey begins now!",
    milestone: "First Meal Tracked",
  },
  SEVEN_DAY_STREAK: {
    id: "seven_day_streak",
    title: "Consistency King!",
    description: "You've logged meals for 7 days straight. Keep up the momentum!",
    milestone: "7-Day Logging Streak",
  },
  CALORIE_TARGET_HIT: {
    id: "calorie_target_hit",
    title: "Target Locked!",
    description: "You hit your daily calorie target. Perfect balance achieved!",
    milestone: "Daily Goal Achieved",
  },
  TEN_WORKOUTS: {
    id: "ten_workouts",
    title: "Fitness Warrior!",
    description: "You've completed 10 workouts. Your dedication is inspiring!",
    milestone: "10 Workouts Complete",
  },
  WEIGHT_GOAL_PROGRESS: {
    id: "weight_goal_progress",
    title: "Progress Made!",
    description: "You're making progress toward your weight goal. Stay focused!",
    milestone: "Weight Goal Progress",
  },
  PROTEIN_CHAMPION: {
    id: "protein_champion",
    title: "Protein Champion!",
    description: "You hit your protein target for the day. Muscles are happy!",
    milestone: "Protein Goal Achieved",
  },
};
