import React, { useState } from "react";
import { ChevronLeft, Layout, Maximize2, Palette, Eye, EyeOff, Check, Plus, Trash2, Search as SearchIcon, X, Loader2, Edit3, Type, Image as ImageIcon, Grid3X3 } from "lucide-react";
import { EditorState, Template, AspectRatio, DiaryEntry } from "../../types";
import { tmdbService } from "../../services/api";
import { motion, AnimatePresence } from "motion/react";

interface SidebarProps {
  state: EditorState;
  setState: React.Dispatch<React.SetStateAction<EditorState>>;
  onSelectEntry: (entry: DiaryEntry) => void;
  onBack: () => void;
}

const TEMPLATES: Template[] = ["Full Bleed", "Minimal Centered", "Monthly", "Custom Grid"];
const RATIOS: AspectRatio[] = ["9:16", "4:5", "1:1"];
const GRADIENT_THEMES = [
  "radial-gradient(circle at top left, #2d1b33 0%, #1e1e3f 100%)", // Wrapup Purple
  "radial-gradient(circle at top left, #3d5a4d 0%, #2b3d34 100%)", // Forest
  "radial-gradient(circle at top left, #244146 0%, #142a2d 100%)", // Peacock
  "radial-gradient(circle at top left, #2b3a4a 0%, #1b2632 100%)", // Indigo
  "radial-gradient(circle at top left, #522d2d 0%, #331a1a 100%)", // Brown
  "radial-gradient(circle at top left, #2a2e48 0%, #1a1c2c 100%)", // Midnight
  "radial-gradient(circle at top left, #242c34 0%, #0d0f11 100%)", // Graphite
  "linear-gradient(to bottom, #111111, #000000)" // Black
];

const ACCENT_COLORS = ["#00e054", "#00b1f1", "#ff8000", "#ff4040", "#ffffff", "#be95ff"];

export const Sidebar = ({ state, setState, onSelectEntry, onBack }: SidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [posterSource, setPosterSource] = useState<"TMDB" | "Fanart">("TMDB");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const res = await tmdbService.searchMovie(searchQuery);
      setSearchResults(res.results.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const addToCurated = (movie: any) => {
    const entry: DiaryEntry = {
      title: movie.title,
      link: "",
      pubDate: new Date().toISOString(),
      content: "",
      rating: Math.round(movie.vote_average / 2),
      movieTitle: movie.title,
      movieYear: movie.release_date?.substring(0, 4),
      posterUrl: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
    };
    setState(prev => ({
      ...prev,
      curatedEntries: [...prev.curatedEntries, entry].slice(0, 9)
    }));
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeFromCurated = (idx: number) => {
    setState(prev => ({
      ...prev,
      curatedEntries: prev.curatedEntries.filter((_, i) => i !== idx)
    }));
  };

  return (
    <aside className="w-full md:w-96 bg-[#1b2127] border-t md:border-t-0 md:border-l border-[#303840] h-auto md:h-screen flex flex-col z-50 order-2 md:order-1 shadow-2xl">
      <div className="p-4 border-b border-[#303840] flex items-center justify-between bg-[#14181c]/50 backdrop-blur-md sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-[#00e054]">Design Studio</h3>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide">
        {/* Template Selector */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <Layout className="w-3.5 h-3.5" />
            Template
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t}
                onClick={() => setState((prev) => ({ ...prev, template: t }))}
                className={`p-4 text-center rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden group ${
                  state.template === t 
                    ? "bg-[#00e054] border-[#00e054] text-black shadow-[0_0_20px_rgba(0,224,84,0.2)]" 
                    : "bg-[#242c34] border-[#303840] text-gray-400 hover:border-gray-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* Custom Grid Controls */}
        {state.template === "Custom Grid" && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
              <Grid3X3 className="w-3.5 h-3.5" />
              Grid Density
            </div>
            <div className="flex gap-2">
              {[2, 3].map((cols) => (
                <button
                  key={cols}
                  onClick={() => setState(prev => ({ ...prev, gridColumns: cols as 2 | 3 }))}
                  className={`flex-1 py-3 text-xs font-black rounded-xl border transition-all ${
                    state.gridColumns === cols 
                      ? "bg-[#00b1f1]/10 border-[#00b1f1] text-[#00b1f1]" 
                      : "bg-[#242c34] border-[#303840] text-gray-400"
                  }`}
                >
                  {cols} Columns
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Poster Selector */}
        {(state.tmdbPosters.length > 0 || state.fanartPosters.length > 0) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
                <ImageIcon className="w-3.5 h-3.5" />
                Poster Selection
              </div>
              <div className="flex bg-black/20 rounded-lg p-0.5">
                <button 
                  onClick={() => setPosterSource("TMDB")}
                  className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${posterSource === "TMDB" ? "bg-[#1b2127] text-white shadow" : "text-gray-500"}`}
                >TMDB</button>
                <button 
                  onClick={() => setPosterSource("Fanart")}
                  className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${posterSource === "Fanart" ? "bg-[#1b2127] text-white shadow" : "text-gray-500"}`}
                >Fanart.tv</button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
              {(posterSource === "TMDB" ? state.tmdbPosters : state.fanartPosters).map((url, idx) => {
                const fullUrl = posterSource === "TMDB" ? `https://image.tmdb.org/t/p/w500${url}` : url;
                return (
                  <button
                    key={idx}
                    onClick={() => setState(prev => ({ ...prev, customPosterUrl: fullUrl }))}
                    className={`aspect-[2/3] rounded overflow-hidden border-2 transition-all ${
                      state.customPosterUrl === fullUrl ? "border-[#00e054]" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={fullUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                );
              })}
              {(posterSource === "Fanart" && state.fanartPosters.length === 0) && (
                <div className="col-span-4 py-8 text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest italic">
                  No posters found on Fanart.tv
                </div>
              )}
            </div>
          </section>
        )}

        {/* Accent Colors */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <Palette className="w-3.5 h-3.5" />
            Accent Color
          </div>
          <div className="flex flex-wrap gap-2.5">
            {ACCENT_COLORS.map((c, idx) => (
              <button
                key={idx}
                onClick={() => setState((prev) => ({ ...prev, accentColor: c }))}
                className={`w-9 h-9 rounded-full border-2 transition-all transform hover:scale-110 active:scale-95 shadow-lg ${
                  state.accentColor === c ? "border-white scale-110 ring-2 ring-white/20" : "border-black/20"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </section>

        {/* Custom Wrapup Flow */}
        {(state.template === "Custom Grid" || state.template === "Monthly") && (
          <section className="space-y-5 p-4 bg-black/20 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <Plus className="w-3.5 h-3.5" />
                Curate Films
              </div>
              <button 
                onClick={() => setState(prev => ({ ...prev, curatedEntries: [] }))}
                className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-[#242c34] rounded-lg px-3 py-2 border border-white/5">
                <Type className="w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Custom Title..."
                  value={state.customTitle}
                  onChange={(e) => setState(prev => ({ ...prev, customTitle: e.target.value }))}
                  className="bg-transparent text-xs outline-none flex-1 placeholder:text-gray-600 font-bold"
                />
              </div>

              <form onSubmit={handleSearch} className="relative group">
                <input 
                  type="text"
                  placeholder="Search to add film..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#14181c] border border-white/5 rounded-lg py-2.5 px-4 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-[#00e054] transition-all"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-[#00e054]">
                  {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SearchIcon className="w-3.5 h-3.5" />}
                </button>
              </form>

              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-1 bg-[#14181c] rounded-lg border border-white/5 p-1"
                  >
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => addToCurated(m)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded text-left transition-colors"
                      >
                        <div className="w-8 h-12 bg-[#242c34] rounded overflow-hidden">
                          {m.poster_path && <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-white truncate uppercase">{m.title}</p>
                          <p className="text-[8px] text-gray-500">{m.release_date?.substring(0, 4)}</p>
                        </div>
                        <Plus className="w-3 h-3 text-[#00e054]" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-5 gap-2 pt-2 overflow-x-auto scrollbar-hide">
                {state.curatedEntries.map((e, idx) => (
                  <div key={idx} className="relative group aspect-[2/3] flex-shrink-0 bg-[#14181c] rounded border border-white/10 overflow-hidden">
                    <img src={e.posterUrl} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeFromCurated(idx)}
                      className="absolute inset-0 bg-red-500/80 items-center justify-center hidden group-hover:flex transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Standard Design Controls */}
        <div className="space-y-8">
           <section className="space-y-4">
              <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
                <Layout className="w-3.5 h-3.5" />
                Recent Watches
              </div>
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                {state.entries.slice(0, 10).map((entry, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectEntry(entry)}
                    className={`flex-shrink-0 w-14 aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                      state.selectedEntry?.movieTitle === entry.movieTitle 
                        ? "border-[#00e054] scale-110 shadow-2xl shadow-[#00e054]/20 z-10" 
                        : "border-transparent opacity-40 hover:opacity-100"
                    }`}
                  >
                    <img src={entry.posterUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
           </section>

           <section className="space-y-4">
              <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
                <Palette className="w-3.5 h-3.5" />
                Background Gradient
              </div>
              <div className="grid grid-cols-4 gap-3">
                {GRADIENT_THEMES.map((g, idx) => (
                  <button
                    key={idx}
                    onClick={() => setState((prev) => ({ ...prev, background: g }))}
                    className={`w-full aspect-square rounded-full border-2 transition-all transform hover:scale-110 active:scale-95 shadow-lg ${
                      state.background === g ? "border-[#00e054] ring-2 ring-[#00e054]/20" : "border-black/50"
                    }`}
                    style={{ background: g }}
                  >
                    {state.background === g && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
           </section>

           <section className="space-y-4">
              <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
                <Maximize2 className="w-3.5 h-3.5" />
                Dimensions
              </div>
              <div className="flex gap-2 p-1 bg-black/20 rounded-xl">
                {RATIOS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setState((prev) => ({ ...prev, aspectRatio: r }))}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                      state.aspectRatio === r 
                        ? "bg-[#1b2127] text-[#00b1f1] shadow-lg border border-white/5" 
                        : "text-gray-500 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
           </section>

           <section className="space-y-2">
              <button
                onClick={() => setShowReviewModal(true)}
                className="w-full bg-[#1b2127] hover:bg-[#242c34] text-white p-4 rounded-xl border border-white/5 flex items-center justify-between transition-all group"
              >
                 <div className="flex items-center gap-3">
                   <Edit3 className="w-4 h-4 text-[#ff8000]" />
                   <span className="text-xs font-bold uppercase tracking-widest">Edit Review Text</span>
                 </div>
                 <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3 h-3" />
                 </div>
              </button>
              
              <button
                onClick={() => setState((prev) => ({ ...prev, showReview: !prev.showReview }))}
                className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                  state.showReview 
                    ? "bg-[#ff8000]/10 border-[#ff8000]/20 text-[#ff8000]" 
                    : "bg-[#242c34] border-[#303840] text-gray-400"
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-widest">Display Review</span>
                {state.showReview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
           </section>
        </div>
      </div>

      <div className="p-6 bg-[#14181c] border-t border-[#303840]">
        <div className="flex items-center space-x-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
          <div className="w-4 h-4 rounded-full bg-[#00e054] shadow-[0_0_8px_#00e054]" />
          <p>Real-time Studio active</p>
        </div>
      </div>

      {/* Review Edit Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-[#1b2127] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#14181c]/50">
              <div className="flex items-center gap-3">
                <Edit3 className="w-5 h-5 text-[#ff8000]" />
                <h3 className="font-bold text-sm uppercase tracking-[0.2em]">Edit Film Review</h3>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Selected Film</label>
                <div className="p-4 bg-black/20 rounded-xl border border-white/5 font-bold text-white uppercase tracking-tighter">
                  {state.selectedEntry?.movieTitle}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Review Text</label>
                <textarea 
                  className="w-full h-48 bg-[#14181c] rounded-2xl p-6 text-sm text-white/90 border border-white/5 focus:ring-1 focus:ring-[#ff8000] outline-none transition-all placeholder:text-white/10 italic leading-relaxed"
                  placeholder="Share your thoughts on the film..."
                  value={state.selectedEntry?.content || ""}
                  onChange={(e) => {
                    const newEntry = state.selectedEntry ? { ...state.selectedEntry, content: e.target.value } : null;
                    setState(prev => ({ ...prev, selectedEntry: newEntry }));
                  }}
                />
              </div>
              <button 
                onClick={() => setShowReviewModal(false)}
                className="w-full py-4 bg-[#ff8000] text-white font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-[#e67300] transition-colors shadow-2xl shadow-[#ff8000]/20"
              >
                Save Layout
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </aside>
  );
};
