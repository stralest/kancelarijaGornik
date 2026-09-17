import { build } from 'vite';
import { readFile, writeFile, unlink } from 'node:fs/promises';

await build({ build: { ssr: 'server/handler.js', outDir: 'server-dist', emptyOutDir: true, rollupOptions: { output: { entryFileNames: 'handler.js' } } } });
const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
const css = manifest['src/cms/CmsApp.jsx']?.css || [];
const shell = await readFile('dist/cms-shell.html', 'utf8');
await writeFile('server-dist/shell.html', shell.replace('</head>', `${css.map(path => `<link rel="stylesheet" href="/${path}" />`).join('')}\n</head>`));
await unlink('dist/cms-shell.html');
// /sitemap.xml is served live by the Vercel rewrite. A static file would shadow it.
await unlink('dist/sitemap.xml');
