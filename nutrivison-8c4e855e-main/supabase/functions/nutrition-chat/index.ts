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
    const { message, profile, history } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system prompt with user context
    const systemPrompt = buildSystemPrompt(profile);

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h: any) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in nutrition-chat function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSystemPrompt(profile: any): string {
  const goalDescriptions: Record<string, string> = {
    loseFat: "lose fat and get leaner",
    gainWeight: "gain healthy weight and build muscle",
    maintain: "maintain their current weight and stay healthy",
  };

  const goal = goalDescriptions[profile?.goal] || "improve their nutrition";
  const location = profile?.location || "India";
  const name = profile?.name || "the user";
  const calorieTarget = profile?.dailyCaloriesTarget || 2000;

  return `You are Coach Raju 😈 - a friendly, knowledgeable, and motivating AI nutrition coach for the Nutrivision app.

About the user:
- Name: ${name}
- Goal: ${goal}
- Location: ${location}
- Daily calorie target: ${calorieTarget} kcal

Your personality:
- Friendly and encouraging with a touch of humor
- Use emojis moderately to keep conversations engaging
- Be concise but helpful - aim for 2-3 short paragraphs max
- Reference the user's name occasionally to make it personal

Your expertise:
- Regional food knowledge (especially Indian cuisine like biryani, dosa, dal, etc.)
- Macronutrient calculations and meal planning
- Exercise recommendations for different fitness levels
- Healthy alternatives for local dishes
- Portion control and meal timing

Key behaviors:
1. Always consider the user's goal when giving advice
2. Suggest local/regional foods when relevant to their location
3. Provide specific calorie/macro estimates when discussing foods
4. Be encouraging about progress and understanding about setbacks
5. If asked about medical conditions, recommend consulting a doctor

Example food suggestions based on location (adapt these):
- India: dal chawal, roti sabzi, idli sambar, poha, upma
- South India: dosa, rasam rice, curd rice, vegetable kootu
- North India: paratha, rajma chawal, chole, paneer dishes

Remember: You're a coach, not a doctor. Be supportive but always recommend professional medical advice for health concerns.`;
}
