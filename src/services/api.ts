import axios from "axios";

export const letterboxdService = {
  getDiary: async (username: string) => {
    const response = await axios.get(`/api/letterboxd/${username}`);
    return response.data;
  },
};

export const tmdbService = {
  searchMovie: async (query: string) => {
    const response = await axios.get("/api/tmdb/search", { params: { query } });
    return response.data;
  },
  getMovie: async (id: string) => {
    const response = await axios.get(`/api/tmdb/movie/${id}`);
    return response.data;
  },
};

export const fanartService = {
  getMovieImages: async (id: string) => {
    const response = await axios.get(`/api/fanart/movie/${id}`);
    return response.data;
  },
};

export const extractRating = (contentSnippet: string) => {
  if (!contentSnippet) return 0;
  const match = contentSnippet.match(/Rating: (★+½?)/);
  if (!match) return 0;
  const stars = match[1];
  let rating = 0;
  for (const char of stars) {
    if (char === "★") rating += 1;
    if (char === "½") rating += 0.5;
  }
  return rating;
};

export const extractPosterFromRSS = (content: string) => {
  if (!content) return null;
  const match = content.match(/src="([^"]+)"/);
  return match ? match[1] : null;
};

export const parseRSSDescription = (description: string) => {
  // Simple extraction of movie title and year from Letterboxd RSS description if needed
  // But usually the title field is reliable.
  return description;
};
