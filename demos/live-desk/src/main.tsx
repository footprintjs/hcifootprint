import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './ui/styles.css';

/**
 * StrictMode is ON deliberately. It double-invokes effects in development, so
 * every control mounts, unmounts and mounts again — which is exactly the churn
 * the library's registration handles are designed for. If this demo produced
 * duplicate registrations or a phantom structure bump, StrictMode is where it
 * would show first.
 */
const root = document.getElementById('root');
if (!root) throw new Error('live-desk: #root is missing from index.html');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
