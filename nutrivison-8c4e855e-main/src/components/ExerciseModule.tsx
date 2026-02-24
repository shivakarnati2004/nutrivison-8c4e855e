import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Home, Flame, Clock, Check, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExerciseModuleProps {
  userId: string;
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  calories_per_minute: number;
  muscle_groups: string[];
  difficulty: string;
  description: string;
  workout_type?: string;
}

const defaultExercises: Omit<Exercise, 'id'>[] = [
  // Gym exercises
  { name: "Treadmill Running", category: "Cardio", workout_type: "gym", calories_per_minute: 10, muscle_groups: ["legs", "cardio"], difficulty: "moderate", description: "Running on treadmill at moderate pace" },
  { name: "Bench Press", category: "Strength", workout_type: "gym", calories_per_minute: 5, muscle_groups: ["chest", "triceps"], difficulty: "moderate", description: "Chest pressing with barbell" },
  { name: "Deadlift", category: "Strength", workout_type: "gym", calories_per_minute: 6, muscle_groups: ["back", "legs"], difficulty: "hard", description: "Full body compound movement" },
  { name: "Squats", category: "Strength", workout_type: "gym", calories_per_minute: 7, muscle_groups: ["legs", "glutes"], difficulty: "moderate", description: "Barbell back squats" },
  { name: "Lat Pulldown", category: "Strength", workout_type: "gym", calories_per_minute: 4, muscle_groups: ["back", "biceps"], difficulty: "easy", description: "Cable lat pulldown" },
  { name: "Cycling", category: "Cardio", workout_type: "both", calories_per_minute: 8, muscle_groups: ["legs", "cardio"], difficulty: "moderate", description: "Stationary bike cycling" },
  { name: "Rowing Machine", category: "Cardio", workout_type: "gym", calories_per_minute: 9, muscle_groups: ["back", "arms", "cardio"], difficulty: "moderate", description: "Full body cardio workout" },
  { name: "Shoulder Press", category: "Strength", workout_type: "gym", calories_per_minute: 5, muscle_groups: ["shoulders", "triceps"], difficulty: "moderate", description: "Overhead dumbbell press" },
  // Home exercises
  { name: "Push-ups", category: "Strength", workout_type: "home", calories_per_minute: 7, muscle_groups: ["chest", "triceps"], difficulty: "moderate", description: "Standard push-ups" },
  { name: "Jumping Jacks", category: "Cardio", workout_type: "home", calories_per_minute: 8, muscle_groups: ["full body", "cardio"], difficulty: "easy", description: "Cardio jumping exercise" },
  { name: "Burpees", category: "HIIT", workout_type: "home", calories_per_minute: 12, muscle_groups: ["full body", "cardio"], difficulty: "hard", description: "High intensity full body exercise" },
  { name: "Plank", category: "Core", workout_type: "home", calories_per_minute: 4, muscle_groups: ["core"], difficulty: "moderate", description: "Core strengthening hold" },
  { name: "Mountain Climbers", category: "HIIT", workout_type: "home", calories_per_minute: 10, muscle_groups: ["core", "cardio"], difficulty: "moderate", description: "Dynamic core and cardio" },
  { name: "Squats (Bodyweight)", category: "Strength", workout_type: "home", calories_per_minute: 6, muscle_groups: ["legs", "glutes"], difficulty: "easy", description: "Air squats without weight" },
  { name: "Lunges", category: "Strength", workout_type: "home", calories_per_minute: 6, muscle_groups: ["legs", "glutes"], difficulty: "moderate", description: "Walking or stationary lunges" },
  { name: "Yoga Flow", category: "Core", workout_type: "home", calories_per_minute: 3, muscle_groups: ["flexibility", "core"], difficulty: "easy", description: "Basic yoga stretching routine" },
  { name: "Running Outdoors", category: "Cardio", workout_type: "both", calories_per_minute: 11, muscle_groups: ["legs", "cardio"], difficulty: "moderate", description: "Outdoor running at moderate pace" },
  { name: "Walking", category: "Cardio", workout_type: "both", calories_per_minute: 4, muscle_groups: ["legs"], difficulty: "easy", description: "Brisk walking for cardio" },
];

// Helper function to determine workout type from database exercises
const getWorkoutType = (exercise: Exercise): string => {
  if (exercise.workout_type) return exercise.workout_type;
  
  // Fallback mapping based on category
  const categoryMap: Record<string, string> = {
    'Strength': 'gym',
    'HIIT': 'home',
    'Core': 'home',
    'Cardio': 'both',
  };
  return categoryMap[exercise.category] || 'both';
};

export const ExerciseModule = ({ userId }: ExerciseModuleProps) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [activeType, setActiveType] = useState<"gym" | "home">("gym");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [duration, setDuration] = useState<number>(30);
  const [logging, setLogging] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    const { data, error } = await supabase
      .from("exercises")
      .select("*");

    if (error || !data || data.length === 0) {
      // Use default exercises if none in database
      setExercises(defaultExercises.map((e, i) => ({ ...e, id: `default-${i}` })));
    } else {
      // Map database exercises with workout_type
      setExercises(data.map(e => ({ ...e, workout_type: e.workout_type || getWorkoutType(e) })));
    }
  };

  // Filter exercises based on workout type (gym, home, or both)
  const filteredExercises = exercises.filter(e => {
    const workoutType = getWorkoutType(e);
    return workoutType === activeType || workoutType === 'both';
  });

  const handleLogExercise = async () => {
    if (!selectedExercise || duration <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an exercise and enter duration.",
      });
      return;
    }

    setLogging(true);

    try {
      const caloriesBurned = Math.round(selectedExercise.calories_per_minute * duration);

      const { error } = await supabase.from("workout_logs").insert({
        user_id: userId,
        exercise_name: selectedExercise.name,
        exercise_id: selectedExercise.id.startsWith("default-") ? null : selectedExercise.id,
        duration_minutes: duration,
        calories_burned: caloriesBurned,
      });

      if (error) throw error;

      toast({
        title: "Exercise logged!",
        description: `Burned ${caloriesBurned} calories with ${selectedExercise.name}`,
      });

      setSelectedExercise(null);
      setDuration(30);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to log exercise.",
      });
    } finally {
      setLogging(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "text-green-500";
      case "moderate": return "text-yellow-500";
      case "hard": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">Exercise Tracker</h2>

      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as "gym" | "home")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gym" className="gap-2">
            <Dumbbell className="h-4 w-4" />
            Gym Workout
          </TabsTrigger>
          <TabsTrigger value="home" className="gap-2">
            <Home className="h-4 w-4" />
            Home Workout
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gym" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                isSelected={selectedExercise?.id === exercise.id}
                onSelect={() => setSelectedExercise(exercise)}
                getDifficultyColor={getDifficultyColor}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="home" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                isSelected={selectedExercise?.id === exercise.id}
                onSelect={() => setSelectedExercise(exercise)}
                getDifficultyColor={getDifficultyColor}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Log exercise section */}
      {selectedExercise && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Log Exercise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-secondary rounded-lg p-4">
              <h4 className="font-semibold">{selectedExercise.name}</h4>
              <p className="text-sm text-muted-foreground">{selectedExercise.description}</p>
              <p className="text-sm mt-2">
                Burns ~<strong>{selectedExercise.calories_per_minute}</strong> kcal/minute
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">Duration (minutes)</label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={1}
                  max={300}
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Estimated</p>
                <p className="text-2xl font-bold text-primary">
                  {Math.round(selectedExercise.calories_per_minute * duration)}
                </p>
                <p className="text-sm text-muted-foreground">kcal</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedExercise(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleLogExercise}
                disabled={logging}
              >
                {logging ? "Logging..." : (
                  <>
                    <Check className="h-4 w-4" />
                    Log Exercise
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface ExerciseCardProps {
  exercise: Exercise;
  isSelected: boolean;
  onSelect: () => void;
  getDifficultyColor: (difficulty: string) => string;
}

const ExerciseCard = ({ exercise, isSelected, onSelect, getDifficultyColor }: ExerciseCardProps) => (
  <Card 
    className={`cursor-pointer transition-all hover:border-primary ${isSelected ? "border-primary bg-primary/5" : ""}`}
    onClick={onSelect}
  >
    <CardContent className="pt-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold">{exercise.name}</h4>
        {isSelected && <Check className="h-5 w-5 text-primary" />}
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exercise.description}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1">
          <Flame className="h-4 w-4 text-primary" />
          {exercise.calories_per_minute} kcal/min
        </span>
        <span className={`capitalize ${getDifficultyColor(exercise.difficulty)}`}>
          {exercise.difficulty}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {exercise.muscle_groups?.slice(0, 3).map((group) => (
          <span key={group} className="text-xs bg-secondary px-2 py-0.5 rounded">
            {group}
          </span>
        ))}
      </div>
    </CardContent>
  </Card>
);
