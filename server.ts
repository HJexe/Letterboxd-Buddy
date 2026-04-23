import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import axios from "axios";
import Parser from "rss-parser";
import dotenv from "dotenv";

dotenv.config();

const parser = new Parser();
const app = express();

app.use(express.json());

// Proxy for Letterboxd RSS with hardened headers to avoid blocking
app.get("/api/letterboxd/:username", async (req, res) => {
    try {
      let { username } = req.params;
      
      // Clean username aggressively
      username = username.trim().replace(/^@+/, '').split('/')[0].split('?')[0];
      
      // Test both common URL variants
      const urls = [
        `https://letterboxd.com/${username}/rss/`,
        `https://${username}.letterboxd.com/rss/`
      ];

      for (const rssUrl of urls) {
        // List of UA to try in sequence
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Letterboxd/3.0 (iPhone; iOS 17.0; Scale/3.00)',
          'RSS-Parser/3.13.0',
        ];

        for (const [idx, ua] of userAgents.entries()) {
          try {
            const response = await axios.get(rssUrl, {
              headers: {
                'User-Agent': ua,
                'Accept': 'text/xml,application/xml,application/rss+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Referer': 'https://letterboxd.com/',
              },
              timeout: 8000, // Reduced to ensure fast failover
              validateStatus: (status) => status < 500, // Handle 404s gracefully in code
            });
            
            // Check for valid XML/RSS response
            if (response.status === 200 && response.data && typeof response.data === 'string' && response.data.includes('<rss')) {
              const feed = await parser.parseString(response.data);
              return res.status(200).json(feed);
            }
          } catch (error: any) {
            console.warn(`RSS attempt failed for ${username} at ${rssUrl} with ${ua}: ${error.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      return res.status(404).json({ 
        error: "Profile not found or access denied", 
        suggestion: "Make sure the username is correct and the diary is public."
      });
    } catch (err: any) {
      console.error("Fatal error in Letterboxd API:", err);
      return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
  });

  // Image proxy to bypass CORS for html-to-image rendering
  app.get("/api/proxy-image", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).send("Missing URL");
    try {
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'image/webp,image/png,image/jpeg,*/*'
        },
        timeout: 8000
      });
      res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('Access-Control-Allow-Origin', '*'); 
      res.send(response.data);
    } catch (error) {
      console.error("Proxy failed for:", url);
      res.status(500).send("Proxy failed");
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
    const apiKey = process.env.FANART_TV_API || process.env.FANART_API_KEY;

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

  // Static file serving for MPA
  const publicPath = process.cwd();
  app.use('/js', express.static(path.join(publicPath, 'js')));
  app.use('/css', express.static(path.join(publicPath, 'css')));

  // Specific routes for Pages
  app.get('/', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));
  app.get('/gallery', (req, res) => res.sendFile(path.join(publicPath, 'gallery.html')));
  app.get('/editor', (req, res) => res.sendFile(path.join(publicPath, 'editor.html')));

  // Fallback for .html extensions
  app.use(express.static(publicPath, { extensions: ['html'] }));

  if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  export default app;