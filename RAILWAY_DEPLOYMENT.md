# Backend Deployment Guide - Railway

This guide will help you deploy the ERP-CRM backend to Railway with persistent storage and long-running server.

## Why Railway Instead of Vercel?

Railway provides:
- ✅ **Persistent disk storage** for SQLite database
- ✅ **Long-running server** (not serverless)
- ✅ **No cold starts** - better performance
- ✅ **Reliable authentication** - database persists between requests
- ✅ **Better for stateful applications**

### Issues with Vercel (Serverless)
- ❌ Database resets on cold starts
- ❌ Authentication tokens become invalid
- ❌ 401 errors due to lost user sessions
- ❌ Not ideal for SQLite-based applications

---

## Prerequisites

- Railway account (free tier works) - Sign up at [railway.app](https://railway.app)
- Git repository (GitHub, GitLab, or Bitbucket)
- Railway CLI (optional, for CLI deployment)

---

## Deployment Options

### Option 1: Deploy from GitHub (Recommended)

This is the easiest method with automatic deployments on git push.

#### Step 1: Push Your Code to GitHub

```bash
# If not already in a git repository
cd backend
git init
git add .
git commit -m "Prepare backend for Railway deployment"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

#### Step 2: Create New Project on Railway

1. Go to [railway.app](https://railway.app) and log in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account
5. Select your repository
6. Railway will detect it as a Node.js project

#### Step 3: Configure Root Directory

Since your backend is in a subdirectory:

1. In Railway dashboard, go to your project
2. Click on **Settings** tab
3. Under **Build Configuration**, set:
   - **Root Directory**: `backend`
4. Click **Save Changes**

#### Step 4: Set Environment Variables

1. In Railway dashboard, go to **Variables** tab
2. Add the following environment variables:

```
NODE_ENV=production
JWT_SECRET=<generate-a-strong-secret-key>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
PORT=5000
```

**Generate JWT_SECRET:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# Or use any strong random string generator
# Example: Jk9L3mP8nQw2Rt5Yx7Zv4Bc6Nd1Fg0Hj
```

#### Step 5: Deploy

Railway will automatically deploy your application. You can monitor the build logs in the **Deployments** tab.

Once deployed, you'll get a public URL like:
```
https://your-app-name.up.railway.app
```

Your API will be available at:
```
https://your-app-name.up.railway.app/api/v1
```

---

### Option 2: Deploy with Railway CLI

Install Railway CLI:

```bash
# Using npm
npm install -g @railway/cli

# Using Homebrew (Mac/Linux)
brew install railway
```

Deploy:

```bash
# Navigate to backend directory
cd backend

# Login to Railway
railway login

# Initialize Railway project
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=<your-secret-key>
railway variables set PORT=5000

# Deploy
railway up
```

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `JWT_SECRET` | Yes | Secret key for JWT tokens | `your-super-secret-key` |
| `PORT` | No | Server port (Railway sets this automatically) | `5000` |
| `JWT_EXPIRES_IN` | No | Access token expiration | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token expiration | `30d` |
| `FORCE_DEMO_SEED` | No | Force reseed demo data (1=enabled, 0=disabled) | `0` |

---

## Database Persistence

### SQLite on Railway

- Database file: `database.db` in the app root directory
- Stored on Railway's **persistent volume**
- Data persists between deployments and restarts
- Automatically initialized on first run
- Demo data seeded automatically if database is empty

### Demo Users

The backend automatically creates these demo accounts on first run:

- **Admin:** `admin@example.com` / `password`
- **Manager:** `manager1@example.com` / `password`
- **Agent 1:** `agent1@example.com` / `password`
- **Agent 2:** `agent2@example.com` / `password`
- **Customer:** `customer1@example.com` / `password`

---

## Testing Your Deployment

### 1. Health Check

```bash
curl https://your-app-name.up.railway.app/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "message": "API is running"
}
```

### 2. Login Test

```bash
curl -X POST https://your-app-name.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### 3. Test Authenticated Endpoint

```bash
curl https://your-app-name.up.railway.app/api/v1/users \
  -H "Authorization: Bearer <your-access-token>"
```

---

## Monitoring and Logs

### View Logs in Railway Dashboard

1. Go to your project in Railway dashboard
2. Click on **Deployments** tab
3. Select a deployment to view logs
4. Real-time logs show all console output

### View Logs with CLI

```bash
# View recent logs
railway logs

# Follow logs in real-time
railway logs --follow
```

---

## Updating Your Deployment

### Automatic Deployments (GitHub Integration)

Railway automatically deploys when you push to your main branch:

```bash
git add .
git commit -m "Update backend"
git push origin main
```

Railway will detect the push and automatically build and deploy.

### Manual Redeploy

In Railway dashboard:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on any previous deployment

Or via CLI:
```bash
railway up
```

---

## Scaling and Performance

### Free Tier Limits

- ✅ 512 MB RAM
- ✅ Shared CPU
- ✅ $5 free credit per month
- ✅ Sufficient for development and small production apps

### Upgrading

For production use with higher traffic:
1. Go to **Settings** tab in Railway dashboard
2. Increase resources under **Service Configuration**
3. Pricing is usage-based

---

## Troubleshooting

### Build Fails

**Issue:** TypeScript compilation errors

**Solution:**
1. Check build logs in Railway dashboard
2. Fix TypeScript errors locally
3. Test build locally: `npm run build`
4. Commit and push fixes

### Application Crashes on Start

**Issue:** Missing environment variables

**Solution:**
1. Check logs for error messages
2. Verify all required environment variables are set
3. Especially check `JWT_SECRET` is set

### Database Issues

**Issue:** Database not persisting

**Solution:**
- Railway provides persistent storage by default
- Check that `database.db` is being created in app root
- Database file location: `process.cwd() + '/database.db'`

### 502 Bad Gateway

**Issue:** Application not listening on correct port

**Solution:**
- Railway sets `PORT` environment variable automatically
- Your app should use `process.env.PORT || 5000`
- This is already configured in `src/server.ts`

### CORS Errors

**Issue:** Frontend can't connect to backend

**Solution:**
- Backend is configured to allow all origins (for MVP)
- Update frontend `VITE_API_BASE_URL` to Railway URL
- See frontend deployment guide for details

---

## Security Best Practices

### For Production Deployment

1. **Strong JWT Secret**
   ```bash
   # Generate a strong secret
   openssl rand -base64 64
   ```

2. **Update CORS Settings**
   - In `src/server.ts`, restrict CORS to your frontend domain
   ```typescript
   app.use(cors({
     origin: 'https://your-frontend-domain.vercel.app',
     credentials: true
   }));
   ```

3. **Enable Rate Limiting**
   - Already configured in the app
   - Adjust limits in `src/middleware/rateLimiter.ts`

4. **Environment Variables**
   - Never commit `.env` files
   - Use Railway dashboard to set secrets
   - Rotate JWT_SECRET periodically

---

## Connecting Frontend to Railway Backend

After backend deployment, update your frontend:

1. **Get Railway Backend URL**
   ```
   https://your-app-name.up.railway.app
   ```

2. **Update Frontend Environment Variables**
   
   In your Vercel frontend project:
   - Go to **Settings** → **Environment Variables**
   - Update `VITE_API_BASE_URL`:
   ```
   VITE_API_BASE_URL=https://your-app-name.up.railway.app/api/v1
   ```

3. **Redeploy Frontend**
   ```bash
   # Vercel will auto-deploy on push, or trigger manually
   vercel --prod
   ```

See `FRONTEND_UPDATE.md` for detailed frontend configuration.

---

## Migration from Vercel

If you previously deployed to Vercel:

1. ✅ Backend code is already updated for Railway
2. ✅ Vercel-specific files removed (`vercel.json`, `api/index.ts`)
3. ✅ Database configuration updated for persistent storage
4. ⚠️ Update frontend to use new Railway URL
5. ⚠️ Archive or delete old Vercel deployment

---

## Support and Resources

- **Railway Documentation:** [docs.railway.app](https://docs.railway.app)
- **Railway Discord:** [discord.gg/railway](https://discord.gg/railway)
- **Project Issues:** Check application logs in Railway dashboard

---

## Next Steps

After successful backend deployment:

1. ✅ Test all authentication endpoints
2. ✅ Verify database persistence (login, logout, login again)
3. ✅ Test CRUD operations (create, read, update, delete)
4. ✅ Update frontend environment variables
5. ✅ Deploy frontend to Vercel
6. ✅ Test end-to-end application flow

---

**Your backend is now running on Railway with persistent storage! 🎉**

No more authentication issues or database resets.

