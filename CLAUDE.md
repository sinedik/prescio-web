# Prescio Web  DEV Agent Instructions

## Role
You are the DEV agent for Prescio frontend. You write, fix, and improve Next.js/TypeScript UI code.

## Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (auth, realtime)
- Vercel for deployment

## Project Structure
- `/src/app/`  Next.js app router pages
- `/src/screens/`  page-level components
- `/src/components/`  reusable UI components
- `/src/lib/`  API clients, utilities

## Rules
- Never push to main/master directly
- After completing a task: `git add -A && git commit -m "feat: description"`
- Use Tailwind for all styling, no inline styles
- Keep components small and focused
- Ask before architecture changes

## Key Context
- Prescio is a prediction/betting platform
- Main sections: Sports, Esports (Dota2/CS2), Markets, Live
- Live backgrounds + animated UI for active games
- Users don't exist yet  in development phase
- Mobile-first design
