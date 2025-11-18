# Vercel + Turso - Quick Start

**5-minute setup to fix your 401 authentication errors!**

---

## Why This Solution?

Your backend was having 401 errors on Vercel because the SQLite database was resetting. Turso provides persistent, distributed SQLite storage that works perfectly with Vercel's serverless environment.

---

## Setup Steps

### 1. Install Turso CLI (1 minute)

**Windows (PowerShell as Admin):**
```powershell
irm get.turso.tech/install.ps1 | iex
```

**Mac/Linux:**
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### 2. Create Turso Database (2 minutes)

```bash
# Login to Turso
turso auth login

# Create database
turso db create erp-crm-db

# Get database URL (save this!)
turso db show erp-crm-db --url
# Output: libsql://erp-crm-db-username.turso.io

# Generate auth token (save this!)
turso db tokens create erp-crm-db
# Output: eyJ... (long token string)

# Initialize schema
cd backend
turso db shell erp-crm-db < sqlite_schema.sql
```

### 3. Deploy to Vercel (2 minutes)

1. **Go to Vercel Dashboard:** [vercel.com](https://vercel.com)

2. **Import your GitHub repository**

3. **Set Root Directory:** `backend`

4. **Add Environment Variables:**
   ```
   NODE_ENV=production
   JWT_SECRET=<run: openssl rand -base64 32>
   TURSO_DATABASE_URL=<your-url-from-step2>
   TURSO_AUTH_TOKEN=<your-token-from-step2>
   ```

5. **Click Deploy**

### 4. Test It! (30 seconds)

```bash
# Replace with your Vercel URL
curl -X POST https://your-project.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

**Result:** You get a token! No more 401 errors! ✅

---

## Update Frontend

In your Vercel frontend project:

1. Go to Settings → Environment Variables
2. Update `VITE_API_BASE_URL`:
   ```
   VITE_API_BASE_URL=https://your-backend-project.vercel.app/api/v1
   ```
3. Redeploy frontend

---

## What You Get

✅ **Persistent database** - Data survives deployments
✅ **No 401 errors** - JWT tokens remain valid
✅ **SQLite compatible** - Same API you're used to
✅ **Free tier** - 9 GB storage, unlimited reads/writes
✅ **Global distribution** - Fast access worldwide

---

## Need Help?

**Full guide:** See `TURSO_VERCEL_DEPLOYMENT.md`

**Turso support:** [discord.gg/turso](https://discord.gg/turso)

---

**That's it! Your backend is now running on Vercel with persistent Turso database! 🎉**

