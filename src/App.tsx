import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Loader2, Film, Settings2, Download, ChevronLeft, Layout, Share2, Eye, EyeOff, Grid3X3, Maximize2 } from "lucide-react";
import { letterboxdService, tmdbService, fanartService, extractRating, extractPosterFromRSS } from "./services/api";
import { DiaryEntry, EditorState, Template, AspectRatio } from "./types";
import { Canvas } from "./components/Editor/Canvas";
import { Sidebar } from "./components/Editor/Sidebar";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<EditorState>({
    username: "",
    entries: [],
    selectedEntry: null,
    template: "Full Bleed",
    aspectRatio: "9:16",
    background: "radial-gradient(circle at top left, #2d1b33 0%, #1e1e3f 100%)",
    accentColor: "#00e054",
    gridColumns: 3,
    showReview: true,
    movieDetails: null,
    curatedEntries: [],
    customPosterUrl: null,
    tmdbPosters: [],
    fanartPosters: [],
    customTitle: "",
  });

  const handleFetchDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    setIsLoading(true);
    setError(null);
    try {
      const feed = await letterboxdService.getDiary(username.trim());
      setState(prev => ({ ...prev, username: username.trim() }));
      
      const items = feed?.items || [];
      const parsedEntries: DiaryEntry[] = items.map((item: any) => {
        // Letterboxd titles are usually "Movie Name, Year - ★★★★"
        const fullTitle = (item.title || "").toString();
        const titleParts = fullTitle.split(", ");
        const movieTitle = titleParts[0] || "Untitled Film";
        const yearMatch = titleParts[1]?.match(/\d{4}/);
        const movieYear = yearMatch ? yearMatch[0] : "";
        
        const content = (item.content || "").toString();
        const snippet = (item.contentSnippet || "").toString();

        return {
          title: fullTitle,
          link: item.link || "",
          pubDate: item.pubDate || new Date().toISOString(),
          content: content,
          rating: extractRating(snippet || content),
          movieTitle,
          movieYear,
          posterUrl: extractPosterFromRSS(content),
        };
      });

      if (parsedEntries.length > 0) {
        handleSelectEntry(parsedEntries[0], parsedEntries);
      } else {
        setState((prev) => ({ ...prev, entries: parsedEntries }));
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.details || "Could not find Letterboxd user. Make sure the profile is public.";
      setError(msg);
      console.error("Diary Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEntry = async (entry: DiaryEntry, allEntries?: DiaryEntry[]) => {
    setState((prev) => ({ 
      ...prev, 
      selectedEntry: entry, 
      movieDetails: null, 
      customPosterUrl: null, 
      tmdbPosters: [],
      fanartPosters: [],
      entries: allEntries || prev.entries
    }));
    
    // Attempt to search TMDB for high-quality metadata
    try {
      const searchResults = await tmdbService.searchMovie(entry.movieTitle);
      if (searchResults && searchResults.results && searchResults.results.length > 0) {
        const bestMatch = searchResults.results[0];
        const details = await tmdbService.getMovie(bestMatch.id);
        
        const tmdbPosters = details.images?.posters?.slice(0, 12).map((p: any) => p.file_path) || [];

        setState((prev) => ({ 
          ...prev, 
          movieDetails: details,
          tmdbPosters: tmdbPosters 
        }));

        // Fetch Fanart.tv posters if TMDB ID exists
        if (details.id) {
          try {
            const fanartData = await fanartService.getMovieImages(details.id);
            if (fanartData && fanartData.movieposter) {
              const fanartPosters = fanartData.movieposter.slice(0, 12).map((p: any) => p.url);
              setState(prev => ({ ...prev, fanartPosters }));
            }
          } catch (err) {
            console.warn("Fanart fetch failed:", err);
          }
        }
      }
    } catch (err) {
      console.warn("TMDB Enrichment Failed (Optional):", err);
    }
  };

  const reset = () => {
    setState((prev) => ({ ...prev, selectedEntry: null, entries: [] }));
    setUsername("");
  };

  if (!state.selectedEntry && state.entries.length === 0) {
    return (
      <div className="min-h-screen bg-[#14181c] text-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#1d232a] to-[#14181c]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 text-center"
        >
          <div className="flex justify-center space-x-1">
            <div className="w-8 h-8 rounded-full bg-[#ff8000]" />
            <div className="w-8 h-8 rounded-full bg-[#00e054]" />
            <div className="w-8 h-8 rounded-full bg-[#00b1f1]" />
          </div>
          <div>
            <h1 className="text-4xl font-bold font-display tracking-tight mb-2">Letterboxd Buddy</h1>
            <p className="text-gray-400">Transform your diary into cinematic graphics.</p>
          </div>

          <form onSubmit={handleFetchDiary} className="relative group">
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Letterboxd Username"
              className="w-full bg-[#242c34] border border-[#303840] rounded-2xl py-4 px-6 pl-14 focus:outline-none focus:ring-2 focus:ring-[#00e054] transition-all group-hover:border-[#444c54]"
            />
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-hover:text-[#00e054] transition-colors" />
            <button
              id="fetch-button"
              type="submit"
              disabled={isLoading || !username}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#00e054] text-black font-bold py-2 px-4 rounded-xl hover:bg-[#00c048] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Fetch"}
            </button>
          </form>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm bg-red-400/10 py-3 rounded-lg border border-red-400/20"
            >
              {error}
            </motion.p>
          )}

          <div className="grid grid-cols-2 gap-4 text-left pt-4">
            <div className="p-4 bg-[#242c34]/50 rounded-2xl border border-white/5">
              <Layout className="w-5 h-5 text-[#00b1f1] mb-2" />
              <h3 className="font-semibold text-sm">Cinematic Templates</h3>
              <p className="text-xs text-gray-500">Perfectly sized for Stories or Feed.</p>
            </div>
            <div className="p-4 bg-[#242c34]/50 rounded-2xl border border-white/5">
              <Grid3X3 className="w-5 h-5 text-[#ff8000] mb-2" />
              <h3 className="font-semibold text-sm">Monthly Wrap-ups</h3>
              <p className="text-xs text-gray-500">Generate 3x3 grids of your month.</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (state.entries.length > 0 && !state.selectedEntry) {
    return (
      <div className="min-h-screen bg-[#14181c] text-white p-6 md:p-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex justify-between items-center">
            <button 
              onClick={reset}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </button>
            <div className="text-right">
              <h2 className="text-xl font-bold">{username}'s Diary</h2>
              <p className="text-sm text-gray-500">Select a film to design</p>
            </div>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {state.entries.slice(0, 15).map((entry, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleSelectEntry(entry)}
                className="group relative aspect-[2/3] bg-[#242c34] rounded-lg overflow-hidden border border-white/5 hover:border-[#00e054]/50 transition-all text-left"
              >
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/60 to-transparent z-10">
                  <h3 className="font-bold text-sm leading-tight line-clamp-2">{entry.movieTitle}</h3>
                  <div className="flex text-[#00e054] mt-1">
                    {"★".repeat(Math.floor(entry.rating || 0))}
                    {(entry.rating || 0) % 1 !== 0 && "½"}
                  </div>
                </div>
                <div className="absolute inset-0 z-0">
                  {entry.posterUrl ? (
                     <img src={entry.posterUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" crossOrigin="anonymous" />
                  ) : (
                    <div className="w-full h-full bg-[#1b2127] flex items-center justify-center opacity-20">
                      <Film className="w-12 h-12" />
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:h-screen bg-[#14181c] text-white flex flex-col md:flex-row-reverse overflow-x-hidden md:overflow-hidden">
      {/* Main Workspace - Canvas (Top on Mobile) */}
      <main className="flex-1 overflow-auto bg-[#0d0f11] flex items-center justify-center p-4 md:p-12 order-1 md:order-2">
        <Canvas state={state} />
      </main>

      {/* Sidebar - Controls (Bottom on Mobile) */}
      <Sidebar 
        state={state} 
        setState={setState} 
        onSelectEntry={handleSelectEntry}
        onBack={() => setState(prev => ({ ...prev, selectedEntry: null, entries: [] }))} 
      />
    </div>
  );
}
