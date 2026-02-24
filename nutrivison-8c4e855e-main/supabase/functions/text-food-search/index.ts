import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { foodName } = await req.json();

    if (!foodName) {
      return new Response(
        JSON.stringify({ error: "Food name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Searching for food:", foodName);

    // Try CalorieNinja API first
    let nutritionData = await searchCalorieNinja(foodName);

    // If CalorieNinja fails, use Lovable AI to estimate
    if (!nutritionData) {
      console.log("CalorieNinja failed, using AI estimation...");
      nutritionData = await estimateWithAI(foodName);
    }

    if (!nutritionData) {
      return new Response(
        JSON.stringify({ error: "Could not find nutrition information for this food." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found nutrition data:", nutritionData);

    return new Response(
      JSON.stringify(nutritionData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in text-food-search function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function searchCalorieNinja(foodName: string): Promise<any | null> {
  const apiKey = Deno.env.get("CALORIENINJAS_API_KEY");
  if (!apiKey) {
    console.error("CALORIENINJAS_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(foodName)}`,
      {
        headers: { "X-Api-Key": apiKey }
      }
    );

    if (!response.ok) {
      console.error("CalorieNinja API error:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("CalorieNinja response:", data);

    if (data.items && data.items.length > 0) {
      // Aggregate all items if multiple foods mentioned
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      const names: string[] = [];

      for (const item of data.items) {
        totalCalories += item.calories || 0;
        totalProtein += item.protein_g || 0;
        totalCarbs += item.carbohydrates_total_g || 0;
        totalFat += item.fat_total_g || 0;
        if (item.name) names.push(item.name);
      }

      return {
        food_name: names.join(" + ") || foodName,
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        serving_size: data.items.length > 1 ? "combined serving" : `${data.items[0]?.serving_size_g || 100}g`
      };
    }

    return null;
  } catch (error) {
    console.error("CalorieNinja error:", error);
    return null;
  }
}

async function estimateWithAI(foodName: string): Promise<any | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not configured");
    return null;
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a nutrition expert. Estimate the nutrition information for foods.
            Always return ONLY a valid JSON object with this exact format (no markdown, no code blocks):
            {
              "food_name": "name of the food",
              "calories": number,
              "protein": number (grams),
              "carbs": number (grams),
              "fat": number (grams),
              "serving_size": "estimated serving size"
            }`
          },
          {
            role: "user",
            content: `Estimate the nutrition information for: ${foodName}`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const textContent = data.choices?.[0]?.message?.content;

    if (!textContent) {
      console.error("No content in AI response");
      return null;
    }

    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not extract JSON from AI response:", textContent);
      return null;
    }

    const nutritionData = JSON.parse(jsonMatch[0]);

    return {
      food_name: nutritionData.food_name || foodName,
      calories: Math.round(Number(nutritionData.calories)),
      protein: Math.round(Number(nutritionData.protein) * 10) / 10,
      carbs: Math.round(Number(nutritionData.carbs) * 10) / 10,
      fat: Math.round(Number(nutritionData.fat) * 10) / 10,
      serving_size: nutritionData.serving_size || "1 serving"
    };
  } catch (error) {
    console.error("AI estimation error:", error);
    return null;
  }
}
