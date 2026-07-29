import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import './styles/app.css';

const root = document.getElementById('root');
if (!root) throw new Error('The page is missing its #root element.');

// StrictMode on purpose: it double-invokes effects, which is exactly the
// mount/unmount churn the session's structure coalescing is built to absorb.
// A demo that had to switch it off would be hiding something.
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
