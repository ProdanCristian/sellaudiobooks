# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FacelessCut is a Next.js 15 application for creating AI-powered faceless videos with voiceovers. The app supports both long-form (YouTube) and short-form (TikTok, Instagram Reels) video generation.

## Development Commands

**Development:**
- `npm run dev` - Start development server with Turbopack
- `npm run dev:network` - Start development server accessible on network
- `npm run tunnel` - Start tunnel using ./scripts/start-tunnel.sh

**Build & Deploy:**
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

**Database:**
- `npm run postinstall` - Generate Prisma client (runs automatically after install)
- `npx prisma generate` - Generate Prisma client manually
- `npx prisma migrate dev` - Run database migrations in development
- `npx prisma studio` - Open Prisma Studio for database management

## Architecture Overview

### Tech Stack
- **Framework:** Next.js 15 with App Router and Turbopack
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js with Google, Facebook, and credentials providers
- **AI Services:** AIML API (using OpenAI SDK) with Gemini 2.5 Flash model
- **UI:** Tailwind CSS with Radix UI components, Shadcn UI
- **Styling:** Dark theme by default, custom component system
- 

### Core Models (Prisma Schema)
- **User:** Authentication with social login support
- **LuxuryVideos:** AI-analyzed video content with tags, categories, objects, mood, and dominant colors
- **Script:** Generated scripts for video voiceovers with topic and duration tracking

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `components/` - Reusable UI components with shadcn/ui integration
- `lib/` - Utilities (auth, database, AI integration, SMTP)
- `prisma/` - Database schema and migrations
- `types/` - TypeScript type definitions

### Authentication Flow
Uses NextAuth.js with custom pages at `/auth/login` and `/auth/signup`. Supports:
- Google OAuth
- Facebook OAuth  
- Email/password with bcrypt hashing
- Automatic user creation for social logins
- Redirects to `/dashboard` after successful login

### AI Integration
- **AIML API:** Script generation using Gemini 2.5 Flash model
- **Video Analysis:** LuxuryVideos model stores AI-powered content analysis
- **Stream Support:** Real-time script generation with streaming responses

### Video Content Pipeline
1. Users choose video format (long/short) from dashboard
2. Script generation through AI API
3. Video content sourced from pre-analyzed luxury video database
4. Content matching based on AI-extracted tags, categories, and mood

## Important Implementation Notes

- Database uses PostgreSQL with comprehensive indexing for video search
- AI analysis includes visual content detection (objects, colors, mood, setting)
- Authentication supports both social and credential-based login
- Dark theme is enforced at the HTML level with `className="dark"`
- Uses Turbopack for faster development builds