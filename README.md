# Influencer Outreach Automation

A full-stack Instagram influencer outreach automation platform with a React dashboard and Express API backend.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS
- **Backend**: Node.js, Express 5
- **Database**: MongoDB
- **Automation**: Playwright (browser automation for Instagram)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) running locally on port `27017`
- npm (comes with Node.js)

## Project Structure

```
influencer-automation/
├── backend/
│   ├── server.js              # Express API entry point
│   ├── config.js              # App configuration
│   ├── .env                   # Environment variables
│   ├── controllers/           # API route handlers
│   ├── models/                # Mongoose schemas
│   ├── automation/            # Playwright automation scripts
│   └── utils/                 # Helpers (DB, logger, parser)
└── frontend/
    ├── src/
    │   ├── App.js             # Main React component
    │   ├── api.js             # API client
    │   └── components/        # UI components
    └── public/
```

## Installation

### 1. Install backend dependencies

```bash
cd influencer-automation/backend
npm install
```

### 2. Install frontend dependencies

```bash
cd influencer-automation/frontend
npm install
```

### 3. Install Playwright browsers (first time only)

```bash
cd influencer-automation/backend
npx playwright install chromium
```

## Configuration

### Backend Environment Variables

The backend `.env` file is located at `influencer-automation/backend/.env`:

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/influencerBot
SESSION_PATH=session.json
```

### App Settings

Settings can be configured from the dashboard UI or by editing `influencer-automation/backend/settings-override.json`:

- **Hashtags**: Keywords to search (default: skincare, beauty, makeup, fashion)
- **Follower range**: 10,000 – 200,000
- **Min engagement rate**: 2%
- **DM batch size**: 5
- **Human-like delays**: Built-in to avoid detection

## Running the Project

### Quick Start (Windows)

Double-click `start.bat` to start MongoDB, backend, and frontend all at once.

To stop everything, double-click `stop.bat`.

### Manual Start

**1. Start MongoDB** (if not running as a service):

```bash
mongod
```

**2. Start the backend** (runs on port 5000):

```bash
cd influencer-automation/backend
npm run dev
```

**3. Start the frontend** (runs on port 3000):

```bash
cd influencer-automation/frontend
npm start
```

**4. Open the dashboard**: Navigate to [http://localhost:3000](http://localhost:3000)

## Instagram Login

Before running any automation, you need to authenticate with Instagram:

```bash
cd influencer-automation/backend
npm run login
```

This opens a browser window for manual login. The session is saved to `session.json` for reuse.

## Automation Scripts

These can be triggered from the dashboard or run directly:

| Command | Description |
|---------|-------------|
| `npm run discover` | Discover influencers by hashtag |
| `npm run send-dm` | Send outreach DMs to discovered influencers |
| `npm run check-replies` | Check for and log replies |
| `npm run login` | Authenticate Instagram session |

## Ports

| Service | Port |
|---------|------|
| Backend API | 5000 |
| Frontend Dev Server | 3000 |
| MongoDB | 27017 |

## Dashboard Features

- **Stats Panel** – Aggregated campaign metrics
- **Action Buttons** – Start/stop automation processes
- **Influencer Table** – View, filter, and manage influencers
- **Settings Panel** – Update hashtags, filters, batch size
- **Logs Panel** – Real-time activity logs
