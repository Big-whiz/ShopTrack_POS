import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css';

// Cache bust timestamp: 2026-03-04T23:09:00Z
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
