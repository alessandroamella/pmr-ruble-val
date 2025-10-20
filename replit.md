# Transnistrian Ruble Exchange Rate Dashboard

## Overview

This is a financial data dashboard application that displays live and historical exchange rates for the Transnistrian Ruble (PMR) against major currencies (EUR, USD, RUB, UAH, MDL). The application fetches data from an external API and presents it through interactive charts and tables, optimized for both desktop analysis and mobile quick-checks.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side routing)
- **State Management:** TanStack Query (React Query) v5 for server state management
- **Build Tool:** Vite for fast development and optimized production builds
- **UI Framework:** shadcn/ui components built on Radix UI primitives
- **Styling:** Tailwind CSS with custom design tokens

**Design Decisions:**
- **Utility-First Approach:** Uses Tailwind CSS for styling with a comprehensive design system defined in CSS variables, supporting both light and dark modes
- **Component Library:** shadcn/ui provides accessible, customizable components without runtime dependencies - components are copied into the project for full control
- **Data Fetching Strategy:** React Query handles caching, background refetching, and error states with a configured policy of no automatic refetching (staleTime: Infinity) to reduce unnecessary API calls
- **Responsive Design:** Mobile-first approach with breakpoints optimized for both desktop analysis and mobile quick-checks

**Key Architectural Patterns:**
- Single-page application (SPA) structure with client-side routing
- Component composition with reusable UI primitives
- Custom hooks for shared logic (e.g., `use-mobile`, `use-toast`)
- Path aliases for clean imports (`@/` for client code, `@shared/` for shared types)

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with Express.js
- **Language:** TypeScript with ES modules
- **Build Tool:** esbuild for production bundling

**API Design:**
- **Proxy Pattern:** The Express server acts as a proxy to an external currency API running on `localhost:5050`
- **Endpoints:**
  - `GET /api/rates/:currency/latest` - Fetch latest rate for a specific currency
  - `GET /api/rates?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&currencies=csv` - Fetch historical rates for multiple currencies within a date range
- **Error Handling:** Centralized error middleware with status code propagation
- **Request Logging:** Custom middleware logs API requests with duration and response data

**Why Proxy Architecture:**
- Decouples frontend from external API implementation
- Allows for future caching, rate limiting, or data transformation layers
- Provides a stable internal API interface even if external API changes

### Data Layer

**Schema Management:**
- **Validation:** Zod schemas define data contracts between frontend and backend
- **Type Safety:** TypeScript types are derived from Zod schemas using `z.infer`
- **Shared Types:** Common schemas live in `/shared/schema.ts` for use across client and server

**Database Configuration:**
- Drizzle ORM is configured with PostgreSQL dialect
- Database migrations are managed in `/migrations` directory
- Connection via `DATABASE_URL` environment variable
- **Note:** Currently no local database usage - application relies entirely on external API. Database infrastructure is configured for potential future caching or data persistence features.

**Available Currencies:**
- USD (US Dollar)
- EUR (Euro)
- RUB (Russian Ruble)
- UAH (Ukrainian Hryvnia)
- MDL (Moldovan Leu)

### External Dependencies

**Third-Party Services:**
- **Currency Data API:** External API at `http://localhost:5050` provides exchange rate data
  - Must be running independently for the application to function
  - API endpoints follow REST conventions with query parameters for filtering
  - Returns JSON responses with currency codes and rate arrays

**UI Dependencies:**
- **Radix UI:** Headless UI primitives for accessible components (accordion, dialog, popover, select, etc.)
- **Recharts:** Composable charting library for historical data visualization
- **date-fns:** Date manipulation and formatting utilities
- **Lucide React:** Icon library for consistent iconography

**Development Tools:**
- **Replit Plugins:** Development banner, error modal overlay, and cartographer for enhanced development experience
- **TypeScript:** Strict type checking with path resolution for imports
- **PostCSS:** CSS processing with Tailwind CSS and Autoprefixer plugins

**Build Dependencies:**
- **tsx:** TypeScript execution for development server
- **esbuild:** Fast bundling for production server build
- **Vite:** Frontend bundler with hot module replacement (HMR)

**Design System:**
- Custom color palette supporting light/dark themes
- Typography using Inter (UI) and JetBrains Mono (numerical data) fonts from Google Fonts
- Comprehensive Tailwind configuration with extended border radius, colors, and spacing
- Chart-specific color variables for multi-currency visualization