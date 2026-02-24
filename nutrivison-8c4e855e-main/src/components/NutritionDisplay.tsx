import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Droplet, Drumstick, Apple } from "lucide-react";

interface NutritionDisplayProps {
  data: {
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    serving_size?: string;
  };
}

export const NutritionDisplay = ({ data }: NutritionDisplayProps) => {
  const macros = [
    {
      name: "Protein",
      value: data.protein,
      icon: Drumstick,
      color: "text-primary",
      max: 100,
    },
    {
      name: "Carbs",
      value: data.carbs,
      icon: Apple,
      color: "text-accent",
      max: 150,
    },
    {
      name: "Fat",
      value: data.fat,
      icon: Droplet,
      color: "text-destructive",
      max: 70,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          Nutrition Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center p-6 bg-gradient-primary rounded-xl text-white">
          <p className="text-sm font-medium mb-1">Identified Food</p>
          <h3 className="text-2xl font-display font-bold mb-2">{data.food_name}</h3>
          {data.serving_size && (
            <p className="text-sm opacity-90">Serving: {data.serving_size}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="text-center p-4 bg-secondary rounded-xl">
            <Flame className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{data.calories}</p>
            <p className="text-sm text-muted-foreground">Calories</p>
          </div>
        </div>

        <div className="space-y-4">
          {macros.map((macro) => {
            const Icon = macro.icon;
            const percentage = (macro.value / macro.max) * 100;
            return (
              <div key={macro.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${macro.color}`} />
                    <span className="font-medium">{macro.name}</span>
                  </div>
                  <span className="font-semibold">{macro.value}g</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
