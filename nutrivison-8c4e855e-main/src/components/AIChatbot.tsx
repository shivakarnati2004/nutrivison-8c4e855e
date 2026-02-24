import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, Send, Loader2, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface AIChatbotProps {
  userId: string;
  profile: {
    name: string;
    goal?: string;
    country?: string;
    state?: string;
    city?: string;
    daily_calories_target?: number;
  };
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AIChatbot = ({ userId, profile }: AIChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Send welcome message
      const welcomeMessage = getWelcomeMessage();
      setMessages([{ role: "assistant", content: welcomeMessage }]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getWelcomeMessage = () => {
    const goalText = profile.goal === "loseFat" 
      ? "lose weight" 
      : profile.goal === "gainWeight" 
      ? "gain weight" 
      : "maintain your health";
    
    const location = [profile.city, profile.state, profile.country].filter(Boolean).join(", ");
    
    return `Hey ${profile.name || "there"}! 😊 I'm **Coach Raju** - your personal nutrition assistant!

I'm here to help you ${goalText}. ${location ? `I see you're from **${location}** - I know some great local dishes we can work with!` : ""}

${profile.daily_calories_target ? `Your daily target is **${profile.daily_calories_target} kcal**. Let's make sure you hit it! 💪` : ""}

Ask me anything about:
- 🍽️ Meal suggestions for your goals
- 🌍 Local/regional food recommendations
- 💪 Exercise tips
- 📊 Nutrition advice

What would you like to know?`;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("nutrition-chat", {
        body: {
          message: userMessage,
          profile: {
            name: profile.name,
            goal: profile.goal,
            location: [profile.city, profile.state, profile.country].filter(Boolean).join(", "),
            dailyCaloriesTarget: profile.daily_calories_target,
          },
          history: messages.slice(-10), // Send last 10 messages for context
        },
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Oops! I had a little hiccup there. 😅 Can you try asking again?" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>

      {/* Chat window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-140px)] shadow-xl z-50 flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-2xl">😈</span>
              <span>Coach Raju</span>
              <span className="text-xs font-normal text-muted-foreground ml-auto">AI Assistant</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="p-3 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Coach Raju..."
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </>
  );
};
