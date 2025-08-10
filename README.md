# GenViu

GenViu is a Next.js 15 application for creating AI-powered faceless videos with voiceovers. The app supports both long-form (YouTube) and short-form (TikTok, Instagram Reels) video generation.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- AI-powered script generation using Gemini 2.5 Flash model
- Support for both long-form and short-form video content
- Pre-analyzed luxury video database with AI-extracted tags and metadata
- Dark theme by default with modern UI components
- Authentication with NextAuth.js (Google, Facebook, credentials)
- PostgreSQL database with Prisma ORM

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

## Tech Stack

- **Framework:** Next.js 15 with App Router and Turbopack
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js with Google, Facebook, and credentials providers
- **AI Services:** AIML API (using OpenAI SDK) with Gemini 2.5 Flash model
- **UI:** Tailwind CSS with Radix UI components, Shadcn UI
- **Styling:** Dark theme by default, custom component system

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.