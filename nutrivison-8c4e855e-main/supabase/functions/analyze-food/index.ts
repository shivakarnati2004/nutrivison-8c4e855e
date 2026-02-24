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
    const { image, userId } = await req.json();

    if (!image || !userId) {
      return new Response(
        JSON.stringify({ error: "Image and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting food analysis for user:", userId);

    // Try Gemini API first
    let nutritionData = await analyzeWithGemini(image);

    // If Gemini fails, try fallback chain
    if (!nutritionData) {
      console.log("Gemini failed, trying fallback chain...");
      const foodName = await classifyWithHuggingFace(image);
      if (foodName) {
        nutritionData = await getNutritionFromCalorieNinja(foodName);
      }
    }

    if (!nutritionData) {
      return new Response(
        JSON.stringify({ error: "Could not analyze the food image. Please try again with a clearer image." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return data without saving - let the client decide to save
    console.log("Analysis complete:", nutritionData);

    return new Response(
      JSON.stringify(nutritionData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in analyze-food function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function analyzeWithGemini(imageData: string): Promise<any | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("GEMINI_API_KEY not configured");
    return null;
  }

  try {
    // Extract base64 data from data URL
    const base64Data = imageData.includes(",") ? imageData.split(",")[1] : imageData;
    const mimeType = imageData.includes("data:") ? imageData.split(";")[0].split(":")[1] : "image/jpeg";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze this food image and provide nutrition information. 
                  
                  Return ONLY a valid JSON object in this exact format (no markdown, no code blocks):
                  {
                    "food_name": "name of the food item",
                    "calories": number (estimated calories per serving),
                    "protein": number (grams of protein),
                    "carbs": number (grams of carbohydrates),
                    "fat": number (grams of fat),
                    "serving_size": "estimated serving size (e.g., '1 cup', '100g', '1 medium')"
                  }
                  
                  If you cannot identify the food, still provide your best estimate based on what you see.
                  All numeric values should be reasonable estimates for a single serving.`
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data));

    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      console.error("No text content in Gemini response");
      return null;
    }

    // Parse the JSON from the response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not extract JSON from Gemini response:", textContent);
      return null;
    }

    const nutritionData = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!nutritionData.food_name || nutritionData.calories === undefined) {
      console.error("Invalid nutrition data structure:", nutritionData);
      return null;
    }

    return {
      food_name: nutritionData.food_name,
      calories: Math.round(Number(nutritionData.calories)),
      protein: Math.round(Number(nutritionData.protein) * 10) / 10,
      carbs: Math.round(Number(nutritionData.carbs) * 10) / 10,
      fat: Math.round(Number(nutritionData.fat) * 10) / 10,
      serving_size: nutritionData.serving_size || "1 serving"
    };
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return null;
  }
}

async function classifyWithHuggingFace(imageData: string): Promise<string | null> {
  const apiKey = Deno.env.get("HUGGINGFACE_API_KEY");
  if (!apiKey) {
    console.error("HUGGINGFACE_API_KEY not configured");
    return null;
  }

  try {
    const base64Data = imageData.includes(",") ? imageData.split(",")[1] : imageData;
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const response = await fetch(
      "https://api-inference.huggingface.co/models/nateraw/food",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/octet-stream"
        },
        body: binaryData
      }
    );

    if (!response.ok) {
      console.error("HuggingFace API error:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("HuggingFace response:", data);

    if (Array.isArray(data) && data.length > 0) {
      // Return the top prediction label
      return data[0].label?.replace(/_/g, " ") || null;
    }

    return null;
  } catch (error) {
    console.error("HuggingFace classification error:", error);
    return null;
  }
}

async function getNutritionFromCalorieNinja(foodName: string): Promise<any | null> {
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
      const item = data.items[0];
      return {
        food_name: item.name || foodName,
        calories: Math.round(item.calories || 0),
        protein: Math.round((item.protein_g || 0) * 10) / 10,
        carbs: Math.round((item.carbohydrates_total_g || 0) * 10) / 10,
        fat: Math.round((item.fat_total_g || 0) * 10) / 10,
        serving_size: `${item.serving_size_g || 100}g`
      };
    }

    return null;
  } catch (error) {
    console.error("CalorieNinja error:", error);
    return null;
  }
}
