# FLOWSCROLL - PROJECT CONTEXT & DOCUMENTATION

## 1. Project Overview
**Name:** FlowScroll
**Concept:** "TikTok for the Brain". An infinite, adaptive scroll feed of cognitive mini-games designed to keep users in the flow state.
**Target Audience:** People who doom-scroll but want to be productive.
**Tech Stack:** React (Vite), TypeScript, TailwindCSS.
**Hosting:** Netlify (PWA Support).
**Backend:** Netlify Serverless Functions (TypeScript).
**Database:** Supabase (PostgreSQL).
**AI Engine:** Google Gemini 2.5 Flash (via Proxy).

## 2. Project History & Development Decisions

### Phase 1: The Core Loop (Local MVP)
*   **Goal:** Create a frictionless, infinite feed of tasks.
*   **Challenge:** How to make it feel like TikTok?
*   **Solution:** CSS Scroll Snap (`snap-y snap-mandatory`) was the key. It forces one task per screen.
*   **Decision:** We chose *Client-Side Generation* for Math/Music/Reaction tasks. Why? Zero latency. Waiting for a server between swipes kills the flow state.

### Phase 2: The "Sweat Spot" Algorithm
*   **Goal:** Keep users in the flow (not too hard, not too boring).
*   **Challenge:** Hardcoding levels (1-10) felt artificial.
*   **Solution:** Implemented "Infinite Scaling" using logarithmic math.
    *   *Math:* Digits = `1 + floor(log(level))`.
    *   *Reaction:* Time = `1000ms * 0.9^level`.
    *   *Music:* Sequence Length = `3 + level/2`.
*   **Calibration:** We added a "Boost Multiplier" (2.5x) for the first 5 tasks. This fixes the "Boredom Problem" where skilled users had to grind through easy levels.

### Phase 3: The Content Expansion (AI & Audio)
*   **Language Tasks:** We needed infinite variety.
    *   *Challenge:* AI API latency and cost.
    *   *Solution:* A Hybrid Approach. Try the API first via Backend Proxy. If it fails (or offline), fallback to a massive local list of 1000+ generated combinations (`COMMON_NOUNS`).
*   **Music Tasks:** Woodblock sounds were boring.
    *   *Solution:* Built a `Web Audio API` synthesizer from scratch (Kick, Snare, HiHat, Tom). No MP3 assets needed (keeps app light). Added a procedural Step Sequencer logic to generate unique beats every time.

### Phase 4: Security & Analytics (The "Real App" Upgrade)
*   **Security:** Initially, the API Key was in the frontend.
    *   *Risk:* User theft.
    *   *Fix:* Moved logic to `netlify/functions/generate-task.mts`. The frontend now calls this proxy.
*   **Data:** We needed to know if people actually play.
    *   *Solution:* Implemented `sessionId` tracking and deep analytics (Success Rates, Skip Rates).
    *   *Tech:* Supabase via REST API (fetch) instead of the heavy JS client library to save bundle size.

## 3. Task Mechanics (The Games)

### A. Math (Logic)
*   **Standard:** Addition, Subtraction, Multiplication.
    *   *Input:* Custom Glass Numpad (prevents native keyboard popup).
*   **Math Stream:** "Mental Endurance". Numbers appear sequentially (`+5`, `-2`, `x3`). User enters the final sum.
    *   *Scaling:* Speed increases (3000ms -> 400ms).

### B. Language (Verbal)
*   **Synonym:** Find a word with same meaning.
*   **Rhyme:** Find a word that rhymes.
*   **Sentence:** Combine two unrelated words into a sentence.
    *   *Tech:* Uses Gemini AI to generate creative words, or a massive local fallback list (`COMMON_NOUNS`) if offline.
    *   *Help:* "Show Solution" button appears after failure.

### C. Reaction (Speed & Attention)
*   **Color:** Tap screen when it turns green. Measures ms.
*   **Odd One Out:** Grid of items. Find the one that is different.
    *   *Modes:* Emoji (Semantic), Rotation (Spatial). *Color mode removed due to difficulty issues.*

### D. Music (Auditory)
*   **Rhythm:** Listen to a beat (Kick/Snare pattern), then tap it back.
    *   *Tech:* Procedural Step Sequencer generates unique beats every time.
*   **Memory (Simon Says):** Memorize a sequence of tones/colors.

### E. Free Mind (Rest)
*   **Breathe:** Visual breathing guide (4s In, 4s Out). Appears rarely to reset stress.

## 4. The Algorithm (`services/taskEngine.ts`)

### "Sweet Spot" Leveling
The difficulty adapts after **every** task based on performance:
*   **Too Easy (< 5s):** Level +0.5 (Boost).
*   **Flow State (5s - 15s):** Level +0.2.
*   **Struggle (> 15s):** Level +0.05.
*   **Fail / Skip:** Level -0.3.
*   **Calibration Phase:** First 5 tasks per category have a **2.5x boost multiplier** to quickly find the user's real skill level.

### Engagement Logic
*   The engine tracks `wasSkipped`.
*   If a category (e.g., Math) is skipped often, its probability in the feed drops.
*   If a category is played often, its probability rises.

## 5. Architecture & Data Flow

### Frontend (Client-Side)
*   **Entry:** `index.tsx` -> `App.tsx`
*   **State:** `UserStats` object stored in `localStorage`. Contains `userId`, `levels` per category, and `history`.
*   **Components:**
    *   `Feed.tsx`: The infinite scroll engine. Manages the buffer of 5 pre-generated tasks.
    *   `TaskCard.tsx`: The wrapper for visual tasks. Handles the "Swipe" logic.
    *   `Analytics.tsx`: Profile page with charts (Recharts) and Data Export.

### Backend (Serverless)
*   **Path:** `/netlify/functions/`
*   **`generate-task.mts`:**
    *   **Role:** Secure Proxy for Google Gemini API.
    *   **Input:** `{ type: 'LANG_SYNONYM', difficulty: 5 }`
    *   **Security:** Hides `API_KEY` from the client. Validates input difficulty (1-20). Caps tokens at 300.
*   **`record-task.mts`:**
    *   **Role:** Analytics Ingest.
    *   **Input:** `TaskResult` JSON.
    *   **Action:** Logs to Netlify Console AND inserts into Supabase `task_history` table.

### Database (Supabase)
*   **Table:** `task_history`
*   **Columns:** `user_id`, `task_type`, `success` (bool), `difficulty_level`, `time_spent_ms`, `session_id`.
*   **Security:** Row Level Security (RLS) enabled. Anon Policy allows `INSERT`.

## 6. Environment Variables (Netlify)
*   `API_KEY`: Google Gemini API Key (starts with `AIza...`).
*   `SUPABASE_URL`: Database URL.
*   `SUPABASE_KEY`: Public Anon Key.

## 7. Deployment
*   **Build Command:** `npm run build`
*   **Publish Dir:** `dist`
*   **Platform:** Netlify (Automatic deploys from GitHub).