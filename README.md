# ⚽ Survivor — World Cup 2026

A survival prediction game for ~25 friends. Pick a team each round. They win → you survive. They lose or draw → you're eliminated. Never reuse a team. Last one standing wins.

---

## Tech Stack

- **Next.js 14** (App Router)
- **PostgreSQL** via [Neon](https://neon.tech) (free tier)
- **NextAuth.js** (credentials provider)
- **Tailwind CSS** (dark theme, mobile-first)

---

## Quick Start (Local Dev)

### 1. Install dependencies

```bash
cd survivor-app
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
DATABASE_URL=postgresql://...  # Your Neon connection string
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
```

### 3. Initialize the database

Creates the schema, seeds all 48 World Cup teams, and creates the admin account.

```bash
npm run setup
```

Admin credentials: **username:** `Survivor` / **password:** `Argentina`

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Adding the Welcome Image

Drop your image at:

```
public/welcome.jpg
```

This image appears on the "BIENVENIDO A SURVIVOR" splash screen shown to each player on their first login. Any JPEG works. Recommended: min 1080×1920px portrait for mobile.

---

## Deploy to Render

### Prerequisites
1. A [Neon](https://neon.tech) PostgreSQL database (free tier works fine for 25 users)
2. A [Render](https://render.com) account

### Steps

1. **Push to GitHub** (or GitLab)

2. **Create Web Service on Render**
   - New → Web Service → Connect your repo
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`

3. **Set Environment Variables** in Render dashboard:
   - `DATABASE_URL` — your Neon connection string
   - `NEXTAUTH_URL` — `https://your-app-name.onrender.com`
   - `NEXTAUTH_SECRET` — run `openssl rand -base64 32` locally and paste result
   - `NODE_ENV` — `production`

4. **Initialize the database** after first deploy — run locally with prod DATABASE_URL:
   ```bash
   NODE_ENV=production node scripts/setup.js
   ```

5. **Add the welcome image** — commit `public/welcome.jpg` to your repo before deploying.

> **Note:** Render's free tier spins down after 15min of inactivity. For active game use during the World Cup, consider the $7/mo "Starter" plan to keep it always-on.

---

## Game Flow

### Admin (`/admin`)
1. **Create a round** — give it a name (e.g. "Fecha 1 - Grupo A") and deadline
2. **Round is open** — players can pick their team
3. **Close picks** manually, or wait for the deadline to pass
4. **Enter results** — mark each picked team as Win / Draw / Loss
5. **Resolve round** — system auto-eliminates players whose team didn't win

### Players
1. Register at `/login`
2. Dashboard shows current round, survivor board, and pick history
3. Tap **ELEGIR EQUIPO** to pick (only when round is open and you're alive)
4. Once you pick, you can see everyone else's picks for that round
5. Alive players can send banter to eliminated players via the banter wall

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Players and admin |
| `rounds` | Game rounds ("fechas") |
| `teams` | 48 World Cup 2026 teams |
| `picks` | One pick per player per round |
| `results` | Win/draw/loss per team per round |
| `messages` | Banter wall messages |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXTAUTH_URL` | Full URL of your app (https:// in prod) |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `NODE_ENV` | `development` or `production` |
