import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { isPublicKey } from './src/cms/public-config.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'cms-local-api',
    configResolved(config) {
      const key = loadEnv(config.mode, process.cwd(), 'VITE_').VITE_SUPABASE_PUBLISHABLE_KEY;
      if (key && !isPublicKey(key)) throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY must be a public publishable/anon key. Never use a privileged key.');
    },
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), 'VITE_');
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/cms') && req.url !== '/sitemap.xml') return next();
        try {
          const { handle } = await server.ssrLoadModule('/server/handler.js');
          await handle(req, res, { env });
        } catch { res.statusCode = 503; res.end('Service temporarily unavailable.'); }
      });
    },
  }],
  build: { manifest: true },
  // Serve the same anonymous API locally, without requiring Vercel CLI.
  // Registered before Vite's SPA fallback so /api/cms cannot return homepage HTML.
})
