# Backend Deployment Guide - Vercel

This guide will help you deploy the ERP-CRM backend to Vercel as a serverless API.

## Prerequisites

- Node.js 18+ installed locally
- Vercel account (free tier works)
- Vercel CLI installed: `npm install -g vercel`

## Quick Deploy to Vercel

### Option 1: Deploy with Vercel CLI (Recommended)

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Setup and deploy? **Yes**
   - Which scope? Select your account
   - Link to existing project? **No**
   - Project name? **erp-crm-backend** (or your choice)
   - Directory? **./backend** (or leave as . if already in backend folder)
   - Override settings? **No**

4. **Set environment variables:**
   ```bash
   vercel env add JWT_SECRET production
   ```
   Enter a strong random secret (e.g., generate one with `openssl rand -base64 32`)

5. **Deploy to production:**
   ```bash
   vercel --prod
   ```

6. **Your API is live!** 🎉
   - You'll get a URL like: `https://erp-crm-backend-xxx.vercel.app`
   - API endpoint: `https://erp-crm-backend-xxx.vercel.app/api/v1`

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Set the root directory to `backend`
4. Add environment variables:
   - `JWT_SECRET`: Your secret key (required)
   - `NODE_ENV`: `production`
5. Click "Deploy"

## Environment Variables

Required variables to set in Vercel dashboard or CLI:

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT token generation | `your-super-secret-key-change-me` |
| `NODE_ENV` | Environment mode | `production` |
| `JWT_EXPIRES_IN` | Token expiration (optional) | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration (optional) | `30d` |

## Database

This backend uses **SQLite with automatic seeding** for MVP demos:

- Database is stored in `/tmp/database.db` on Vercel serverless
- Database and demo data are **auto-created on cold start**
- Data persists during the function's lifecycle but resets on redeployment
- Perfect for demos - always has fresh demo data available

### Demo Users

The backend automatically creates these demo accounts:

- **Admin:** `admin@example.com` / `password`
- **Manager:** `manager1@example.com` / `password`
- **Agent 1:** `agent1@example.com` / `password`
- **Agent 2:** `agent2@example.com` / `password`
- **Customer:** `customer1@example.com` / `password`

## API Testing

Once deployed, test your API:

```bash
# Health check
curl https://your-backend-url.vercel.app/api/v1/health

# Login
curl -X POST https://your-backend-url.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

## Connecting Frontend

After deployment, you'll use the backend URL in your frontend:

1. Copy your Vercel backend URL
2. In frontend, set environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend-url.vercel.app/api/v1
   ```

## Troubleshooting

### Cold Starts
- First request after inactivity may take 10-20 seconds
- This is normal for serverless - database initialization happens on cold start

### Database Issues
- Database resets on each deploy (expected behavior for MVP)
- Data persists between requests during active usage
- To force reseed, redeploy the function

### CORS Errors
- Backend is configured to allow all origins for MVP
- If issues persist, check browser console for specific errors

### Logs
View logs in Vercel dashboard or via CLI:
```bash
vercel logs your-backend-url.vercel.app
```

## Local Development

To test locally before deploying:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file from template:
   ```bash
   cp env.template .env
   ```

3. Update `.env` with your values

4. Run development server:
   ```bash
   npm run dev
   ```

5. Test serverless function locally:
   ```bash
   vercel dev
   ```

## Upgrading to Production Database

For production use beyond MVP, consider migrating to:
- **Vercel Postgres** - Integrated with Vercel
- **PlanetScale** - MySQL-compatible serverless
- **Supabase** - PostgreSQL with real-time features

This would require updating `src/config/database.ts` to use the new database instead of SQLite.

## Support

For issues or questions:
- Check Vercel logs for errors
- Ensure all environment variables are set
- Verify the build completed successfully

