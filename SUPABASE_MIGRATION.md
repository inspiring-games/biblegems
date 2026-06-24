# Supabase Migration Plan for Bible Gems

## Current state
This repo is currently a Base44-powered React app. It uses `@base44/sdk`, `@base44/vite-plugin`, and Base44-specific auth/data APIs in `src/api/base44Client.js` and `src/lib/AuthContent.jsx`.

## What needs to change
1. Create a Supabase project and enable Auth.
2. Add the following environment variables in Cloudflare Pages and locally: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_SUPABASE_SERVICE_ROLE_KEY` for admin operations.
3. Replace Base44-specific UI data/auth logic with Supabase equivalents.
4. Create tables for the main entities and match the app’s data model.
5. Remove `@base44/sdk` and `@base44/vite-plugin` once the migration is complete.

## Recommended Supabase schema
### profiles
- id: uuid (primary key)
- user_id: uuid (references auth.users)
- full_name: text
- avatar: text
- preferred_translation: text
- role: text
- nickname: text
- created_at: timestamp with time zone default now()

### bible_verses
- id: uuid (primary key)
- translation_id: text
- book: text
- chapter: integer
- verse: integer
- text: text
- created_at: timestamp with time zone default now()

### bible_translations
- id: uuid (primary key)
- translation_id: text
- name: text
- verse_count: integer
- created_at: timestamp with time zone default now()

### gems
- id: uuid (primary key)
- user_id: uuid
- user_nickname: text
- user_avatar: text
- book: text
- chapter: integer
- verse: integer
- content: text
- likes_count: integer default 0
- liked_by: jsonb
- created_date: timestamp with time zone default now()

### follows
- id: uuid (primary key)
- follower_id: uuid
- following_id: uuid
- created_at: timestamp with time zone default now()

### blocked_users
- id: uuid (primary key)
- blocker_id: uuid
- blocked_id: uuid
- created_at: timestamp with time zone default now()

### reports
- id: uuid (primary key)
- gem_id: uuid
- reporter_id: uuid
- reason: text
- status: text
- admin_notes: text
- created_date: timestamp with time zone default now()

## Cloudflare Pages setup
- Connect the GitHub repo to Cloudflare Pages.
- Build command: `npm install && npm run build`
- Output directory: `dist`
- Add these Supabase env vars to Cloudflare Pages and local development:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - optionally `VITE_SUPABASE_SERVICE_ROLE_KEY` for admin or server-side operations
- Make sure the variables are set in both Production and Preview environments so the app can build and run correctly.

## Next step I can take for you
- Replace `src/api/base44Client.js` with a Supabase client implementation.
- Rewrite `src/lib/AuthContent.jsx` to use Supabase auth.
- Replace Base44 entity calls in pages with Supabase table queries.
- Optionally implement an admin email flow using a serverless endpoint.
