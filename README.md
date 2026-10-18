# Fresher's Party Web App (Phase 1)
### Tulsiramji Gaikwad-Patil College of Pharmacy (TGPCOP Students Council)

A mobile-first, high-energy event website built strictly following the Solasta visual theme and specifications.

---

## 🎨 Theme & Visual Design
- **Background**: Solid Royal / Electric Blue (`#0A1FD6` to `#0613A8` subtle vertical gradient) with a pulsing wireframe butterfly watermark behind the hero.
- **Color Palette**: Royal Blue, Pure White, Neon Lime (`#C6FF1A`).
- **Typography**:
  - Hero Title: **FRESHER'S** in Anton (ultra-bold condensed), **PARTY** in neon lime.
  - Event Line: Cinzel thin serif (*"THE FRESHERS PARTY OF"*), with *"Batch 26"* in Caveat neon lime script.
  - Body: Inter sans-serif, letter-spaced uppercase labels.
- **Logos & Badges**:
  - Official Council Emblem in circular white badge with neon lime outline in header (`council-emblem.png`).
  - Official 4 Pillars in a white rounded strip with authentic icons: Academic Growth, Student Representation, Campus Engagement, Innovation & Initiatives (`council-pillars-icons.png`).
- **Animations**:
  - Sliding bounce entrance for Hero text.
  - Floating & rotating lime paint splatters.
  - Pulsing wireframe butterfly watermark.
  - Digit flip & second tick pulse on countdown.
  - Confetti explosion in neon lime + white upon date reveal and student registration.
  - Staggered scroll reveals and tap ripple effects on buttons.
  - Full respect for `prefers-reduced-motion`.

---

## 🛠️ Tech Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Custom CSS Variables matching theme
- **Database & Auth**: `@supabase/supabase-js` (with automatic local fallback for immediate testing)
- **Visual FX**: Canvas Confetti + Custom SVG Splatters + Ripple engine

---

## 🚀 Getting Started

### 1. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your mobile browser or emulator.

### 2. Build for Production
```bash
npm run build
```
Production assets will be output to the `dist/` directory.

---

## 🗄️ Supabase Setup & Configuration

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Run the provided script: `supabase_schema.sql`.
   - Creates the `config` table (`reveal_at`, `event_date`) with public read policy.
   - Creates the `registrations` table with unique constraint on `user_id` and strict RLS (users can only insert and read their own registration).
3. Copy your project URL and anon public key into `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. Restart Vite (`npm run dev`).

*(Note: If no Supabase credentials are configured, the application automatically operates in local demo mode using localStorage, allowing you to test the complete Sign Up, Login, Countdown, and "YOU'RE IN" registration card immediately.)*

---

## 📄 File Directory Overview
- `src/App.tsx` - Main interactive React component with countdown, tabs, registration & auth flows.
- `src/lib/supabase.ts` - Supabase client, session listener, registration and config services.
- `src/index.css` - Theme styles, keyframes, typography classes, and Tailwind directives.
- `supabase_schema.sql` - Complete PostgreSQL schema and RLS policies for Supabase.
- `standalone.html` - Self-contained single-file version that can be opened directly without a build step.
- `public/`
  - `council-emblem.png` - Official council badge logo.
  - `council-pillars-icons.png` - Official 4 council pillar icons strip.
