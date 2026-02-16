export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    key: import.meta.env.VITE_SUPABASE_KEY ?? '',
  },
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY ?? '',
  },
} as const;
