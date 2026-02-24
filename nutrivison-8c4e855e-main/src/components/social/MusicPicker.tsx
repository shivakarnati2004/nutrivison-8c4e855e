import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, Search } from "lucide-react";

const MUSIC_LIBRARY: Record<string, string[]> = {
  "🔥 Trending": [
    "Blinding Lights", "Shape of You", "Levitating", "Anti-Hero", "Flowers",
    "As It Was", "Stay", "Heat Waves", "Bad Guy", "Watermelon Sugar",
  ],
  "🎤 Pop": [
    "Cruel Summer", "Dance The Night", "Vampire", "Espresso", "Paint The Town Red",
    "Karma", "Snooze", "Kill Bill", "Calm Down", "Boy's a Liar",
  ],
  "🎧 Hip Hop": [
    "SICKO MODE", "God's Plan", "Lose Yourself", "Mockingbird", "Lucid Dreams",
    "Sunflower", "Rockstar", "Congratulations", "Mask Off", "XO Tour Llif3",
  ],
  "🎹 EDM": [
    "Faded", "Lean On", "Titanium", "Wake Me Up", "Animals",
    "Levels", "Scary Monsters", "Clarity", "Don't Let Me Down", "Alone",
  ],
  "🧘 Chill": [
    "Someone Like You", "Perfect", "All of Me", "A Thousand Years", "Say Something",
    "Shallow", "Thinking Out Loud", "Love Yourself", "Photograph", "Happier",
  ],
  "💪 Workout": [
    "Stronger", "Eye of the Tiger", "Till I Collapse", "Lose Control", "Power",
    "Remember The Name", "Centuries", "Warriors", "Unstoppable", "Fighter",
  ],
  "🇮🇳 Bollywood": [
    "Tum Hi Ho", "Kesariya", "Chaiyya Chaiyya", "Jai Ho", "Senorita",
    "Raataan Lambiyan", "Apna Bana Le", "Chaleya", "Tere Vaaste", "Jhoome Jo Pathaan",
  ],
  "🎸 Rock": [
    "Thunder", "Believer", "Bohemian Rhapsody", "Sweet Child O' Mine", "Smells Like Teen Spirit",
    "Back In Black", "Stairway to Heaven", "Hotel California", "Wonderwall", "Numb",
  ],
  "🎻 Classical": [
    "Moonlight Sonata", "Canon in D", "Für Elise", "Four Seasons", "Swan Lake",
  ],
  "📚 Lo-fi": [
    "Dreamy Nights", "Rainy Cafe", "Study Session", "Moonlight Walk", "Coffee Shop",
    "Sunset Drive", "Late Night Jazz", "Morning Dew", "Starry Sky", "Gentle Rain",
  ],
  "🎵 Acoustic": [
    "Riptide", "Ho Hey", "I'm Yours", "Banana Pancakes", "Flightless Bird",
    "Fast Car", "Hallelujah", "Wish You Were Here", "Landslide", "Jolene",
  ],
};

interface MusicPickerProps {
  selected: string | null;
  onSelect: (music: string | null) => void;
}

export const MusicPicker = ({ selected, onSelect }: MusicPickerProps) => {
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("🔥 Trending");

  const allSongs = Object.entries(MUSIC_LIBRARY).flatMap(([cat, songs]) =>
    songs.map((s) => ({ category: cat, name: s }))
  );

  const filtered = search.trim()
    ? allSongs.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  return (
    <div className="space-y-3">
      <Label className="text-sm flex items-center gap-2">
        <Music className="h-4 w-4" /> Add Music
      </Label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search songs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {selected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
          <Music className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium flex-1">{selected}</span>
          <button onClick={() => onSelect(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      <div className="max-h-[250px] overflow-y-auto space-y-2 scrollbar-hide">
        {filtered ? (
          <div className="flex flex-wrap gap-2">
            {filtered.map((s) => (
              <button
                key={s.name}
                onClick={() => onSelect(selected === s.name ? null : s.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selected === s.name ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                🎵 {s.name}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground py-2">No songs found</p>}
          </div>
        ) : (
          Object.entries(MUSIC_LIBRARY).map(([category, songs]) => (
            <div key={category}>
              <button
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="w-full text-left text-sm font-semibold py-1.5 px-1 hover:bg-muted/50 rounded"
              >
                {category}
              </button>
              {expandedCategory === category && (
                <div className="flex flex-wrap gap-1.5 pl-1 pb-2">
                  {songs.map((m) => (
                    <button
                      key={m}
                      onClick={() => onSelect(selected === m ? null : m)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        selected === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      🎵 {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};