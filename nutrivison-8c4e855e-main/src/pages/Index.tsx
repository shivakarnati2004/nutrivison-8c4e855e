import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, Sparkles, TrendingUp, Calendar } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <nav className="relative container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-display font-bold text-foreground">Nutrivision</h1>
          </div>
          <Link to="/auth">
            <Button variant="outline">Sign In</Button>
          </Link>
        </nav>
        
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                AI-Powered Nutrition Analysis
              </span>
            </div>
            
            <h2 className="font-display font-bold text-5xl md:text-7xl text-foreground animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
              Snap. Analyze.
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                Track Your Health.
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              Upload or capture food photos and get instant nutrition insights powered by advanced AI. 
              Track calories, macros, and your health journey effortlessly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
              <Link to="/auth">
                <Button size="lg" className="gap-2 shadow-glow">
                  <Camera className="h-5 w-5" />
                  Get Started Free
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="font-display font-bold text-3xl md:text-4xl mb-4">
              How It Works
            </h3>
            <p className="text-muted-foreground text-lg">
              Three simple steps to track your nutrition
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-card p-8 rounded-2xl shadow-soft hover:shadow-glow transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-6">
                <Camera className="h-7 w-7 text-white" />
              </div>
              <h4 className="font-display font-semibold text-xl mb-3">
                1. Capture or Upload
              </h4>
              <p className="text-muted-foreground">
                Take a photo of your meal or upload from your gallery. Our AI works with any food image.
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-2xl shadow-soft hover:shadow-glow transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-6">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h4 className="font-display font-semibold text-xl mb-3">
                2. AI Analysis
              </h4>
              <p className="text-muted-foreground">
                Our advanced AI recognizes food items and estimates nutrition data with high accuracy.
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-2xl shadow-soft hover:shadow-glow transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-6">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <h4 className="font-display font-semibold text-xl mb-3">
                3. Track Progress
              </h4>
              <p className="text-muted-foreground">
                View detailed nutrition breakdowns and track your daily intake over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-gradient-hero rounded-3xl p-12 text-center shadow-glow">
            <Calendar className="h-16 w-16 mx-auto mb-6 text-white" />
            <h3 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
              Start Your Health Journey Today
            </h3>
            <p className="text-white/90 text-lg mb-8">
              Join thousands of users tracking their nutrition effortlessly with AI.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="gap-2">
                <Camera className="h-5 w-5" />
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary/30 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Made by <span className="font-medium text-foreground">Shiva Karnati</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
