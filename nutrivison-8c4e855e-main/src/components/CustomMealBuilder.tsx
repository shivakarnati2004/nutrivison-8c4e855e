import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, UtensilsCrossed, Flame, Beef, Wheat, Droplet, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MealItem {
  id: string;
  food_name: string;
  weight_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface CustomMealBuilderProps {
  userId: string;
  onMealSaved?: () => void;
}

export const CustomMealBuilder = ({ userId, onMealSaved }: CustomMealBuilderProps) => {
  const [mealName, setMealName] = useState("");
  const [items, setItems] = useState<MealItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualItem, setManualItem] = useState({
    food_name: "",
    weight_grams: 100,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const { toast } = useToast();

  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);

    try {
      const response = await supabase.functions.invoke("text-food-search", {
        body: { query: searchQuery },
      });

      if (response.error) throw response.error;
      setSearchResults(response.data?.results || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Search failed", description: error.message });
    } finally {
      setSearching(false);
    }
  };

  const addFromSearch = (result: any) => {
    const newItem: MealItem = {
      id: `item-${Date.now()}`,
      food_name: result.food_name || result.name,
      weight_grams: result.serving_size_g || 100,
      calories: Math.round(result.calories || 0),
      protein: Math.round((result.protein || 0) * 10) / 10,
      carbs: Math.round((result.carbs || 0) * 10) / 10,
      fat: Math.round((result.fat || 0) * 10) / 10,
    };
    setItems([...items, newItem]);
    setSearchResults([]);
    setSearchQuery("");
    toast({ title: "Item added!", description: `${newItem.food_name} added to meal.` });
  };

  const addManualItem = () => {
    if (!manualItem.food_name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Food name is required." });
      return;
    }

    const newItem: MealItem = {
      id: `item-${Date.now()}`,
      ...manualItem,
    };
    setItems([...items, newItem]);
    setManualItem({
      food_name: "",
      weight_grams: 100,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    setShowAddForm(false);
    toast({ title: "Item added!", description: `${newItem.food_name} added to meal.` });
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItemWeight = (id: string, newWeight: number) => {
    setItems(items.map((item) => {
      if (item.id !== id) return item;
      const ratio = newWeight / item.weight_grams;
      return {
        ...item,
        weight_grams: newWeight,
        calories: Math.round(item.calories * ratio),
        protein: Math.round(item.protein * ratio * 10) / 10,
        carbs: Math.round(item.carbs * ratio * 10) / 10,
        fat: Math.round(item.fat * ratio * 10) / 10,
      };
    }));
  };

  const saveMeal = async () => {
    if (!mealName.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Meal name is required." });
      return;
    }

    if (items.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Add at least one item." });
      return;
    }

    setSaving(true);

    try {
      // Create custom meal
      const { data: meal, error: mealError } = await supabase
        .from("custom_meals")
        .insert({
          user_id: userId,
          name: mealName,
          total_calories: totals.calories,
          total_protein: totals.protein,
          total_carbs: totals.carbs,
          total_fat: totals.fat,
        })
        .select()
        .single();

      if (mealError) throw mealError;

      // Add meal items
      const mealItems = items.map((item) => ({
        meal_id: meal.id,
        food_name: item.food_name,
        weight_grams: item.weight_grams,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      }));

      const { error: itemsError } = await supabase
        .from("custom_meal_items")
        .insert(mealItems);

      if (itemsError) throw itemsError;

      // Also save to nutrition entries
      const { error: entryError } = await supabase.from("nutrition_entries").insert({
        user_id: userId,
        food_name: mealName,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        serving_size: `${items.length} items`,
        meal_time: "lunch",
      });

      if (entryError) throw entryError;

      toast({ title: "Meal saved!", description: `${mealName} has been logged.` });
      setMealName("");
      setItems([]);
      onMealSaved?.();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            Custom Meal Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Meal Name</Label>
            <Input
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="e.g., My Breakfast, Lunch Combo..."
            />
          </div>

          {/* Search for foods */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Food to Add
            </Label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for food..."
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? "..." : "Search"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg p-2 space-y-2 max-h-48 overflow-auto">
                {searchResults.map((result, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 hover:bg-secondary rounded cursor-pointer"
                    onClick={() => addFromSearch(result)}
                  >
                    <div>
                      <p className="font-medium">{result.food_name || result.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.calories} kcal | P: {result.protein}g | C: {result.carbs}g | F: {result.fat}g
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual add button */}
          <Button variant="outline" onClick={() => setShowAddForm(!showAddForm)} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Custom Item Manually
          </Button>

          {/* Manual add form */}
          {showAddForm && (
            <Card className="bg-secondary/50">
              <CardContent className="pt-4 space-y-4">
                <Input
                  value={manualItem.food_name}
                  onChange={(e) => setManualItem({ ...manualItem, food_name: e.target.value })}
                  placeholder="Food name"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Weight (g)</Label>
                    <Input
                      type="number"
                      value={manualItem.weight_grams}
                      onChange={(e) => setManualItem({ ...manualItem, weight_grams: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Calories</Label>
                    <Input
                      type="number"
                      value={manualItem.calories}
                      onChange={(e) => setManualItem({ ...manualItem, calories: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Protein (g)</Label>
                    <Input
                      type="number"
                      value={manualItem.protein}
                      onChange={(e) => setManualItem({ ...manualItem, protein: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Carbs (g)</Label>
                    <Input
                      type="number"
                      value={manualItem.carbs}
                      onChange={(e) => setManualItem({ ...manualItem, carbs: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Fat (g)</Label>
                    <Input
                      type="number"
                      value={manualItem.fat}
                      onChange={(e) => setManualItem({ ...manualItem, fat: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <Button onClick={addManualItem} className="w-full">Add Item</Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Items list */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items in Meal ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{item.food_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.calories} kcal | P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={item.weight_grams}
                    onChange={(e) => updateItemWeight(item.id, Number(e.target.value))}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">g</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Totals */}
      {items.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Meal Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <Flame className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-xl font-bold">{totals.calories}</p>
                <p className="text-xs text-muted-foreground">Calories</p>
              </div>
              <div>
                <Beef className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                <p className="text-xl font-bold">{Math.round(totals.protein * 10) / 10}g</p>
                <p className="text-xs text-muted-foreground">Protein</p>
              </div>
              <div>
                <Wheat className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                <p className="text-xl font-bold">{Math.round(totals.carbs * 10) / 10}g</p>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </div>
              <div>
                <Droplet className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                <p className="text-xl font-bold">{Math.round(totals.fat * 10) / 10}g</p>
                <p className="text-xs text-muted-foreground">Fat</p>
              </div>
            </div>

            <Button onClick={saveMeal} disabled={saving} className="w-full mt-6 gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Meal to History"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
