import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Check, X, Flame, Beef, Wheat, Droplet, Clock, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NutritionData {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
  weight_grams?: number;
}

interface FoodAnalysisPreviewProps {
  data: NutritionData;
  imageUrl?: string | null;
  userId: string;
  onSave: () => void;
  onDiscard: () => void;
}

const mealTimeOptions = [
  { value: "breakfast", label: "Breakfast", icon: "🌅" },
  { value: "lunch", label: "Lunch", icon: "☀️" },
  { value: "dinner", label: "Dinner", icon: "🌙" },
  { value: "snacks", label: "Snacks", icon: "🍿" },
];

export const FoodAnalysisPreview = ({
  data,
  imageUrl,
  userId,
  onSave,
  onDiscard,
}: FoodAnalysisPreviewProps) => {
  const [mealTime, setMealTime] = useState("lunch");
  const [customTime, setCustomTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState(data);
  const [weightGrams, setWeightGrams] = useState(data.weight_grams || 100);
  const [baseWeight, setBaseWeight] = useState(data.weight_grams || 100);
  const [baseNutrition, setBaseNutrition] = useState({
    calories: data.calories,
    protein: data.protein,
    carbs: data.carbs,
    fat: data.fat,
  });
  const { toast } = useToast();

  // Recalculate nutrition when weight changes
  useEffect(() => {
    if (baseWeight > 0) {
      const ratio = weightGrams / baseWeight;
      setEditedData(prev => ({
        ...prev,
        calories: Math.round(baseNutrition.calories * ratio),
        protein: Math.round(baseNutrition.protein * ratio * 10) / 10,
        carbs: Math.round(baseNutrition.carbs * ratio * 10) / 10,
        fat: Math.round(baseNutrition.fat * ratio * 10) / 10,
      }));
    }
  }, [weightGrams, baseWeight, baseNutrition]);

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase.from("nutrition_entries").insert({
        user_id: userId,
        food_name: editedData.food_name,
        calories: editedData.calories,
        protein: editedData.protein,
        carbs: editedData.carbs,
        fat: editedData.fat,
        serving_size: editedData.serving_size,
        weight_grams: weightGrams,
        meal_time: mealTime === "custom" ? customTime : mealTime,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast({
        title: "Saved to history!",
        description: `${editedData.food_name} has been added to your nutrition log.`,
      });

      onSave();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message || "Could not save to history. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image preview */}
          {imageUrl && (
            <div className="rounded-xl overflow-hidden max-h-64">
              <img src={imageUrl} alt="Food" className="w-full h-auto object-contain" />
            </div>
          )}

          {/* Food name */}
          <div className="space-y-2">
            <Label>Food Name</Label>
            <Input
              value={editedData.food_name}
              onChange={(e) => setEditedData({ ...editedData, food_name: e.target.value })}
              className="text-lg font-medium"
            />
          </div>

          {/* Weight customization */}
          <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
            <Label className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Weight (grams)
            </Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                value={weightGrams}
                onChange={(e) => setWeightGrams(Math.max(1, Number(e.target.value)))}
                className="w-32 text-lg font-semibold"
                min={1}
              />
              <div className="flex gap-2">
                {[50, 100, 150, 200, 250].map((w) => (
                  <Button
                    key={w}
                    variant={weightGrams === w ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWeightGrams(w)}
                  >
                    {w}g
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Nutrition values auto-adjust based on weight. Base: {baseWeight}g
            </p>
          </div>

          {/* Nutrition grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-primary/10 rounded-xl text-center">
              <Flame className="h-6 w-6 text-primary mx-auto mb-2" />
              <Input
                type="number"
                value={Math.round(editedData.calories)}
                onChange={(e) => {
                  const newVal = Number(e.target.value);
                  setEditedData({ ...editedData, calories: newVal });
                  setBaseNutrition(prev => ({ ...prev, calories: newVal * baseWeight / weightGrams }));
                }}
                className="text-2xl font-bold text-center border-0 bg-transparent p-0 h-auto w-20 mx-auto"
              />
              <p className="text-xs text-muted-foreground mt-1">Calories</p>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-xl text-center">
              <Beef className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <div className="flex items-center justify-center gap-1">
                <Input
                  type="number"
                  step="0.1"
                  value={Number(editedData.protein).toFixed(1)}
                  onChange={(e) => {
                    const newVal = Number(e.target.value);
                    setEditedData({ ...editedData, protein: newVal });
                    setBaseNutrition(prev => ({ ...prev, protein: newVal * baseWeight / weightGrams }));
                  }}
                  className="text-2xl font-bold text-center border-0 bg-transparent p-0 h-auto w-20"
                />
                <span className="text-2xl font-bold">g</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Protein</p>
            </div>
            <div className="p-4 bg-orange-500/10 rounded-xl text-center">
              <Wheat className="h-6 w-6 text-orange-500 mx-auto mb-2" />
              <div className="flex items-center justify-center gap-1">
                <Input
                  type="number"
                  step="0.1"
                  value={Number(editedData.carbs).toFixed(1)}
                  onChange={(e) => {
                    const newVal = Number(e.target.value);
                    setEditedData({ ...editedData, carbs: newVal });
                    setBaseNutrition(prev => ({ ...prev, carbs: newVal * baseWeight / weightGrams }));
                  }}
                  className="text-2xl font-bold text-center border-0 bg-transparent p-0 h-auto w-20"
                />
                <span className="text-2xl font-bold">g</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Carbs</p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-xl text-center">
              <Droplet className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
              <div className="flex items-center justify-center gap-1">
                <Input
                  type="number"
                  step="0.1"
                  value={Number(editedData.fat).toFixed(1)}
                  onChange={(e) => {
                    const newVal = Number(e.target.value);
                    setEditedData({ ...editedData, fat: newVal });
                    setBaseNutrition(prev => ({ ...prev, fat: newVal * baseWeight / weightGrams }));
                  }}
                  className="text-2xl font-bold text-center border-0 bg-transparent p-0 h-auto w-20"
                />
                <span className="text-2xl font-bold">g</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Fat</p>
            </div>
          </div>

          {/* Serving size */}
          <div className="space-y-2">
            <Label>Serving Size</Label>
            <Input
              value={editedData.serving_size}
              onChange={(e) => setEditedData({ ...editedData, serving_size: e.target.value })}
            />
          </div>

          {/* Meal time selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Meal Time
            </Label>
            <Select value={mealTime} onValueChange={setMealTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select meal time" />
              </SelectTrigger>
              <SelectContent>
                {mealTimeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <span className="flex items-center gap-2">
                    <span>⏰</span>
                    <span>Custom</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {mealTime === "custom" && (
              <Input
                placeholder="e.g., Pre-workout, Post-workout, Mid-morning..."
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onDiscard}
              disabled={saving}
              className="flex-1 gap-2"
            >
              <X className="h-4 w-4" />
              Discard
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 gap-2"
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save to History
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
