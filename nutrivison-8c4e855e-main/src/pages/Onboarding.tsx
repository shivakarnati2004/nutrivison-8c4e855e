import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, ArrowRight, ArrowLeft, User, Ruler, Target, Activity, MapPin, Camera, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

interface OnboardingData {
  name: string;
  gender: string;
  height: number;
  weight: number;
  age: number;
  goal: string;
  activityLevel: string;
  country: string;
  state: string;
  city: string;
  profilePhotoUrl: string;
}

const Onboarding = () => {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    name: "",
    gender: "",
    height: 0,
    weight: 0,
    age: 0,
    goal: "",
    activityLevel: "",
    country: "",
    state: "",
    city: "",
    profilePhotoUrl: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Calculate BMI, BMR, and TDEE
  const calculations = useMemo(() => {
    if (!data.height || !data.weight || !data.age || !data.gender) {
      return null;
    }

    const heightM = data.height / 100;
    const bmi = data.weight / (heightM * heightM);

    // Mifflin-St Jeor Equation for BMR
    let bmr: number;
    if (data.gender === "male") {
      bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + 5;
    } else {
      bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age - 161;
    }

    // Activity multipliers for TDEE
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const multiplier = activityMultipliers[data.activityLevel] || 1.2;
    const tdee = bmr * multiplier;

    // Calorie targets based on goal
    let dailyCalories = tdee;
    if (data.goal === "cut") {
      dailyCalories = tdee - 500;
    } else if (data.goal === "bulk") {
      dailyCalories = tdee + 300;
    }

    // Macro targets (standard ratios)
    const proteinTarget = Math.round((dailyCalories * 0.3) / 4); // 30% from protein
    const carbsTarget = Math.round((dailyCalories * 0.4) / 4); // 40% from carbs
    const fatTarget = Math.round((dailyCalories * 0.3) / 9); // 30% from fat

    return {
      bmi: Math.round(bmi * 10) / 10,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      dailyCalories: Math.round(dailyCalories),
      proteinTarget,
      carbsTarget,
      fatTarget,
    };
  }, [data]);

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: "Underweight", color: "text-yellow-500" };
    if (bmi < 25) return { label: "Normal", color: "text-green-500" };
    if (bmi < 30) return { label: "Overweight", color: "text-orange-500" };
    return { label: "Obese", color: "text-red-500" };
  };

  const handleNext = () => {
    if (step < 6) {
      setStep((step + 1) as OnboardingStep);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as OnboardingStep);
    }
  };

  const handleComplete = async () => {
    if (!calculations) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please complete all required fields.",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          name: data.name,
          gender: data.gender,
          height: data.height,
          weight: data.weight,
          age: data.age,
          goal: data.goal,
          activity_level: data.activityLevel,
          country: data.country,
          state: data.state,
          city: data.city,
          profile_photo_url: data.profilePhotoUrl || null,
          bmr: calculations.bmr,
          tdee: calculations.tdee,
          daily_calories_target: calculations.dailyCalories,
          daily_protein_target: calculations.proteinTarget,
          daily_carbs_target: calculations.carbsTarget,
          daily_fat_target: calculations.fatTarget,
          onboarding_completed: true,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Profile Complete!",
        description: "Your personalized nutrition targets have been set.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.name.trim() && data.gender;
      case 2:
        return data.height > 0 && data.weight > 0 && data.age > 0;
      case 3:
        return data.goal;
      case 4:
        return data.activityLevel;
      case 5:
        return data.country.trim() && data.state.trim() && data.city.trim();
      case 6:
        return true; // Profile photo is optional
      default:
        return false;
    }
  };

  const stepIcons = [
    <User key="user" className="h-5 w-5" />,
    <Ruler key="ruler" className="h-5 w-5" />,
    <Target key="target" className="h-5 w-5" />,
    <Activity key="activity" className="h-5 w-5" />,
    <MapPin key="map" className="h-5 w-5" />,
    <Camera key="camera" className="h-5 w-5" />,
  ];

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="font-display font-bold text-2xl">Nutrivision</span>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  s === step
                    ? "bg-primary text-primary-foreground"
                    : s < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : stepIcons[s - 1]}
              </div>
            ))}
          </div>

          <CardTitle className="text-center text-xl">
            {step === 1 && "Tell us about yourself"}
            {step === 2 && "Your measurements"}
            {step === 3 && "What's your goal?"}
            {step === 4 && "How active are you?"}
            {step === 5 && "Where are you located?"}
            {step === 6 && "Profile photo (optional)"}
          </CardTitle>
          <CardDescription className="text-center">
            Step {step} of 6
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Name & Gender */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <RadioGroup
                  value={data.gender}
                  onValueChange={(value) => setData({ ...data, gender: value })}
                  className="grid grid-cols-3 gap-3"
                >
                  {[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ].map((option) => (
                    <div key={option.value}>
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={option.value}
                        className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Height, Weight, Age */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="170"
                    value={data.height || ""}
                    onChange={(e) => setData({ ...data, height: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="70"
                    value={data.weight || ""}
                    onChange={(e) => setData({ ...data, weight: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="25"
                  value={data.age || ""}
                  onChange={(e) => setData({ ...data, age: Number(e.target.value) })}
                />
              </div>

              {/* Show BMI preview */}
              {data.height > 0 && data.weight > 0 && (
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-sm text-muted-foreground">Your BMI</p>
                  <p className="text-2xl font-bold">
                    {(data.weight / Math.pow(data.height / 100, 2)).toFixed(1)}
                    <span className={`text-sm ml-2 ${getBMICategory(data.weight / Math.pow(data.height / 100, 2)).color}`}>
                      {getBMICategory(data.weight / Math.pow(data.height / 100, 2)).label}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Goal */}
          {step === 3 && (
            <div className="space-y-2">
              <Label>Select your fitness goal</Label>
              <RadioGroup
                value={data.goal}
                onValueChange={(value) => setData({ ...data, goal: value })}
                className="space-y-3"
              >
                {[
                  { value: "cut", label: "Lose Fat", description: "Caloric deficit of 500 kcal/day" },
                  { value: "bulk", label: "Gain Weight", description: "Caloric surplus of 300 kcal/day" },
                  { value: "maintain", label: "Maintain Weight", description: "Stay at maintenance calories" },
                ].map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={option.value}
                      className="flex flex-col rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all"
                    >
                      <span className="font-medium">{option.label}</span>
                      <span className="text-sm text-muted-foreground">{option.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 4: Activity Level */}
          {step === 4 && (
            <div className="space-y-2">
              <Label>How active are you?</Label>
              <RadioGroup
                value={data.activityLevel}
                onValueChange={(value) => setData({ ...data, activityLevel: value })}
                className="space-y-3"
              >
                {[
                  { value: "sedentary", label: "Sedentary", description: "Little or no exercise" },
                  { value: "light", label: "Light", description: "Exercise 1-3 days/week" },
                  { value: "moderate", label: "Moderate", description: "Exercise 3-5 days/week" },
                  { value: "active", label: "Active", description: "Exercise 6-7 days/week" },
                  { value: "very_active", label: "Very Active", description: "Hard exercise daily or physical job" },
                ].map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={option.value}
                      className="flex flex-col rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all"
                    >
                      <span className="font-medium">{option.label}</span>
                      <span className="text-sm text-muted-foreground">{option.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 5: Location */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We'll use this to suggest regional food options and famous dishes from your area.
              </p>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="India"
                  value={data.country}
                  onChange={(e) => setData({ ...data, country: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  placeholder="Telangana"
                  value={data.state}
                  onChange={(e) => setData({ ...data, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Hyderabad"
                  value={data.city}
                  onChange={(e) => setData({ ...data, city: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step 6: Profile Photo & Summary */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                  {data.profilePhotoUrl ? (
                    <img src={data.profilePhotoUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Profile photo is optional. You can add one later.
                </p>
              </div>

              {/* Summary */}
              {calculations && (
                <div className="p-4 bg-secondary rounded-lg space-y-3">
                  <h4 className="font-semibold">Your Personalized Targets</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">BMI</p>
                      <p className="font-medium">{calculations.bmi} <span className={getBMICategory(calculations.bmi).color}>({getBMICategory(calculations.bmi).label})</span></p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">BMR</p>
                      <p className="font-medium">{calculations.bmr} kcal/day</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">TDEE</p>
                      <p className="font-medium">{calculations.tdee} kcal/day</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Daily Target</p>
                      <p className="font-medium text-primary">{calculations.dailyCalories} kcal/day</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Macro Targets</p>
                    <div className="flex justify-between text-sm">
                      <span>Protein: <strong>{calculations.proteinTarget}g</strong></span>
                      <span>Carbs: <strong>{calculations.carbsTarget}g</strong></span>
                      <span>Fat: <strong>{calculations.fatTarget}g</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {step < 6 ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="flex-1">
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading} className="flex-1">
                {loading ? "Saving..." : "Complete Setup"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm text-white/60">
        Made by <span className="font-medium text-white/80">Shiva Karnati</span>
      </p>
    </div>
  );
};

export default Onboarding;
