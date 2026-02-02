# Matlance CRM

A high-performance SaaS CRM for lead management, client portals, email campaigns, mailbox sync, and live video meetings (SFU/WebRTC).

## Project Overview (Context for new sessions)
This is a MERN CRM with a React/Vite frontend and an Express/MongoDB backend. It includes authentication, lead/client/task management, campaigns, payments, mailbox sync, and a full backup/restore system. Key flows:

- Auth: JWT login, password reset via email; users stored in MongoDB with bcrypt password hashes.
- Email: Uses Settings > Email Accounts or SMTP env vars; reset links use `APP_BASE_URL` when generating URLs.
- Backup/Restore:
  - Export: downloads a ZIP of all collections (`/api/v1/backup/export`).
  - Import: merges data into the existing DB (does **not** delete current data). Existing records are preserved; only new items are inserted. Users are matched by `_id` and email so existing passwords remain valid.
- Admin seed: if no admin user exists, it is seeded from `server/.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).

If login or reset email fails after imports, check SMTP settings and `APP_BASE_URL`, and confirm users were not replaced.

## Project Structure
```
my-project/
+-- client/                 # Frontend (Vite + React)
+-- server/                 # Backend (Express + MongoDB)
+-- package.json            # Root scripts to run both
```

## Quick Start (Local)

### 1) Install dependencies
From the project root:
```
npm install
npm --prefix client install
npm --prefix server install
```

### 2) Configure environment
Backend: `server/.env`
```
NODE_ENV=development
PORT=7000
MONGO_URI=mongodb://localhost:27017/matlance
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=5d
CORS_ORIGINS=http://localhost:5173
ADMIN_EMAIL=admin@matlance.com
ADMIN_PASSWORD=Admin4568
ADMIN_NAME=Admin

# Optional: SFU (mediasoup)
SFU_ENABLED=true
MEDIASOUP_ANNOUNCED_IP=YOUR_PUBLIC_IP_OR_DOMAIN
MEDIASOUP_RTC_MIN_PORT=40000
MEDIASOUP_RTC_MAX_PORT=49999
```

Frontend: `client/.env` (or `client/.env.local`)
```
VITE_API_URL=/api
VITE_SFU_ENABLED=true
# Optional TURN for production:
# VITE_TURN_URL=turn:your-domain.com:3478
# VITE_TURN_USER=turnuser
# VITE_TURN_PASS=turnpass
```

### 3) Start MongoDB
Make sure MongoDB is running locally or point `MONGO_URI` to Atlas.

### 4) Run both apps (single command)
From the project root:
```
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:7000`

### Default Admin Login
Use the values from `server/.env`:
```
ADMIN_EMAIL=admin@matlance.com
ADMIN_PASSWORD=Admin4568
```

## SFU (Mediasoup) Notes
For local testing, SFU works without TURN.
For production:
- Set `MEDIASOUP_ANNOUNCED_IP` to your public IP/domain.
- Open UDP ports 40000–49999 (or set your own range in env).
- Add TURN credentials (recommended for strict NATs).

## Fix: "Property 'env' does not exist on type 'ImportMeta'"
If you see this error in VS Code:
1) Make sure you open the **client** folder or the repo root (not a stale workspace).
2) Confirm these files exist:
   - `client/env.d.ts`
   - `client/tsconfig.json` contains `"types": ["node", "vite/client"]`
3) Close any old file path like `utils/api.ts` (the correct file is `client/utils/api.ts`).
4) In VS Code: `Ctrl+Shift+P` ? **TypeScript: Restart TS server**.

## Scripts
From project root:
```
npm run dev       # run backend + frontend
npm run server    # backend only
npm run client    # frontend only
```

## Environment Variables

Frontend (`client/.env` or `client/.env.local`):
```
VITE_API_URL=/api
VITE_SFU_ENABLED=true
```

Backend (`server/.env`):
```
NODE_ENV=development
PORT=7000
MONGO_URI=mongodb://localhost:27017/matlance
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=5d
CORS_ORIGINS=http://localhost:5173
ADMIN_EMAIL=admin@matlance.com
ADMIN_PASSWORD=
ADMIN_NAME=Admin

SFU_ENABLED=true
MEDIASOUP_ANNOUNCED_IP=
MEDIASOUP_RTC_MIN_PORT=40000
MEDIASOUP_RTC_MAX_PORT=49999
```

## Architecture

### Frontend
- Framework: React (Vite)
- Styling: Tailwind CSS
- State Management: Zustand
- Routing: React Router DOM

### Backend
- Runtime: Node.js
- Framework: Express.js
- Database: MongoDB (Mongoose)
- Authentication: JWT (JSON Web Tokens)
- Email: SMTP (Nodemailer)
- File storage: S3
- Meetings: WebRTC + SFU (mediasoup)

## Production Deploy Notes (CloudPanel on Oracle VPS)

1. Build frontend:
   - `cd client`
   - `npm install`
   - `npm run build`
   - Upload the `dist/` folder to `/home/cloudpanel/htdocs/your-domain.com/dist`

2. Run backend with PM2:
   - `cd server`
   - `npm install`
   - `pm2 start index.js --name matlance-api`
   - `pm2 save`

3. Nginx reverse proxy
   - Use `client/deploy/nginx.cloudpanel.conf` as a base
   - Point `server_name` and `root` to your domain/path

4. Set production env:
   - `NODE_ENV=production`
   - Strong `JWT_SECRET`
   - SMTP + S3 credentials
   - `CORS_ORIGINS=https://your-domain.com`
   - `MEDIASOUP_ANNOUNCED_IP=your.public.ip`
   - Open UDP ports for mediasoup

### CloudPanel Domain + MERN (Detailed Step-by-Step)
Use this when you want a real domain (e.g. `yourdomain.com`) working on your Oracle VPS with CloudPanel.

#### A) DNS (point domain to VPS)
At your domain provider (Namecheap, GoDaddy, Cloudflare):
- A record: `@` -> `YOUR_VPS_PUBLIC_IP`
- A record: `www` -> `YOUR_VPS_PUBLIC_IP`
- Optional API subdomain: A record `api` -> `YOUR_VPS_PUBLIC_IP`

Wait 5-30 minutes for DNS to propagate.

#### B) Create site in CloudPanel
1. Login to CloudPanel.
2. Go to **Sites** -> **Add Site**.
3. Choose **Node.js**.
4. Enter your domain: `yourdomain.com` (and `www.yourdomain.com` if asked).
5. Set Document Root to `/home/cloudpanel/htdocs/yourdomain.com/public`.
6. Create the site.

#### C) Upload backend (server)
Copy your backend to:
`/home/cloudpanel/htdocs/yourdomain.com/api`

Install dependencies:
```
cd /home/cloudpanel/htdocs/yourdomain.com/api
npm install
```

Set `server/.env` for production:
```
NODE_ENV=production
PORT=7000
MONGO_URI=mongodb://localhost:27017/matlance   # or Atlas
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=5d
CORS_ORIGINS=https://yourdomain.com
ADMIN_EMAIL=admin@matlance.com
ADMIN_PASSWORD=Admin4568
ADMIN_NAME=Admin
APP_BASE_URL=https://yourdomain.com
```

#### D) Build frontend (client)
On your local machine (or VPS):
```
cd client
npm install
npm run build
```

Upload `client/dist` contents to:
`/home/cloudpanel/htdocs/yourdomain.com/public`

Make sure `client/.env` has:
```
VITE_API_URL=/api
```

#### E) Configure Node app in CloudPanel
In CloudPanel, open your site and set:
- **App Root**: `/home/cloudpanel/htdocs/yourdomain.com/api`
- **App Port**: `7000`
- **Start Command**: `node index.js` (or `npm start` if defined)

Start the Node app.

#### F) Reverse proxy (frontend + backend on same domain)
Edit the site Nginx config in CloudPanel and add:
```
location /api/ {
    proxy_pass http://127.0.0.1:7000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

Reload Nginx from CloudPanel.

#### G) Enable SSL
CloudPanel -> your site -> **SSL/TLS** -> **Let's Encrypt** -> Enable.

#### H) Verify
Open:
- `https://yourdomain.com`
- `https://yourdomain.com/api/v1/auth/me` (should return 401 without token)

If you see a white screen, check browser console errors and backend logs.

## Docker (Optional)

- Frontend: `client/Dockerfile`
- Backend: `server/Dockerfile`
- Compose: `docker-compose.yml`

### Docker (Local Quick Start)
Use this to run the full stack on your computer with one command.

#### 1) Requirements
- Docker Desktop installed and running.

#### 2) Configure backend env
Update `server/.env`:
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://host.docker.internal:27017/matlance
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=5d
CORS_ORIGINS=http://localhost:3000
ADMIN_EMAIL=admin@matlance.com
ADMIN_PASSWORD=Admin4568
ADMIN_NAME=Admin
```

Notes:
- If MongoDB runs on your host machine, use `host.docker.internal`.
- If you use Atlas, replace `MONGO_URI` with your Atlas connection string.

#### 3) Build and run
From project root:
```
docker compose up --build
```

#### 4) Open app
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

#### 5) Stop
```
docker compose down
```

#### 6) Custom API URL (optional)
The compose file sets `VITE_API_URL=http://localhost:5000` for local dev.
If you reverse proxy in production, set `VITE_API_URL=/api`.

### Share With a Friend (Docker)
Use this if you want someone else to run the full app quickly.

#### Option A: GitHub (recommended)
Your steps:
1) Push the repo to GitHub.
2) Send the repo URL to your friend.

Friend's steps:
```
git clone <YOUR_REPO_URL>
cd <REPO_FOLDER>
docker compose up --build
```
Open: `http://localhost:3000`

#### Option B: ZIP
Your steps:
1) Delete all `node_modules` folders.
2) Zip the project.
3) Send the ZIP.

Friend's steps:
1) Unzip.
2) Open a terminal in the folder.
3) Run:
```
docker compose up --build
```
Open: `http://localhost:3000`

#### Requirements for friend
- Docker Desktop installed and running.

## API Summary

Base URL: `/api/v1`

- Auth: `POST /auth/login`, `GET /auth/me`
- Email: `POST /email/send`
- Leads: `GET/POST /leads`, `PATCH /leads/:id`, `DELETE /leads`, `POST /leads/import`
- Clients: `GET/POST /clients`, `PATCH /clients/:id`, `DELETE /clients`, `POST /clients/convert`, `POST /clients/import`, `POST /clients/:id/upload`
- Tasks: `GET/POST /tasks`, `PATCH/DELETE /tasks/:id`
- Meetings: `GET/POST /meetings`, `PATCH/DELETE /meetings/:id`
- Campaigns: `GET/POST /campaigns`, `PATCH/DELETE /campaigns/:id`, `POST /campaigns/:id/send`
- Templates: `GET/POST /templates`, `PATCH/DELETE /templates/:id`
- Payments: `GET/POST /payments`, `PATCH/DELETE /payments/:id`, `POST /payments/:id/send-invoice`
- Settings: `GET/PATCH /settings`
- Team: `GET/POST /users`, `PATCH/DELETE /users/:id`
- Inbox: `GET/POST /inbox`
- Audit: `GET/POST /audit`

## Email Tracking (Opens & Clicks)

Open and click tracking use a pixel and tracked links. The tracking URL must be publicly reachable by email clients (Gmail blocks localhost).

Two options:
1. Set PUBLIC_BASE_URL (or APP_BASE_URL) in your server environment to your public URL.
2. Or set Settings -> General -> Public Tracking URL to your public domain (recommended for local dev + production).

When deploying, keep this value set to your production domain (e.g. https://yourdomain.com) so tracking works without any extra changes.


