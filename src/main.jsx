import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const root = document.getElementById('root')
let app;
if (window.location.pathname === '/') {
  app = <StrictMode><App /></StrictMode>;
} else {
  const { default: CmsApp } = await import('./cms/CmsApp.jsx');
  const payload = document.getElementById('cms-data');
  app = <StrictMode><CmsApp path={window.location.pathname} initialData={payload ? JSON.parse(payload.textContent) : undefined} /></StrictMode>;
}

if (root.hasChildNodes()) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}
