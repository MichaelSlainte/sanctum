// Copyright © 2026 Michael FR Marques & Tamara Lechner. All rights reserved.
// Sanctum — Private and confidential. Unauthorised use prohibited.
// https://sanctum.app
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CryptoProvider } from './lib/CryptoContext.jsx'
import { Analytics } from "@vercel/analytics/react"

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CryptoProvider>
      <App />
      <Analytics />
    </CryptoProvider>
  </StrictMode>,
)
