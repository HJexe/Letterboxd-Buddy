import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Film, Loader2 } from "lucide-react";
import { EditorState } from "../../types";
import { motion } from "motion/react";

interface CanvasProps {
  state: EditorState;
}

export const Canvas = ({ state }: CanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const entry = state.selectedEntry;
  const details = state.movieDetails;

  const downloadImage = async () => {
    if (!canvasRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      // Step 1: Attempt high-quality capture with high pixel ratio
      const dataUrl = await toPng(canvasRef.current, { 
        quality: 1.0, 
        pixelRatio: 2,
        cacheBust: true,
        // Using includeGraphics or similar isn't standard for toPng but we keep it safe
        style: {
          transform: 'scale(1)',
        },
      });
      
      const link = document.createElement("a");
      link.download = `letterboxd-${entry?.movieTitle.toLowerCase().replace(/\s+/g, "-") || 'wrapup'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.warn("Standard download failed, attempting stable fallback:", err);
      
      try {
        // Step 2: Fallback to more stable options (skip fonts, no cache bust)
        const fallbackUrl = await toPng(canvasRef.current!, { 
          quality: 0.95, 
          pixelRatio: 2,
          skipFonts: true, // This bypasses the cross-origin stylesheet issue entirely
          cacheBust: true,
        });
        
        const link = document.createElement("a");
        link.download = `letterboxd-${entry?.movieTitle.toLowerCase().replace(/\s+/g, "-") || 'wrapup'}-fixed.png`;
        link.href = fallbackUrl;
        link.click();
      } catch (retryErr: any) {
        console.error("Critical download failure:", retryErr);
        alert("We encountered an issue generating your image. Try taking a screenshot or using Chrome for better results.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const getAspectRatioClass = () => {
    switch (state.aspectRatio) {
      case "9:16": return "aspect-[9/16] w-full max-w-[400px]";
      case "4:5": return "aspect-[4/5] w-full max-w-[500px]";
      case "1:1": return "aspect-[1/1] w-full max-w-[500px]";
      default: return "aspect-[9/16]";
    }
  };

  const posterUrl = state.customPosterUrl 
    || (details?.poster_path ? `https://image.tmdb.org/t/p/w780${details.poster_path}` : entry?.posterUrl);

  const backdropUrl = details?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
    : null;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-[1200px]">
      <motion.div 
        layout
        className="flex flex-col items-center w-full"
      >
        <div 
          id="export-canvas"
          ref={canvasRef}
          className={`${getAspectRatioClass()} bg-[#14181c] relative overflow-hidden shadow-2xl rounded-2xl flex flex-col`}
          style={{ background: state.background }}
        >
          {/* Template Content */}
          {state.template === "Full Bleed" && (
            <>
              {posterUrl && (
                <img 
                  src={posterUrl} 
                  alt={entry?.movieTitle} 
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              )}
              <div 
                className="absolute inset-0 z-10"
                style={{ background: `linear-gradient(to bottom, transparent 40%, ${state.background.includes('radial') ? 'rgba(0,0,0,0.8)' : state.background} 95%)` }}
              />
              <div className="absolute bottom-0 inset-x-0 p-8 z-20 space-y-4">
                <div className="space-y-1">
                  <h1 className="text-4xl font-bold font-display tracking-tight leading-tight">
                    {entry?.movieTitle}
                  </h1>
                  <p className="text-xl font-medium opacity-60">
                    {entry?.movieYear} {details?.runtime ? `• ${details.runtime}m` : ""}
                  </p>
                </div>
                
                <div className="flex text-3xl" style={{ color: "#00e054" }}>
                  {"★".repeat(Math.floor(entry?.rating || 0))}
                  {(entry?.rating || 0) % 1 !== 0 && "½"}
                </div>

                {state.showReview && entry?.content && (
                  <div className="bg-black/20 backdrop-blur-md p-4 rounded-xl border border-white/10 text-sm leading-relaxed max-h-32 overflow-hidden italic font-light">
                    "{entry.content.replace(/<[^>]*>/g, "").substring(0, 200)}..."
                  </div>
                )}
              </div>
            </>
          )}

          {state.template === "Minimal Centered" && (
            <div className="h-full w-full flex flex-col items-center justify-center p-12 text-center space-y-12 relative">
               <div className="w-1/2 aspect-[2/3] rounded-lg shadow-2xl shadow-black/50 overflow-hidden border border-white/10 transform hover:scale-105 transition-transform duration-500">
                 {posterUrl ? (
                    <img src={posterUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                 ) : (
                    <div className="w-full h-full bg-[#242c34]" />
                 )}
               </div>
               <div className="space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tighter text-white drop-shadow-sm font-display">
                      {entry?.movieTitle}
                    </h1>
                    <div className="w-12 h-[1px] mx-auto opacity-30" style={{ backgroundColor: state.accentColor }} />
                    <p className="text-sm opacity-50 uppercase tracking-[0.2em] font-medium">{entry?.movieYear}</p>
                  </div>
                  <div className="flex justify-center text-2xl" style={{ color: state.accentColor }}>
                    {"★".repeat(Math.floor(entry?.rating || 0))}
                    {(entry?.rating || 0) % 1 !== 0 && "½"}
                  </div>
               </div>
               
               {state.showReview && entry?.content && (
                  <div className="max-w-xs mx-auto text-xs opacity-60 italic font-light leading-relaxed">
                    "{entry.content.replace(/<[^>]*>/g, "").substring(0, 150)}..."
                  </div>
               )}

               <div className="absolute top-10 right-10">
                  <div className="flex space-x-1 opacity-40">
                    <div className="w-2 h-2 rounded-full bg-[#ff8000]" />
                    <div className="w-2 h-2 rounded-full bg-[#00e054]" />
                    <div className="w-2 h-2 rounded-full bg-[#00b1f1]" />
                  </div>
               </div>
            </div>
          )}

          {state.template === "Monthly" && (
            <div className="h-full w-full p-10 flex flex-col relative z-20">
              <div className="flex justify-between items-start mb-12">
                <div className="space-y-1">
                   <div className="flex space-x-1 mb-2 opacity-80">
                      <div className="w-2 h-2 rounded-full bg-[#ff8000]" />
                      <div className="w-2 h-2 rounded-full bg-[#00e054]" />
                      <div className="w-2 h-2 rounded-full bg-[#00b1f1]" />
                   </div>
                   <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                    {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date())}
                  </h1>
                </div>
                <div className="text-right opacity-60">
                   <p className="text-[10px] font-bold tracking-widest uppercase mb-1">LETTERBOXD</p>
                   <p className="text-sm font-black uppercase leading-none">{state.username}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 flex-1">
                {state.entries.slice(0, 9).map((e, i) => (
                  <div key={i} className="space-y-2">
                    <div className="bg-[#242c34] rounded-sm overflow-hidden aspect-[2/3] border border-white/10 shadow-lg relative">
                      {e.posterUrl ? (
                         <img src={e.posterUrl} className="w-full h-full object-cover" alt={e.movieTitle} referrerPolicy="no-referrer" crossOrigin="anonymous" />
                      ) : (
                        <div className="w-full h-full bg-black/20" />
                      )}
                    </div>
                    <div className="flex text-[8px] justify-center" style={{ color: state.accentColor }}>
                      {"★".repeat(Math.floor(e.rating || 0))}
                      {(e.rating || 0) % 1 !== 0 && "½"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.template === "Custom Grid" ? (
            <div className="h-full w-full p-10 flex flex-col relative z-20">
              <header className="flex justify-between items-end mb-10">
                <div className="space-y-1">
                   <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-2">CINEMA ARCHIVE</p>
                   <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
                    {state.customTitle || "MY WATCHLIST"}
                  </h1>
                </div>
                <div className="flex space-x-1 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff8000]" />
                  <div className="w-3 h-3 rounded-full bg-[#00e054]" />
                  <div className="w-3 h-3 rounded-full bg-[#00b1f1]" />
                </div>
              </header>
              <div className={`grid ${state.gridColumns === 2 ? "grid-cols-2" : "grid-cols-3"} gap-4 flex-1`}>
                {(state.curatedEntries.length > 0 ? state.curatedEntries : state.entries).slice(0, state.gridColumns === 2 ? 6 : 9).map((e, i) => (
                  <div key={i} className="space-y-3">
                    <div className="bg-[#242c34] rounded-md overflow-hidden aspect-[2/3] border border-white/10 shadow-2xl relative group">
                      {e.posterUrl ? (
                         <img 
                            src={e.posterUrl} 
                            className="w-full h-full object-cover" 
                            alt={e.movieTitle} 
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                         />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center opacity-20">
                           <Film className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                         <span className="text-[8px] font-bold uppercase tracking-widest">{e.movieTitle}</span>
                      </div>
                    </div>
                    <div className="flex text-[10px] justify-center" style={{ color: state.accentColor }}>
                      {"★".repeat(Math.floor(e.rating || 0))}
                      {(e.rating || 0) % 1 !== 0 && "½"}
                    </div>
                  </div>
                ))}
              </div>
              <footer className="mt-10 pt-6 border-t border-white/10 flex justify-between items-center bg-black/10 -mx-10 px-10">
                <div className="flex space-x-8">
                  <div>
                    <p className="text-[8px] font-bold opacity-30 uppercase tracking-widest mb-1">WATCHED</p>
                    <p className="text-xl font-black tracking-tighter">{(state.curatedEntries.length > 0 ? state.curatedEntries : state.entries).length}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold opacity-30 uppercase tracking-widest mb-1">AVG RATING</p>
                    <p className="text-xl font-black tracking-tighter" style={{ color: state.accentColor }}>
                      {((state.curatedEntries.length > 0 ? state.curatedEntries : state.entries).reduce((acc, curr) => acc + (curr.rating || 0), 0) / 
                        Math.max((state.curatedEntries.length > 0 ? state.curatedEntries : state.entries).length, 1)).toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="text-right opacity-40">
                  <p className="text-[8px] font-black tracking-widest leading-none">LETTERBOXD</p>
                  <p className="text-[10px] font-bold uppercase">{state.username}</p>
               </div>
              </footer>
            </div>
          ) : null}

          {/* User Branding (Official Logo Style) */}
          {(state.template !== "Monthly" && state.template !== "Custom Grid") && (
            <div className="absolute top-8 left-10 z-30 flex items-center space-x-3">
              <div className="flex space-x-1">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff8000]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#00e054]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#00b1f1]" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-black tracking-[0.2em] text-white opacity-40">LETTERBOXD</span>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{state.username}</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <button
        onClick={downloadImage}
        disabled={isDownloading}
        className="flex items-center gap-2 bg-[#00e054] text-black font-bold py-4 px-10 rounded-2xl hover:bg-[#00c048] hover:scale-105 transition-all shadow-xl shadow-[#00e054]/20 disabled:opacity-50 disabled:cursor-not-allowed mb-8 md:mb-0"
      >
        {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
        {isDownloading ? "Generating..." : "Download Image"}
      </button>
    </div>
  );
};
