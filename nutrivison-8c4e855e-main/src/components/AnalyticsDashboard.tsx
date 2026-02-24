import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Flame, Drumstick, Target, Scale, Dumbbell, Trophy } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts";
import { MilestonePopup, MILESTONES } from "./MilestonePopup";

interface AnalyticsDashboardProps {
  userId: string;
  profile?: {
    daily_calories_target?: number;
    daily_protein_target?: number;
    daily_carbs_target?: number;
    daily_fat_target?: number;
    goal?: string;
  };
}

interface DailyData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  caloriesBurned: number;
}

interface MilestoneState {
  isOpen: boolean;
  title: string;
  description: string;
  milestone: string;
}

export const AnalyticsDashboard = ({ userId, profile }: AnalyticsDashboardProps) => {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [workoutData, setWorkoutData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [milestonePopup, setMilestonePopup] = useState<MilestoneState>({
    isOpen: false,
    title: "",
    description: "",
    milestone: "",
  });
  const [shownMilestones, setShownMilestones] = useState<Set<string>>(new Set());

  const targets = {
    calories: profile?.daily_calories_target || 2000,
    protein: profile?.daily_protein_target || 150,
    carbs: profile?.daily_carbs_target || 200,
    fat: profile?.daily_fat_target || 65,
  };

  useEffect(() => {
    fetchData();
  }, [userId, period]);

  const fetchData = async () => {
    setLoading(true);
    
    const daysBack = period === "day" ? 1 : period === "week" ? 7 : 30;
    const startDate = startOfDay(subDays(new Date(), daysBack - 1));
    const endDate = endOfDay(new Date());

    try {
      // Fetch nutrition entries
      const { data: nutritionData, error: nutritionError } = await supabase
        .from("nutrition_entries")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch workout logs
      const { data: workoutsData, error: workoutsError } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_at", startDate.toISOString())
        .lte("logged_at", endDate.toISOString());

      // Fetch total meal count and workout count for milestones
      const { count: totalMeals } = await supabase
        .from("nutrition_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const { count: totalWorkouts } = await supabase
        .from("workout_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (nutritionError) throw nutritionError;
      if (workoutsError) throw workoutsError;

      // Aggregate data by day
      const dailyMap: Record<string, DailyData> = {};
      
      for (let i = 0; i < daysBack; i++) {
        const date = format(subDays(new Date(), daysBack - 1 - i), "yyyy-MM-dd");
        dailyMap[date] = { date, calories: 0, protein: 0, carbs: 0, fat: 0, caloriesBurned: 0 };
      }

      nutritionData?.forEach((entry) => {
        const date = format(new Date(entry.created_at), "yyyy-MM-dd");
        if (dailyMap[date]) {
          dailyMap[date].calories += entry.calories;
          dailyMap[date].protein += entry.protein;
          dailyMap[date].carbs += entry.carbs;
          dailyMap[date].fat += entry.fat;
        }
      });

      workoutsData?.forEach((workout) => {
        const date = format(new Date(workout.logged_at), "yyyy-MM-dd");
        if (dailyMap[date]) {
          dailyMap[date].caloriesBurned += workout.calories_burned;
        }
      });

      const data = Object.values(dailyMap);
      setDailyData(data);
      setWorkoutData(workoutsData || []);

      // Check for milestones
      checkMilestones(data, totalMeals || 0, totalWorkouts || 0);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkMilestones = (data: DailyData[], totalMeals: number, totalWorkouts: number) => {
    const todayData = data[data.length - 1];
    if (!todayData) return;

    // First meal logged
    if (totalMeals === 1 && !shownMilestones.has(MILESTONES.FIRST_MEAL_LOGGED.id)) {
      showMilestone(MILESTONES.FIRST_MEAL_LOGGED);
      return;
    }

    // Calorie target hit
    if (todayData.calories >= targets.calories * 0.95 && 
        todayData.calories <= targets.calories * 1.05 &&
        !shownMilestones.has(MILESTONES.CALORIE_TARGET_HIT.id)) {
      showMilestone(MILESTONES.CALORIE_TARGET_HIT);
      return;
    }

    // Protein target hit
    if (todayData.protein >= targets.protein && !shownMilestones.has(MILESTONES.PROTEIN_CHAMPION.id)) {
      showMilestone(MILESTONES.PROTEIN_CHAMPION);
      return;
    }

    // 10 workouts
    if (totalWorkouts >= 10 && !shownMilestones.has(MILESTONES.TEN_WORKOUTS.id)) {
      showMilestone(MILESTONES.TEN_WORKOUTS);
      return;
    }

    // 7-day streak check
    if (data.length >= 7) {
      const hasStreak = data.slice(-7).every(d => d.calories > 0);
      if (hasStreak && !shownMilestones.has(MILESTONES.SEVEN_DAY_STREAK.id)) {
        showMilestone(MILESTONES.SEVEN_DAY_STREAK);
        return;
      }
    }
  };

  const showMilestone = (milestone: typeof MILESTONES.FIRST_MEAL_LOGGED) => {
    setShownMilestones(prev => new Set([...prev, milestone.id]));
    setMilestonePopup({
      isOpen: true,
      title: milestone.title,
      description: milestone.description,
      milestone: milestone.milestone,
    });
  };

  // Calculate totals
  const totals = dailyData.reduce(
    (acc, day) => ({
      calories: acc.calories + day.calories,
      protein: acc.protein + day.protein,
      carbs: acc.carbs + day.carbs,
      fat: acc.fat + day.fat,
      caloriesBurned: acc.caloriesBurned + day.caloriesBurned,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, caloriesBurned: 0 }
  );

  const netCalories = totals.calories - totals.caloriesBurned;
  const days = dailyData.length || 1;
  const avgCalories = Math.round(totals.calories / days);

  // Today's data (for daily view)
  const todayData = dailyData[dailyData.length - 1] || { calories: 0, protein: 0, carbs: 0, fat: 0, caloriesBurned: 0 };
  
  // Macro pie chart data
  const macroData = [
    { name: "Protein", value: period === "day" ? Math.round(todayData.protein) : Math.round(totals.protein / days), color: "#3B82F6" },
    { name: "Carbs", value: period === "day" ? Math.round(todayData.carbs) : Math.round(totals.carbs / days), color: "#F97316" },
    { name: "Fat", value: period === "day" ? Math.round(todayData.fat) : Math.round(totals.fat / days), color: "#EAB308" },
  ];

  const calorieProgress = period === "day" 
    ? (todayData.calories / targets.calories) * 100
    : (avgCalories / targets.calories) * 100;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">Loading analytics...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            Your Analytics
            <Trophy className="h-5 w-5 text-yellow-500" />
          </h2>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as "day" | "week" | "month")}>
            <TabsList>
              <TabsTrigger value="day">Today</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Flame className="h-4 w-4 text-primary" />
                Calories Consumed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{(period === "day" ? todayData.calories : totals.calories).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">
                Target: {(period === "day" ? targets.calories : targets.calories * days).toLocaleString()} kcal
              </p>
              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${calorieProgress > 100 ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${Math.min(calorieProgress, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Dumbbell className="h-4 w-4 text-primary" />
                Calories Burned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{(period === "day" ? todayData.caloriesBurned : totals.caloriesBurned).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">
                {workoutData.length} workout{workoutData.length !== 1 ? "s" : ""} logged
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4 text-primary" />
                Net Calories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${
                profile?.goal === "lose_fat" && netCalories < targets.calories * days ? "text-green-500" : 
                profile?.goal === "gain_weight" && netCalories > targets.calories * days ? "text-green-500" : ""
              }`}>
                {(period === "day" ? todayData.calories - todayData.caloriesBurned : netCalories).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Intake - Exercise
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-primary" />
                Average Daily
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{avgCalories.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">
                kcal per day
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Macro Breakdown */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Drumstick className="h-5 w-5 text-primary" />
                Macro Breakdown {period === "day" ? "(Today)" : "(Average)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={macroData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}g`}
                    >
                      {macroData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {macroData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Calorie Trend */}
          {period !== "day" && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Calorie Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => format(new Date(date), "MM/dd")}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        labelFormatter={(date) => format(new Date(date), "MMM d, yyyy")}
                        formatter={(value: number) => [`${value.toLocaleString()} kcal`, "Calories"]}
                      />
                      <Bar dataKey="calories" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Goal Progress */}
          <Card className={`hover:shadow-md transition-shadow ${period !== "day" ? "md:col-span-2" : ""}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Goal Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Protein</span>
                    <span>{period === "day" ? Math.round(todayData.protein) : Math.round(totals.protein / days)}g / {targets.protein}g</span>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(((period === "day" ? todayData.protein : totals.protein / days) / targets.protein) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Carbs</span>
                    <span>{period === "day" ? Math.round(todayData.carbs) : Math.round(totals.carbs / days)}g / {targets.carbs}g</span>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 transition-all"
                      style={{ width: `${Math.min(((period === "day" ? todayData.carbs : totals.carbs / days) / targets.carbs) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Fat</span>
                    <span>{period === "day" ? Math.round(todayData.fat) : Math.round(totals.fat / days)}g / {targets.fat}g</span>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 transition-all"
                      style={{ width: `${Math.min(((period === "day" ? todayData.fat : totals.fat / days) / targets.fat) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Milestone Popup */}
      <MilestonePopup
        isOpen={milestonePopup.isOpen}
        onClose={() => setMilestonePopup(prev => ({ ...prev, isOpen: false }))}
        title={milestonePopup.title}
        description={milestonePopup.description}
        milestone={milestonePopup.milestone}
        userId={userId}
      />
    </>
  );
};
