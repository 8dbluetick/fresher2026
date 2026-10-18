# TGPCOP MEDIA — Web Application & Event Hub
Independent student-run creative and media collective covering campus life, events, photography, videography, reels, and design at Tulsiramji Gaikwad-Patil College of Pharmacy (TGPCOP).

---

## 🎨 Brand Identity & Theme
- **Brand**: TGPCOP MEDIA (Independent Student Creative Collective)
- **Visual Direction**: Bold graffiti-inspired media branding using the official `tgpcop-media-logo.png` asset.
- **Color Palette**:
  - Primary Red: `#E50914`
  - Dark / Pitch: `#0D0D0D` / `#111111`
  - Pure White: `#FFFFFF`
  - Muted Neutral: `#A8A8A8`
- **Typography**: Anton display headers, Cinzel uppercase accents, Caveat script, and Inter for clean body copy.
- **Structure**:
  - **Header**: Responsive media-brand header with official graffiti logo badge. Council branding completely removed.
  - **Dual Hub Navigation**:
    1. **Fresher's Party**: Countdown, event reveal, student registration, and authenticated login.
    2. **Media Showcase**: Photography gallery, reels/highlights, creative departments, and collaboration coverage request form.
  - **Footer**: Media inquiries email, customizable Instagram handle (hidden until handle is finalized), and independent student collective disclaimer.

---

## 🗄️ Supabase Backend & Database Migrations

### 1. Run Migration Script
In your **Supabase Dashboard** -> **SQL Editor**, run the contents of [`supabase_schema.sql`](./supabase_schema.sql):
- **`config` table**:
  - Public read enabled via Row Level Security (RLS).
  - Admin write only.
  - Controls countdown `reveal_at` and announcement `event_date`.
- **`registrations` table**:
  - Unique constraint on `user_id`.
  - Check constraints on `full_name`, `email` format, 10-digit `phone`, and batch (`2023`, `2024`, `2025`, `2026`).
  - Strict RLS: authenticated users can only insert and view their own registration row.
- **`media_collaborations` table**:
  - Public insert for student clubs/event coverage requests.
  - RLS restricted read: only admins / service role can view inquiries.

---

## 🔐 Environment Variables for Vercel & Production

In your **Vercel Project Settings** -> **Environment Variables**, add:

| Variable Name | Description | Example |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL | `https://xyzproject.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public anonymous key | `eyJhbGciOi...` |

*(Note: Never place the Supabase `service_role` key in frontend environment variables. The client uses safe RLS-backed public anon keys.)*

---

## 🚀 Development & Build

### Development Server
```bash
npm run dev
```
Runs at `http://localhost:5173`.

### Production Build
```bash
npm run build
```
Compiled output is saved to `dist/`.

---

## 📁 Key File Structure
- `src/config/siteConfig.ts` - Central brand settings (name, logo, configurable Instagram handle, contact email).
- `src/App.tsx` - Main interactive React app with dual tabs (Fresher's Party & Media Showcase).
- `src/lib/supabase.ts` - Supabase client, auth, registration verification, and collaboration requests.
- `src/index.css` - Custom styling with red/black/white theme, keyframe animations, and responsive layout.
- `supabase_schema.sql` - Ready-to-run PostgreSQL schema with RLS policies.
- `standalone.html` - Self-contained single-file version.
- `public/tgpcop-media-logo.png` - Official TGPCOP Media graffiti logo.
