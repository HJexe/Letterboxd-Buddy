import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import Parser from "rss-parser";
import dotenv from "dotenv";

dotenv.config();

const parser = new Parser();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy for Letterboxd RSS with hardened headers to avoid blocking
  app.get("/api/letterboxd/:username", async (req, res) => {
    const { username } = req.params;
    try {
      // Use axios to fetch with custom headers as Letterboxd blocks default RSS parsers
      const response = await axios.get(`https://letterboxd.com/${username}/rss/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
          'Cache-Control': 'no-cache',
        },
        timeout: 10000, // 10s timeout
      });
      
      const feed = await parser.parseString(response.data);
      res.json(feed);
    } catch (error: any) {
      console.error("RSS Fetch Error for", username, ":", error.message);
      
      // Attempt fallback if direct fetch fails (sometimes https vs http or redirect issues)
      try {
        const fallbackResponse = await axios.get(`https://letterboxd.com/${username}/rss/`, {
          headers: { 'User-Agent': 'Letterboxd/3.0 (iPhone; iOS 17.0; Scale/3.00)' }
        });
        const feed = await parser.parseString(fallbackResponse.data);
        return res.json(feed);
      } catch (fallbackError: any) {
        res.status(500).json({ 
          error: "Failed to fetch Letterboxd feed", 
          details: error.message,
          suggestion: "Letterboxd might be blocking this request. Ensure the username is correct and public."
        });
      }
    }
  });

  // Proxy for TMDB (to keep API key safe and avoid CORS)
  app.get("/api/tmdb/search", async (req, res) => {
    const { query } = req.query;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      // Return empty results instead of crashing if key is missing
      return res.json({ results: [], info: "TMDB API key not configured" });
    }

    try {
      const response = await axios.get("https://api.themoviedb.org/3/search/movie", {
        params: {
          api_key: apiKey,
          query,
        },
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: "TMDB search failed" });
    }
  });

  app.get("/api/tmdb/movie/:id", async (req, res) => {
    const { id } = req.params;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      return res.status(404).json({ error: "TMDB API key not configured" });
    }

    try {
      const response = await axios.get(`https://api.themoviedb.org/3/movie/${id}`, {
        params: {
          api_key: apiKey,
          append_to_response: "images,credits,external_ids",
        },
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(500).json({ error: "TMDB movie fetch failed" });
    }
  });

  app.get("/api/fanart/movie/:id", async (req, res) => {
    const { id } = req.params;
    const apiKey = process.env.FANART_API_KEY;

    if (!apiKey) {
      return res.json({ movieposter: [], info: "Fanart API key not configured" });
    }

    try {
      const response = await axios.get(`https://webservice.fanart.tv/v3/movies/${id}`, {
        params: {
          api_key: apiKey,
        },
      });
      res.json(response.data);
    } catch (error: any) {
      // Fanart returns 404 if movie not found, we should handle gracefully
      res.json({ movieposter: [] });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, we serve from dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
