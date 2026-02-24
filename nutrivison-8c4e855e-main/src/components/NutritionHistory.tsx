import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Flame, Pencil, Trash2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface NutritionHistoryProps {
  userId: string;
}

interface HistoryEntry {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
  meal_time: string | null;
}

const mealTimeLabels: Record<string, { label: string; icon: string }> = {
  breakfast: { label: "Breakfast", icon: "🌅" },
  lunch: { label: "Lunch", icon: "☀️" },
  dinner: { label: "Dinner", icon: "🌙" },
  snacks: { label: "Snacks", icon: "🍿" },
};

export const NutritionHistory = ({ userId }: NutritionHistoryProps) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<HistoryEntry>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("nutrition_entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: HistoryEntry) => {
    setEditingId(entry.id);
    setEditData({
      food_name: entry.food_name,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      meal_time: entry.meal_time,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from("nutrition_entries")
        .update({
          food_name: editData.food_name,
          calories: editData.calories,
          protein: editData.protein,
          carbs: editData.carbs,
          fat: editData.fat,
          meal_time: editData.meal_time,
        })
        .eq("id", editingId);

      if (error) throw error;

      setEntries(entries.map(e => 
        e.id === editingId 
          ? { ...e, ...editData } as HistoryEntry
          : e
      ));
      setEditingId(null);
      setEditData({});
      
      toast({
        title: "Updated!",
        description: "Entry has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update entry.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("nutrition_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setEntries(entries.filter(e => e.id !== id));
      
      toast({
        title: "Deleted!",
        description: "Entry has been removed from history.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete entry.",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading history...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No History Yet</h3>
          <p className="text-muted-foreground">
            Start analyzing food to see your nutrition history here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group entries by date
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = format(new Date(entry.created_at), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, HistoryEntry[]>);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold">Your Nutrition History</h2>
      
      {Object.entries(groupedEntries).map(([date, dayEntries]) => (
        <div key={date} className="space-y-3">
          <h3 className="text-lg font-semibold text-muted-foreground">
            {format(new Date(date), "EEEE, MMMM d, yyyy")}
          </h3>
          <div className="grid gap-3">
            {dayEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="pt-4">
                  {editingId === entry.id ? (
                    // Edit mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Input
                            value={editData.food_name || ""}
                            onChange={(e) => setEditData({ ...editData, food_name: e.target.value })}
                            placeholder="Food name"
                          />
                        </div>
                        <Input
                          type="number"
                          value={editData.calories || ""}
                          onChange={(e) => setEditData({ ...editData, calories: Number(e.target.value) })}
                          placeholder="Calories"
                        />
                        <Input
                          type="number"
                          value={editData.protein || ""}
                          onChange={(e) => setEditData({ ...editData, protein: Number(e.target.value) })}
                          placeholder="Protein (g)"
                        />
                        <Input
                          type="number"
                          value={editData.carbs || ""}
                          onChange={(e) => setEditData({ ...editData, carbs: Number(e.target.value) })}
                          placeholder="Carbs (g)"
                        />
                        <Input
                          type="number"
                          value={editData.fat || ""}
                          onChange={(e) => setEditData({ ...editData, fat: Number(e.target.value) })}
                          placeholder="Fat (g)"
                        />
                        <Select
                          value={editData.meal_time || ""}
                          onValueChange={(value) => setEditData({ ...editData, meal_time: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Meal time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                            <SelectItem value="lunch">☀️ Lunch</SelectItem>
                            <SelectItem value="dinner">🌙 Dinner</SelectItem>
                            <SelectItem value="snacks">🍿 Snacks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} className="gap-1">
                          <Check className="h-4 w-4" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit} className="gap-1">
                          <X className="h-4 w-4" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{entry.food_name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{format(new Date(entry.created_at), "h:mm a")}</span>
                            {entry.meal_time && mealTimeLabels[entry.meal_time] && (
                              <span className="bg-secondary px-2 py-0.5 rounded text-xs">
                                {mealTimeLabels[entry.meal_time].icon} {mealTimeLabels[entry.meal_time].label}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={() => handleEdit(entry)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove "{entry.food_name}" from your history.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(entry.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                          <Flame className="h-4 w-4 text-primary mx-auto mb-1" />
                          <p className="text-lg font-bold">{entry.calories}</p>
                          <p className="text-xs text-muted-foreground">kcal</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{entry.protein}g</p>
                          <p className="text-xs text-muted-foreground">Protein</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{entry.carbs}g</p>
                          <p className="text-xs text-muted-foreground">Carbs</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{entry.fat}g</p>
                          <p className="text-xs text-muted-foreground">Fat</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
