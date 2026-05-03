# ShareFood AI — Smart Food Rescue Platform

## Project Overview
A React + Vite + Tailwind CSS SPA for AI-powered food donation coordination. Features real-time multi-device sync via Socket.IO, AI chatbot, smart food allocation, demand prediction, image upload with AI freshness analysis, and freshness countdown timers.

## Architecture

### Frontend (Port 5000)
- **Framework**: React 19 + Vite 7 + TypeScript
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **Map**: Leaflet + react-leaflet
- **Real-time**: Socket.IO client (proxied via Vite to port 3001)
- **State**: localStorage (client-side cache) + Socket.IO (server sync)
- **Notifications**: react-hot-toast

### Backend (Port 3001)
- **Runtime**: Node.js (ES modules)
- **Server**: Socket.IO on raw HTTP server
- **Storage**: JSON file (`data.json`) — persists across restarts
- **Real-time**: Broadcasts data changes to all connected clients

## Key Files

### Utilities
- `src/utils/db.ts` — localStorage CRUD + Socket.IO event emission
- `src/utils/socket.ts` — Socket.IO client singleton
- `src/utils/useServerSync.ts` — hook that syncs from server on mount and listens for live changes
- `src/utils/useRealtime.ts` — BroadcastChannel hook for same-device tab sync
- `src/utils/freshness.ts` — Freshness time calculation, image resize, AI freshness from pixel analysis
- `src/utils/aiFeatures.ts` — Chatbot, AI allocation scoring, demand prediction
- `src/utils/authContext.tsx` — Auth state with React context

### Pages
- `src/pages/LandingPage.tsx` — Public landing page
- `src/pages/AuthPage.tsx` — Login / Register with role selection
- `src/pages/DonorDashboard.tsx` — Post food, upload image, AI freshness, freshness countdown
- `src/pages/NGODashboard.tsx` — Browse donations (AI sorted), accept, track, freshness bars
- `src/pages/DeliveryDashboard.tsx` — Active deliveries, route map, status updates, freshness urgency
- `src/pages/AdminDashboard.tsx` — User/donation management, AI demand prediction chart

### Components
- `src/components/Navbar.tsx` — Navigation with auth state
- `src/components/Chatbot.tsx` — AI chatbot with real platform data
- `src/components/Footer.tsx` — Footer

### Config
- `vite.config.ts` — Vite config with Socket.IO proxy (`/socket.io` → port 3001)
- `server.js` — Socket.IO backend server

## Real-time Multi-device Sync Flow
1. Client connects → server sends full `data.json` snapshot → client writes to localStorage
2. Client makes change → writes to localStorage + emits `data_change` to server
3. Server updates `data.json` + broadcasts to all OTHER clients via `socket.broadcast.emit`
4. Other clients receive `data_changed` → update their localStorage + trigger re-render

## Auth
- **Admin**: email `admin@sharefood.com`, phone `1234567890`, password `password`
- Roles: `donor`, `ngo`, `delivery`, `admin`
- Auth stored in localStorage (`sf_current_user`)

## Freshness System
- `getFreshnessTime(createdAt, consumableHours)` — returns remaining time, color, progress bar %, and a human-readable label
- Color coding: Emerald (>75% fresh), Yellow (50-75%), Orange (25-50%), Red (<25% or <30 min), Gray (expired)
- Live countdown: components refresh every 30 seconds via `setInterval`

## AI Image Freshness
- Canvas pixel sampling of the uploaded image center area
- Analyzes average RGB, vibrancy, dark pixel ratio, brown pixel ratio, green presence
- Returns a score (0-100) with label and advice — no external API required

## Workflows
- **Start application**: `npm run dev` — Vite dev server on port 5000 (webview)
- **Socket.IO Backend**: `node server.js` — Socket.IO on port 3001 (console)

## Dependencies
Key packages: react, react-dom, react-router-dom, socket.io-client, socket.io, react-hot-toast, leaflet, react-leaflet, framer-motion, lucide-react, @tailwindcss/vite
