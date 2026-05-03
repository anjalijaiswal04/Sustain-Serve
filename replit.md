# Smart Food Rescue

A React + Vite + Tailwind CSS frontend application for coordinating food rescue operations — connecting food donors, NGOs, delivery agents, and administrators.

## Architecture

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7 with `vite-plugin-singlefile`
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`)
- **Routing**: React Router DOM v7
- **Maps**: Leaflet / React Leaflet
- **Animations**: Framer Motion
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **Real-time**: Socket.io client (for future backend integration)
- **Database**: localStorage (client-side mock DB via `src/utils/db.ts`)

## Project Structure

```
src/
  App.tsx              - Main app with router and layout
  main.tsx             - Entry point
  index.css            - Global styles
  components/
    Chatbot.tsx        - AI chatbot UI
    Dashboard.tsx      - Shared dashboard component
    Footer.tsx         - Footer
    Navbar.tsx         - Navigation bar
  pages/
    AuthPage.tsx       - Login/Register page
    LandingPage.tsx    - Public landing page
    DonorDashboard.tsx - Donor role dashboard
    NGODashboard.tsx   - NGO role dashboard
    DeliveryDashboard.tsx - Delivery agent dashboard
    AdminDashboard.tsx - Admin dashboard
    dashboards/        - Additional dashboard subcomponents
  utils/
    db.ts              - localStorage-based mock database
    types.ts           - TypeScript type definitions
    cn.ts              - Tailwind class merge utility
    hero.jpg           - Hero image asset
```

## Routes

- `/` - Landing page
- `/auth` - Login/Register
- `/donor` - Donor dashboard
- `/ngo` - NGO dashboard
- `/delivery` - Delivery agent dashboard
- `/admin` - Admin dashboard (default admin: admin@sharefood.com / password)

## Development

```bash
npm run dev    # Start dev server on port 5000
npm run build  # Production build (single-file output via viteSingleFile)
```

## Replit Configuration

- Dev server runs on `0.0.0.0:5000` with `allowedHosts: true` for proxy support
- Workflow: "Start application" → `npm run dev`
