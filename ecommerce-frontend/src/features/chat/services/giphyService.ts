const KEY = import.meta.env.VITE_GIPHY_API_KEY as string;
const BASE = 'https://api.giphy.com/v1/gifs';

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
  search: async (q: string, limit = 25): Promise<GiphyResult[]> => {
    const res = await fetch(
      `${BASE}/search?api_key=${KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g&lang=vi`
    );
    if (!res.ok) throw new Error('Giphy search failed');
    const json = await res.json();
    return json.data as GiphyResult[];
  },

  trending: async (limit = 25): Promise<GiphyResult[]> => {
    const res = await fetch(
      `${BASE}/trending?api_key=${KEY}&limit=${limit}&rating=g`
    );
    if (!res.ok) throw new Error('Giphy trending failed');
    const json = await res.json();
    return json.data as GiphyResult[];
  },
};
