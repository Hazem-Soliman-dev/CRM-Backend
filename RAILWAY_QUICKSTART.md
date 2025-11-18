# Railway Deployment - Quick Start Guide

Your backend is now ready to deploy to Railway! Follow these simple steps to get your API running.

---

## 🚀 Quick Deploy Steps

### Step 1: Sign up for Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with your GitHub account (recommended)
3. No credit card required for the free tier

### Step 2: Push Code to GitHub (if not already done)

```bash
# Navigate to your project
cd D:\courses\Projects\ERP-CRM-Project

# Initialize git (if not already a repo)
git init
git add .
git commit -m "Prepare backend for Railway deployment"

# Push to GitHub
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 3: Create Project on Railway

1. **Log in to Railway Dashboard:** [railway.app/dashboard](https://railway.app/dashboard)

2. **Click "New Project"**

3. **Select "Deploy from GitHub repo"**

4. **Authorize Railway** to access your GitHub account if prompted

5. **Select your repository** from the list

6. **Configure the service:**
   - Railway will detect your Node.js project automatically
   - Set **Root Directory** to: `backend`
   - Click **Deploy**

### Step 4: Set Environment Variables

1. In your Railway project, click on your service

2. Go to **Variables** tab

3. Click **+ New Variable** and add these:

```
NODE_ENV=production
JWT_SECRET=<your-secret-here>
PORT=5000
```

**Generate a strong JWT_SECRET:**
- Option 1: Run in terminal: `openssl rand -base64 32`
- Option 2: Use this example: `Jk9L3mP8nQw2Rt5Yx7Zv4Bc6Nd1Fg0Hj8Kl2Mn5Pq9Rs`
- **Important:** Use a unique secret, don't copy the example!

4. Click **Add** after each variable

### Step 5: Deploy!

Railway will automatically:
1. Build your TypeScript code
2. Install dependencies
3. Start the server
4. Provide a public URL

**View deployment progress:**
- Go to **Deployments** tab
- Watch the build logs
- Wait for "Deployment successful" message (usually 2-3 minutes)

### Step 6: Get Your API URL

Once deployed, you'll get a URL like:
```
https://your-app-name.up.railway.app
```

Your API endpoints will be:
```
https://your-app-name.up.railway.app/api/v1/auth/login
https://your-app-name.up.railway.app/api/v1/users
https://your-app-name.up.railway.app/api/v1/customers
... etc
```

---

## ✅ Test Your Deployment

### 1. Test Login

Open your browser or use curl:

```bash
curl -X POST https://your-app-name.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }'
```

**Expected response:** You'll get an access token and user information

### 2. Test Authenticated Endpoint

```bash
curl https://your-app-name.up.railway.app/api/v1/users \
  -H "Authorization: Bearer <your-token-from-login>"
```

**Expected response:** List of users

---

## 🎨 Update Your Frontend

Now that your backend is on Railway, update your frontend to use it:

### For Vercel Frontend:

1. Go to your **Vercel project dashboard**
2. Go to **Settings** → **Environment Variables**
3. Update or add:
   ```
   VITE_API_BASE_URL=https://your-app-name.up.railway.app/api/v1
   ```
4. **Redeploy frontend:**
   - Go to **Deployments** tab
   - Click **...** on latest deployment
   - Click **Redeploy**

### For Local Development:

1. Update `frontend/.env`:
   ```
   VITE_API_BASE_URL=https://your-app-name.up.railway.app/api/v1
   ```

2. Restart your dev server:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 📊 Monitor Your Application

### View Logs:

1. Go to your Railway project
2. Click on your service
3. Go to **Deployments** tab
4. Click on latest deployment
5. See real-time logs

### Check Database:

- Database file is stored persistently at: `backend/database.db`
- Demo data is auto-seeded on first run
- Data persists between deployments

---

## 🔄 Deploy Updates

Whenever you push changes to GitHub, Railway automatically deploys:

```bash
# Make changes to your backend
cd backend
# ... edit files ...

# Commit and push
git add .
git commit -m "Update backend"
git push origin main
```

Railway will:
1. Detect the push
2. Build and deploy automatically
3. Your API URL stays the same
4. Zero downtime deployment

---

## 💰 Pricing & Free Tier

**Railway Free Tier:**
- $5 free credit per month
- 512 MB RAM
- Shared CPU
- Perfect for development and small production apps

**Typical usage for this app:**
- Backend server: ~$3-4/month
- Well within free tier

**To check usage:**
1. Go to Railway dashboard
2. Click on your project
3. View usage in **Settings** tab

---

## 🐛 Troubleshooting

### Build fails?
- Check build logs in Railway dashboard
- Verify `package.json` has correct dependencies
- Ensure TypeScript compiles locally: `npm run build`

### App crashes on start?
- Check deployment logs
- Verify environment variables are set (especially `JWT_SECRET`)
- Make sure `PORT` is set to `5000` or let Railway set it automatically

### Can't connect from frontend?
- Verify Railway URL is correct
- Check CORS settings (already configured to allow all origins)
- Test API directly with curl or Postman first

### Database not persisting?
- Check logs for database initialization messages
- Railway provides persistent storage by default
- Database file: `backend/database.db`

### 401 Authentication errors?
- This was the issue with Vercel - should be fixed now!
- Railway provides persistent storage, so sessions persist
- JWT tokens remain valid between requests

---

## 📚 Next Steps

1. ✅ **Test all features** - Login, CRUD operations, reports
2. ✅ **Update frontend** - Point to Railway backend URL
3. ✅ **Test end-to-end** - Frontend + Backend working together
4. ✅ **Monitor logs** - Check for any errors
5. ✅ **Set up custom domain** (optional) - Railway supports custom domains

---

## 🎉 You're Done!

Your backend is now running on Railway with:
- ✅ Persistent SQLite database
- ✅ No more cold start issues
- ✅ No more 401 authentication errors
- ✅ Reliable, always-on server
- ✅ Automatic deployments from GitHub

**Your API is live and ready to use!**

---

## 📖 Additional Resources

- **Full Deployment Guide:** See `RAILWAY_DEPLOYMENT.md`
- **Environment Variables:** See `ENV_VARS_RAILWAY.md`
- **Frontend Update:** See `FRONTEND_UPDATE.md`
- **Railway Docs:** [docs.railway.app](https://docs.railway.app)

---

**Need help?** Check the full deployment guide or Railway documentation.

