const KEY = 'GkfGPjm21QPOEgOTHeZgL2b9DcO0UADC';
const STICKERS_BASE = 'https://api.giphy.com/v1/stickers'; // Stickers endpoint for transparent backgrounds
const GIFS_BASE = 'https://api.giphy.com/v1/gifs'; // GIFs endpoint for full-frame animated GIFs

export interface GiphyResult {
  id: string;
  title: string;
  images: {
    fixed_height: { url: string; width: string; height: string };
    fixed_height_still: { url: string };
    fixed_height_small: { url: string };
    fixed_height_small_still: { url: string };
  };
}

export const giphyService = {
  // --- STICKERS (Transparent Backgrounds) ---
  search: async (q: string, limit = 25): Promise<GiphyResult[]> => {
    try {
      const res = await fetch(
        `${STICKERS_BASE}/search?api_key=${KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g&lang=vi`
      );
      if (!res.ok) throw new Error('Giphy search failed');
      const json = await res.json();
      return json.data as GiphyResult[];
    } catch (error) {
      console.warn('Giphy search error', error);
      return [];
    }
  },

  trending: async (limit = 25): Promise<GiphyResult[]> => {
    try {
      const res = await fetch(
        `${STICKERS_BASE}/trending?api_key=${KEY}&limit=${limit}&rating=g`
      );
      if (!res.ok) throw new Error('Giphy trending failed');
      const json = await res.json();
      return json.data as GiphyResult[];
    } catch (error) {
      console.warn('Giphy trending error', error);
      return [];
    }
  },

  // --- GIFS (Full-Frame Animated GIFs) ---
  searchGifs: async (q: string, limit = 25): Promise<GiphyResult[]> => {
    try {
      const res = await fetch(
        `${GIFS_BASE}/search?api_key=${KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g&lang=vi`
      );
      if (!res.ok) throw new Error('Giphy GIF search failed');
      const json = await res.json();
      return json.data as GiphyResult[];
    } catch (error) {
      console.warn('Giphy GIF search error', error);
      return [];
    }
  },

  trendingGifs: async (limit = 25): Promise<GiphyResult[]> => {
    try {
      const res = await fetch(
        `${GIFS_BASE}/trending?api_key=${KEY}&limit=${limit}&rating=g`
      );
      if (!res.ok) throw new Error('Giphy GIF trending failed');
      const json = await res.json();
      return json.data as GiphyResult[];
    } catch (error) {
      console.warn('Giphy GIF trending error', error);
      return [];
    }
  },
};
