import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Smile, Search, Clock, Heart, PartyPopper, ThumbsUp, Flame, Sparkles, Dog, UtensilsCrossed, Dumbbell, TreePine, Hand } from "lucide-react";

interface StickerGifPickerProps {
  onSelect: (content: string, type: "sticker" | "gif") => void;
  onClose: () => void;
}

const STICKER_PACKS: Record<string, { emoji: string; name: string }[]> = {
  popular: [
    { emoji: "👍", name: "thumbsUp" }, { emoji: "❤️", name: "heart" }, { emoji: "🔥", name: "fire" },
    { emoji: "😂", name: "laugh" }, { emoji: "💯", name: "100" }, { emoji: "👏", name: "clap" },
    { emoji: "🚀", name: "rocket" }, { emoji: "⭐", name: "star" }, { emoji: "🙌", name: "raised_hands" },
    { emoji: "💪", name: "muscle" }, { emoji: "🎉", name: "party" }, { emoji: "✨", name: "sparkles" },
    { emoji: "🤩", name: "starEyes" }, { emoji: "😱", name: "shocked" }, { emoji: "🫡", name: "salute" },
    { emoji: "🤌", name: "pinched" },
  ],
  love: [
    { emoji: "❤️", name: "redHeart" }, { emoji: "💖", name: "sparklingHeart" }, { emoji: "😍", name: "heartEyes" },
    { emoji: "💋", name: "kiss" }, { emoji: "🤗", name: "hug" }, { emoji: "🌹", name: "roses" },
    { emoji: "💕", name: "twoHearts" }, { emoji: "💗", name: "growingHeart" }, { emoji: "💝", name: "heartRibbon" },
    { emoji: "💘", name: "heartArrow" }, { emoji: "😘", name: "blowingKiss" }, { emoji: "🥰", name: "smilingHearts" },
    { emoji: "💞", name: "revolving" }, { emoji: "💓", name: "beating" }, { emoji: "❣️", name: "exclamation" },
    { emoji: "🫶", name: "heartHands" },
  ],
  faces: [
    { emoji: "😀", name: "grin" }, { emoji: "😃", name: "smile" }, { emoji: "😄", name: "bigSmile" },
    { emoji: "😁", name: "beaming" }, { emoji: "😆", name: "squint" }, { emoji: "😅", name: "sweat" },
    { emoji: "🤣", name: "rofl" }, { emoji: "😊", name: "blush" }, { emoji: "😇", name: "halo" },
    { emoji: "🙂", name: "slight" }, { emoji: "😉", name: "wink" }, { emoji: "😌", name: "relieved" },
    { emoji: "😏", name: "smirk" }, { emoji: "😒", name: "unamused" }, { emoji: "😞", name: "disappointed" },
    { emoji: "😔", name: "pensive" }, { emoji: "😟", name: "worried" }, { emoji: "😕", name: "confused" },
    { emoji: "😤", name: "angry" }, { emoji: "😢", name: "cry" }, { emoji: "😭", name: "sob" },
    { emoji: "😱", name: "scream" }, { emoji: "😳", name: "flushed" }, { emoji: "🥺", name: "pleading" },
  ],
  hands: [
    { emoji: "👍", name: "thumbsUp" }, { emoji: "👎", name: "thumbsDown" }, { emoji: "👌", name: "ok" },
    { emoji: "✌️", name: "peace" }, { emoji: "🤞", name: "crossed" }, { emoji: "🤟", name: "lovYou" },
    { emoji: "🤘", name: "rock" }, { emoji: "🤙", name: "callMe" }, { emoji: "👋", name: "wave" },
    { emoji: "🙏", name: "pray" }, { emoji: "🤝", name: "handshake" }, { emoji: "💪", name: "muscle" },
    { emoji: "👊", name: "fist" }, { emoji: "✊", name: "raisedFist" }, { emoji: "🫰", name: "snap" },
    { emoji: "🫵", name: "point" }, { emoji: "👆", name: "up" }, { emoji: "👇", name: "down" },
    { emoji: "👈", name: "left" }, { emoji: "👉", name: "right" }, { emoji: "🖐️", name: "hand" },
    { emoji: "🤌", name: "pinched" }, { emoji: "🫶", name: "heartHands" }, { emoji: "🤲", name: "palmsUp" },
  ],
  animals: [
    { emoji: "🐶", name: "dog" }, { emoji: "🐱", name: "cat" }, { emoji: "🐻", name: "bear" },
    { emoji: "🐵", name: "monkey" }, { emoji: "🦁", name: "lion" }, { emoji: "🐯", name: "tiger" },
    { emoji: "🦊", name: "fox" }, { emoji: "🐰", name: "rabbit" }, { emoji: "🐸", name: "frog" },
    { emoji: "🐧", name: "penguin" }, { emoji: "🦋", name: "butterfly" }, { emoji: "🦄", name: "unicorn" },
    { emoji: "🐼", name: "panda" }, { emoji: "🐨", name: "koala" }, { emoji: "🦅", name: "eagle" },
    { emoji: "🐬", name: "dolphin" }, { emoji: "🦈", name: "shark" }, { emoji: "🐙", name: "octopus" },
    { emoji: "🦖", name: "trex" }, { emoji: "🐝", name: "bee" },
  ],
  food: [
    { emoji: "🍕", name: "pizza" }, { emoji: "🍔", name: "burger" }, { emoji: "🌮", name: "taco" },
    { emoji: "🍣", name: "sushi" }, { emoji: "☕", name: "coffee" }, { emoji: "🍺", name: "beer" },
    { emoji: "🍿", name: "popcorn" }, { emoji: "🍩", name: "donut" }, { emoji: "🍪", name: "cookie" },
    { emoji: "🎂", name: "cake" }, { emoji: "🍦", name: "iceCream" }, { emoji: "🍫", name: "chocolate" },
    { emoji: "🍎", name: "apple" }, { emoji: "🍌", name: "banana" }, { emoji: "🥑", name: "avocado" },
    { emoji: "🥗", name: "salad" }, { emoji: "🍗", name: "chicken" }, { emoji: "🍳", name: "egg" },
    { emoji: "🥤", name: "drink" }, { emoji: "🧋", name: "boba" },
  ],
  sports: [
    { emoji: "🏃", name: "running" }, { emoji: "🚴", name: "cycling" }, { emoji: "🏋️", name: "weightlifting" },
    { emoji: "🧘", name: "yoga" }, { emoji: "⚽", name: "soccer" }, { emoji: "🏀", name: "basketball" },
    { emoji: "🏈", name: "football" }, { emoji: "⚾", name: "baseball" }, { emoji: "🎾", name: "tennis" },
    { emoji: "🏊", name: "swimming" }, { emoji: "🥊", name: "boxing" }, { emoji: "🏆", name: "trophy" },
    { emoji: "🥇", name: "gold" }, { emoji: "🎯", name: "target" }, { emoji: "🏄", name: "surfing" },
    { emoji: "⛷️", name: "skiing" }, { emoji: "🤸", name: "cartwheel" }, { emoji: "🏓", name: "pingPong" },
  ],
  nature: [
    { emoji: "🌅", name: "sunrise" }, { emoji: "🌄", name: "mountain" }, { emoji: "🌈", name: "rainbow" },
    { emoji: "🌊", name: "wave" }, { emoji: "🌸", name: "cherry" }, { emoji: "🌺", name: "hibiscus" },
    { emoji: "🌻", name: "sunflower" }, { emoji: "🌙", name: "moon" }, { emoji: "⭐", name: "star" },
    { emoji: "🌍", name: "earth" }, { emoji: "🔥", name: "fire" }, { emoji: "❄️", name: "snow" },
    { emoji: "☀️", name: "sun" }, { emoji: "🌪️", name: "tornado" }, { emoji: "🍀", name: "clover" },
    { emoji: "🌵", name: "cactus" }, { emoji: "🌴", name: "palm" }, { emoji: "🏔️", name: "snowMountain" },
  ],
  celebrations: [
    { emoji: "🎉", name: "party" }, { emoji: "🎊", name: "confetti" }, { emoji: "🏆", name: "trophy" },
    { emoji: "🥇", name: "medal" }, { emoji: "🍾", name: "champagne" }, { emoji: "🎂", name: "cake" },
    { emoji: "🎈", name: "balloon" }, { emoji: "🎁", name: "gift" }, { emoji: "🥳", name: "partyFace" },
    { emoji: "🌟", name: "glowingStar" }, { emoji: "🎯", name: "target" }, { emoji: "💫", name: "dizzy" },
    { emoji: "🎆", name: "fireworks" }, { emoji: "🎇", name: "sparkler" }, { emoji: "🪅", name: "pinata" },
    { emoji: "🎵", name: "music" },
  ],
  funny: [
    { emoji: "🤣", name: "rofl" }, { emoji: "💀", name: "skull" }, { emoji: "🤡", name: "clown" },
    { emoji: "🙃", name: "upsideDown" }, { emoji: "🤪", name: "zany" }, { emoji: "🤯", name: "mindBlown" },
    { emoji: "😜", name: "wink" }, { emoji: "🤓", name: "nerd" }, { emoji: "😈", name: "devil" },
    { emoji: "👻", name: "ghost" }, { emoji: "🤠", name: "cowboy" }, { emoji: "😹", name: "catLaugh" },
    { emoji: "🫠", name: "melting" }, { emoji: "🥴", name: "woozy" }, { emoji: "🤑", name: "moneyFace" },
    { emoji: "💩", name: "poop" },
  ],
};

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  popular: Flame,
  love: Heart,
  faces: Smile,
  hands: Hand,
  animals: Dog,
  food: UtensilsCrossed,
  sports: Dumbbell,
  nature: TreePine,
  celebrations: PartyPopper,
  funny: Sparkles,
};

const GIPHY_API_KEY = "GlVGYHkr3WSBnllca54iNt0yFbjz7L65"; // Giphy public beta key

export const StickerGifPicker = ({ onSelect, onClose }: StickerGifPickerProps) => {
  const [activeTab, setActiveTab] = useState("stickers");
  const [stickerCategory, setStickerCategory] = useState("popular");
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<{ url: string; preview: string }[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [recentStickers, setRecentStickers] = useState<string[]>([]);
  const [recentGifs, setRecentGifs] = useState<string[]>([]);

  useEffect(() => {
    const savedStickers = localStorage.getItem("recentStickers");
    const savedGifs = localStorage.getItem("recentGifs");
    if (savedStickers) setRecentStickers(JSON.parse(savedStickers));
    if (savedGifs) setRecentGifs(JSON.parse(savedGifs));
  }, []);

  const fetchGifs = useCallback(async (query: string) => {
    setLoadingGifs(true);
    try {
      const endpoint = query
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;
      const res = await fetch(endpoint);
      const data = await res.json();
      const results = data.data?.map((g: any) => ({
        url: g.images.original.url,
        preview: g.images.fixed_width_small.url || g.images.fixed_width.url,
      })) || [];
      setGifs(results);
    } catch (err) {
      console.error("Giphy fetch error:", err);
    } finally {
      setLoadingGifs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "gifs") {
      fetchGifs(gifSearch);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "gifs") return;
    const timer = setTimeout(() => {
      fetchGifs(gifSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [gifSearch]);

  const saveRecentSticker = (emoji: string) => {
    const updated = [emoji, ...recentStickers.filter((s) => s !== emoji)].slice(0, 12);
    setRecentStickers(updated);
    localStorage.setItem("recentStickers", JSON.stringify(updated));
  };

  const saveRecentGif = (url: string) => {
    const updated = [url, ...recentGifs.filter((g) => g !== url)].slice(0, 8);
    setRecentGifs(updated);
    localStorage.setItem("recentGifs", JSON.stringify(updated));
  };

  const handleStickerSelect = (emoji: string) => {
    saveRecentSticker(emoji);
    onSelect(emoji, "sticker");
    onClose();
  };

  const handleGifSelect = (url: string) => {
    saveRecentGif(url);
    onSelect(url, "gif");
    onClose();
  };

  return (
    <div className="w-[320px] bg-card border rounded-xl shadow-lg overflow-hidden animate-scale-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
          <TabsTrigger value="stickers" className="gap-2">
            <Smile className="h-4 w-4" />
            Stickers
          </TabsTrigger>
          <TabsTrigger value="gifs" className="gap-2">
            <Sparkles className="h-4 w-4" />
            GIFs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stickers" className="m-0">
          <div className="flex gap-1 p-2 border-b overflow-x-auto">
            {recentStickers.length > 0 && (
              <button
                onClick={() => setStickerCategory("recent")}
                className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                  stickerCategory === "recent" ? "bg-primary/20" : "hover:bg-muted"
                }`}
                title="Recent"
              >
                <Clock className="h-4 w-4" />
              </button>
            )}
            {Object.keys(STICKER_PACKS).map((category) => {
              const Icon = CATEGORY_ICONS[category];
              return (
                <button
                  key={category}
                  onClick={() => setStickerCategory(category)}
                  className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                    stickerCategory === category ? "bg-primary/20" : "hover:bg-muted"
                  }`}
                  title={category.charAt(0).toUpperCase() + category.slice(1)}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          <ScrollArea className="h-[240px]">
            <div className="grid grid-cols-5 gap-1 p-2">
              {stickerCategory === "recent"
                ? recentStickers.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => handleStickerSelect(emoji)}
                      className="text-2xl p-2 rounded-lg hover:bg-muted transition-all hover:scale-110 active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))
                : STICKER_PACKS[stickerCategory]?.map((sticker, index) => (
                    <button
                      key={index}
                      onClick={() => handleStickerSelect(sticker.emoji)}
                      className="text-2xl p-2 rounded-lg hover:bg-muted transition-all hover:scale-110 active:scale-95"
                      title={sticker.name}
                    >
                      {sticker.emoji}
                    </button>
                  ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="gifs" className="m-0">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search GIFs..."
                value={gifSearch}
                onChange={(e) => setGifSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="h-[240px]">
            {recentGifs.length > 0 && !gifSearch && (
              <div className="p-2 border-b">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Recent
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {recentGifs.slice(0, 4).map((url, index) => (
                    <button
                      key={index}
                      onClick={() => handleGifSelect(url)}
                      className="rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
                    >
                      <img src={url} alt="GIF" className="w-full h-20 object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {gifSearch ? "Results" : "Trending"}
              </p>
              {loadingGifs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : gifs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No GIFs found</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {gifs.map((gif, index) => (
                    <button
                      key={index}
                      onClick={() => handleGifSelect(gif.url)}
                      className="rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
                    >
                      <img src={gif.preview} alt="GIF" className="w-full h-20 object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
