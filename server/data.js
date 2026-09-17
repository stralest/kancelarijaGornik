import { createClient } from '@supabase/supabase-js';
import { isPublicKey } from '../src/cms/public-config';

// This client is ALWAYS anonymous, even when a visitor has an admin session.
// Public SSR must never inherit browser cookies or authorization headers.
export function publicClient(env = process.env) {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !isPublicKey(key)) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) } });
}
export async function allRows(query) {
  const rows = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await query().range(start, start + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export async function loadPublic(path, client) {
  if (path !== '/clanci' && !/^\/clanci\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) return { notFound: true };
  if (!client) return { error: true };
  if (path === '/clanci') {
    const [articles, categories] = await Promise.all([
      allRows(() => client.from('articles').select('id,slug,category_id,title_sr,excerpt_sr,title_en,excerpt_en,featured_image_path,image_alt_sr,image_alt_en,published_at,categories(*)').eq('status', 'published').order('published_at', { ascending: false }).order('id')),
      allRows(() => client.from('categories').select('*').order('name_sr')),
    ]);
    // The listing does not transfer entire article bodies.
    return { articles, categories };
  }
  const { data, error } = await client.from('articles').select('*,categories(*)').eq('status', 'published').eq('slug', path.slice(8)).maybeSingle();
  if (error) throw error;
  return data ? { article: data } : { notFound: true };
}
