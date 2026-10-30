# ⚽ FPL & FPL Draft AI Companion (Monorepo)

An AI-powered quantitative decision engine and Chrome Manifest V3 extension for **Fantasy Premier League (Classic & Draft)**. Powered by **Google Gemini 3.8 Flash** and grounded in **Vaastav's multi-season Premier League historical archive**.

---

## 🌟 Key Features

1. **Dual-Layer Bayesian Decision Model**:
   - Blends **live 2026/27 performance** (rolling form, minutes, status, FPL fixtures) with **Vaastav's 3-year historical archive** (career per-90 xG/xA/xGI, finishing conversion efficiency, venue resistance).
   - Detects **unsustainable hot streaks** (regression to the mean warning) vs. **positive rebound candidates**.
2. **Chrome Manifest V3 Side Panel**:
   - Persistent side-by-side analysis on `fantasy.premierleague.com` and `draft.premierleague.com`.
   - Toggle between **Classic Mode** (manager squad audit, bank-conscious transfers, captain EV) and **Draft Mode** (waiver wire prioritizer & drop candidates).
3. **Live DOM Pitch AI Badges**:
   - Lightweight micro-pills injected directly onto official FPL pitch elements displaying **real-time Expected Points (xP)** and **YoY Form Delta (+% vs 3-yr baseline)**.
4. **Club Historical Head-to-Head (H2H) & Venue Index**:
   - 10-year club matchup records, stadium-specific clean-sheet rates, and venue-adjusted Fixture Difficulty Ratings (FDR).
5. **Interactive Gemini 3.8 Chat Engine**:
   - Natural language queries wired to 4 backend tools (`getPlayerComparison`, `getTopWaiverTargets`, `analyzeClassicSquad`, `evaluateClubMatchup`) returning structured UI cards.

---

## 📁 Repository Structure

```text
fpl-companion-monorepo/
├── packages/
│   ├── shared/             # TypeScript types, DTOs & Gemini schemas
│   ├── backend/            # Node.js + TypeScript service (:3001) with @google/genai & Vaastav DB
│   │   ├── data/           # Seeded 3-year Vaastav player baselines & club H2H matrix
│   │   └── src/            # Services, controllers, tools & Gemini engine
│   └── extension/          # Manifest V3 Chrome Extension (React 18 + Vite + Tailwind)
│       ├── dist/           # Built unpacked extension ready for Chrome
│       ├── src/background/ # Service worker (sidePanel launcher & storage relay)
│       ├── src/content/    # Pitch DOM observer & AI badge injector
│       └── src/sidepanel/  # React dark-mode analytics dashboard
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
Ensure you are using **Node.js >= 18** (Node 22 is recommended and pre-configured):
```bash
export PATH="/Users/nk/.nvm/versions/node/v22.14.0/bin:$PATH"
node -v # Should display v22.14.0
```

### 2. Configure Backend API Key (Optional but Recommended)
In `packages/backend/.env`:
```bash
cp packages/backend/.env.example packages/backend/.env
```
Open `packages/backend/.env` and insert your Gemini API Key from [Google AI Studio](https://aistudio.google.com/apikey):
```env
PORT=3001
GEMINI_API_KEY=AIzaSy...
```
*(Note: If no API key is provided, the backend automatically runs in **Local Quantitative Engine Mode**, computing Bayesian xP, optimal starting XI, transfers, and H2H statistics deterministically).*

### 3. Build the Monorepo
From the root directory:
```bash
npm run build
```
This builds `@fpl-companion/shared`, `@fpl-companion/backend`, and packages the extension into `packages/extension/dist/`.

### 4. Start the Backend API Server
```bash
npm run start:backend
```
The server will start on `http://localhost:3001`. You can verify it by opening `http://localhost:3001/api/health` in your browser.

---

## 🧩 Loading the Extension in Google Chrome

1. Open Google Chrome and navigate to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** (top-left button).
4. Select the directory:
   ```text
   /Users/nk/code/neeru/FPL plugin/packages/extension/dist
   ```
5. Pin the **FPL AI Companion** extension icon in your Chrome toolbar.
6. Navigate to `https://fantasy.premierleague.com/my-team` or `https://draft.premierleague.com/`.
7. Click the extension toolbar icon — the **Chrome Side Panel** will open beside your team!

---

## 🛠️ API & Tool Reference

| Tool / Endpoint | Purpose |
| :--- | :--- |
| `GET /api/health` | Backend status, version, and Gemini connection health. |
| `GET /api/audit/classic/:managerId` | Computes optimal starting XI, captain EV, and bank-conscious transfers. |
| `GET /api/audit/draft/:leagueId` | Scans free agent pool and ranks waiver wire targets against upcoming fixture runs. |
| `GET /api/matchup/h2h?teamA=...&teamB=...` | Club historical head-to-head records, venue clean-sheet rates, and FPL asset picks. |
| `GET /api/matchup/fdr-matrix/:teamId` | 5-GW rolling fixture schedule with venue-adjusted difficulty. |
| `GET /api/matchup/player-comparison` | Side-by-side per-90 metrics comparing 2026/27 form vs 3-year Vaastav baseline. |
| `GET /api/badges?elementIds=...` | Returns xP, YoY Δ %, and regression flags for pitch DOM injection. |
| `POST /api/chat` | Natural language interface with function-calling tool execution. |
