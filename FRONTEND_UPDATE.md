# Frontend Configuration - Connect to Railway Backend

This guide shows you how to update your frontend to connect to the new Railway backend.

---

## Overview

After deploying your backend to Railway, you need to update your frontend's API base URL to point to the new Railway endpoint instead of the old Vercel backend.

**Old Vercel URL (causing 401 errors):**
```
https://crm-backend-theta-fawn.vercel.app/api/v1
```

**New Railway URL (working!):**
```
https://your-app-name.up.railway.app/api/v1
```

---

## Update Frontend Environment Variables

### Option 1: Frontend Deployed on Vercel

If your frontend is deployed on Vercel, update the environment variables in Vercel dashboard:

#### Step-by-Step:

1. **Go to Vercel Dashboard:**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your frontend project

2. **Navigate to Settings:**
   - Click **Settings** in the top menu
   - Click **Environment Variables** in the left sidebar

3. **Update API URL:**
   - Find `VITE_API_BASE_URL` variable
   - Click **Edit** (pencil icon)
   - Update the value to your Railway URL:
     ```
     https://your-app-name.up.railway.app/api/v1
     ```
   - Click **Save**

4. **Apply to All Environments:**
   Make sure the variable is set for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. **Redeploy Frontend:**
   - Go to **Deployments** tab
   - Click **...** (three dots) on the latest deployment
   - Click **Redeploy**
   - Wait for deployment to complete (~1-2 minutes)

6. **Test Your Application:**
   - Open your frontend URL
   - Try logging in with: `admin@example.com` / `password`
   - No more 401 errors! ✅

---

### Option 2: Local Development

If you're running the frontend locally:

#### Step-by-Step:

1. **Navigate to Frontend Directory:**
   ```bash
   cd frontend
   ```

2. **Update Environment File:**
   
   Edit `frontend/.env` or `frontend/.env.local`:
   ```env
   VITE_API_BASE_URL=https://your-app-name.up.railway.app/api/v1
   ```

   If the file doesn't exist, create it:
   ```bash
   # Windows
   echo VITE_API_BASE_URL=https://your-app-name.up.railway.app/api/v1 > .env

   # Linux/Mac
   echo "VITE_API_BASE_URL=https://your-app-name.up.railway.app/api/v1" > .env
   ```

3. **Restart Dev Server:**
   ```bash
   # Stop the server (Ctrl+C)
   # Start it again
   npm run dev
   ```

4. **Test Locally:**
   - Open http://localhost:5173 (or your Vite port)
   - Login with: `admin@example.com` / `password`
   - Everything should work without 401 errors!

---

## Environment Variable Reference

### Current Environment Variable

```env
# Before (Vercel - causing 401 errors)
VITE_API_BASE_URL=https://crm-backend-theta-fawn.vercel.app/api/v1

# After (Railway - working!)
VITE_API_BASE_URL=https://your-app-name.up.railway.app/api/v1
```

### Important Notes:

1. **Include `/api/v1` at the end** - This is your API base path
2. **No trailing slash** - Don't add `/` at the end
3. **Use HTTPS** - Railway provides SSL automatically
4. **Must start with `VITE_`** - This is required for Vite to expose the variable to the browser

---

## Verify the Update

### Test Authentication:

1. **Open Frontend** (either deployed or local)

2. **Go to Login Page**

3. **Login with Test Credentials:**
   ```
   Email: admin@example.com
   Password: password
   ```

4. **Check Network Tab:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Try logging in
   - You should see requests going to your Railway URL
   - No 401 errors!

### Test Other Features:

Try these to ensure everything works:

- ✅ Login / Logout
- ✅ View customers list
- ✅ Create new customer
- ✅ View reservations
- ✅ Create new reservation
- ✅ View dashboard statistics
- ✅ Generate reports
- ✅ Export data

---

## Troubleshooting

### Issue: Still getting 401 errors

**Solutions:**
1. Clear browser cache and cookies
2. Logout and login again
3. Verify the environment variable is correct
4. Check Railway backend is running (visit the URL in browser)
5. Redeploy frontend after changing environment variables

### Issue: Can't connect to backend

**Check:**
1. Railway backend URL is correct
2. Backend is deployed and running
3. No typos in the environment variable
4. Environment variable includes `/api/v1` at the end

### Issue: Environment variable not updating

**For Vercel:**
- Must redeploy after changing environment variables
- Check variable is set for the correct environment (Production/Preview)

**For Local:**
- Restart dev server after changing `.env`
- Ensure file is named `.env` or `.env.local`
- Variable must start with `VITE_`

### Issue: CORS errors

**Solution:**
- Railway backend is already configured to allow all origins
- If you still see CORS errors, check Railway logs
- Backend CORS is set in `backend/src/server.ts`

---

## Multiple Environments

If you want different backends for different environments:

### Vercel Environment Variables:

```
# Production
VITE_API_BASE_URL=https://your-app-production.up.railway.app/api/v1

# Preview (for PR previews)
VITE_API_BASE_URL=https://your-app-staging.up.railway.app/api/v1

# Development
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Set each one in Vercel dashboard for the appropriate environment.

### Local `.env` Files:

```bash
# .env.development (local dev)
VITE_API_BASE_URL=http://localhost:5000/api/v1

# .env.production (production build)
VITE_API_BASE_URL=https://your-app-name.up.railway.app/api/v1
```

---

## Frontend Code (Optional Check)

Your frontend code should be using the environment variable. Verify in your API service file (usually `src/services/api.ts` or similar):

```typescript
// Should look something like this:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// Or:
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
```

**You don't need to change any code!** Just update the environment variable.

---

## Security Considerations

### For Production:

1. **Use HTTPS** - Railway provides this automatically
2. **Secure JWT_SECRET** - Use a strong random string on Railway
3. **CORS Configuration** - Update backend to only allow your frontend domain:

   In `backend/src/server.ts`:
   ```typescript
   app.use(cors({
     origin: 'https://your-frontend-domain.vercel.app',
     credentials: true
   }));
   ```

4. **Environment Variables** - Never commit secrets to git
5. **Token Storage** - Frontend should store tokens securely (localStorage or httpOnly cookies)

---

## Complete Migration Checklist

- [ ] Backend deployed to Railway
- [ ] Railway environment variables set (JWT_SECRET, NODE_ENV)
- [ ] Railway backend is running and accessible
- [ ] Frontend environment variable updated with Railway URL
- [ ] Frontend redeployed (if on Vercel)
- [ ] Test login - no 401 errors
- [ ] Test CRUD operations - create, read, update, delete
- [ ] Test authenticated endpoints
- [ ] Test logout and login again - sessions persist!
- [ ] Verify database persistence (create data, refresh, data still there)
- [ ] Update any documentation with new URL
- [ ] (Optional) Archive old Vercel backend deployment

---

## Common Frontend Deployment Commands

### Vercel:

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Check deployment status
vercel ls
```

### Local Build:

```bash
cd frontend

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Benefits of Railway Backend

Now that your backend is on Railway, you'll notice:

✅ **No more 401 errors** - Database persists, JWT tokens remain valid
✅ **Faster response times** - No cold starts
✅ **Reliable sessions** - User sessions persist between requests
✅ **Better performance** - Always-on server
✅ **Easier debugging** - Access to persistent logs
✅ **Database persistence** - Data survives deployments and restarts

---

## Need Help?

- **Railway Backend Issues:** Check `RAILWAY_DEPLOYMENT.md`
- **Environment Variables:** See `ENV_VARS_RAILWAY.md`
- **Quick Start:** See `RAILWAY_QUICKSTART.md`
- **Railway Support:** [discord.gg/railway](https://discord.gg/railway)

---

**Your frontend is now connected to the Railway backend! 🎉**

No more authentication issues!

