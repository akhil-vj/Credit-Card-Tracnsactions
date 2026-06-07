# Credit Card Transactions Tracker

This is a modern web application built with [TanStack Start](https://tanstack.com/start), [Vite](https://vitejs.dev/), [React](https://reactjs.org/), and [Supabase](https://supabase.com/) to track credit card transactions, EMIs, and hidden charges.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn or bun

## Setup Instructions

1. **Install dependencies**

   ```bash
   npm install
   # or
   bun install
   ```

2. **Environment Variables**

   Copy the `.env.example` file to `.env` and fill in your actual API keys.

   ```bash
   cp .env.example .env
   ```

   **Required Keys:**
   - `SUPABASE_PUBLISHABLE_KEY` & `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon key
   - `SUPABASE_URL` & `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_PROJECT_ID`: Your Supabase project ID
   - `GROQ_API_KEY`: Your Groq API Key (for AI features)
   - `GEMINI_API_KEY`: Your Google Gemini API Key (for AI features)

3. **Start the Development Server**

   ```bash
   npm run dev
   # or
   bun run dev
   ```

4. **Build for Production**

   ```bash
   npm run build
   # or
   bun run build
   ```

## Tech Stack
- **Framework:** React + TanStack Start (Vite)
- **Styling:** Tailwind CSS + Radix UI
- **Backend/Database:** Supabase
- **AI Integrations:** Groq, Google Gemini
