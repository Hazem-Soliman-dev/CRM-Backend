# Vercel + Turso Deployment Guide

Deploy your backend to Vercel with Turso database for persistent, distributed SQLite storage.

---

## Why Turso + Vercel?

✅ **Persistent Database** - Data survives across deployments and serverless invocations
✅ **SQLite Compatible** - Keep your existing SQLite schema and queries  
✅ **Distributed** - Low-latency access from Vercel edge locations
✅ **Serverless-Friendly** - Designed for serverless environments
✅ **Free Tier** - 9 GB storage, 500 databases, unlimited reads/writes
✅ **Solves 401 Errors** - Database persists, so JWT tokens remain valid

---

## Quick Start (15 minutes)

### Step 1: Create Turso Database

1. **Sign up for Turso:**
   - Go to [turso.tech](https://turso.tech)
   - Click "Get Started" or "Sign Up"
   - Sign up with GitHub (recommended)

2. **Install Turso CLI:**
   ```bash
   # Windows (PowerShell as Admin)
   irm get.turso.tech/install.ps1 | iex
   
   # Mac/Linux
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

3. **Login to Turso:**
   ```bash
   turso auth login
   ```
   This will open your browser to authenticate.

4. **Create your database:**
   ```bash
   turso db create erp-crm-db
   ```
   
   Output will show:
   ```
   Created database erp-crm-db at [location]
   URL: libsql://erp-crm-db-[username].turso.io
   ```

5. **Get database URL:**
   ```bash
   turso db show erp-crm-db --url
   ```
   Save this URL! Example: `libsql://erp-crm-db-username.turso.io`

6. **Generate auth token:**
   ```bash
   turso db tokens create erp-crm-db
   ```
   Save this token! It's a long string starting with `eyJ...`

7. **Initialize schema (one-time):**
   ```bash
   # First, ensure you're in the backend directory
   cd backend
   
   # Upload your schema to Turso
   turso db shell erp-crm-db < sqlite_schema.sql
   ```

---

### Step 2: Deploy to Vercel

1. **Push code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Add Turso database support"
   git push origin main
   ```

2. **Go to Vercel Dashboard:**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"

3. **Import your repository:**
   - Select your GitHub repository
   - Click "Import"

4. **Configure project:**
   - **Root Directory:** `backend`
   - **Framework Preset:** Other
   - **Build Command:** `npm run build`
   - **Output Directory:** Leave empty
   - **Install Command:** `npm install`

5. **Add Environment Variables:**
   Click "Environment Variables" and add:
   
   ```
   NODE_ENV=production
   JWT_SECRET=<generate-strong-secret>
   TURSO_DATABASE_URL=<your-turso-url-from-step1>
   TURSO_AUTH_TOKEN=<your-turso-token-from-step1>
   ```
   
   **Generate JWT_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

6. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Get your URL: `https://your-project-name.vercel.app`

---

### Step 3: Test Your Deployment

1. **Test login:**
   ```bash
   curl -X POST https://your-project-name.vercel.app/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "password": "password"
     }'
   ```

2. **Test persistence:**
   - Login, create a customer
   - Wait a few minutes (cold start)
   - Login again - **No 401 errors!** ✅
   - Your data is still there! ✅

---

## Turso Database Management

### View your data:

```bash
# Open SQL shell
turso db shell erp-crm-db

# Run queries
SELECT * FROM users;
SELECT COUNT(*) FROM customers;
```

### Create a backup:

```bash
# Download current database
turso db shell erp-crm-db --output backup.db
```

### View database info:

```bash
# Show database details
turso db show erp-crm-db

# List all databases
turso db list
```

### Monitor usage:

```bash
# Check database size and usage
turso db inspect erp-crm-db
```

---

## Local Development

For local development, you can use local SQLite (no Turso needed):

1. **Create `.env` file:**
   ```env
   NODE_ENV=development
   JWT_SECRET=dev-secret-key
   PORT=5000
   # Leave Turso vars empty for local SQLite
   ```

2. **Run locally:**
   ```bash
   npm run dev
   ```
   
   This will use local `database.db` file.

### Test with Turso locally (optional):

If you want to test Turso connection locally:

```env
NODE_ENV=development
JWT_SECRET=dev-secret-key
PORT=5000
TURSO_DATABASE_URL=libsql://erp-crm-db-username.turso.io
TURSO_AUTH_TOKEN=your-token-here
```

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `JWT_SECRET` | Yes | JWT token secret | `Jk9L3mP8nQw2Rt...` |
| `TURSO_DATABASE_URL` | Yes (Vercel) | Turso database URL | `libsql://db-name.turso.io` |
| `TURSO_AUTH_TOKEN` | Yes (Vercel) | Turso auth token | `eyJ...` |
| `PORT` | No | Server port | `5000` |
| `JWT_EXPIRES_IN` | No | Token expiration | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token expiration | `30d` |

---

## Update Frontend

After deploying, update your frontend to use the new Vercel URL:

### For Vercel Frontend:

1. Go to your frontend project in Vercel dashboard
2. Settings → Environment Variables
3. Update or add:
   ```
   VITE_API_BASE_URL=https://your-backend-project.vercel.app/api/v1
   ```
4. Redeploy frontend

### For Local Development:

Update `frontend/.env`:
```env
VITE_API_BASE_URL=https://your-backend-project.vercel.app/api/v1
```

---

## Troubleshooting

### Build fails on Vercel

**Check:**
- Build logs in Vercel dashboard
- Ensure `@libsql/client` is in dependencies
- Verify TypeScript compiles: `npm run build`

### Can't connect to Turso

**Check:**
- `TURSO_DATABASE_URL` is correct (starts with `libsql://`)
- `TURSO_AUTH_TOKEN` is valid (long string starting with `eyJ`)
- Token has not expired (create new one with `turso db tokens create`)

### Schema not initialized

**Run:**
```bash
turso db shell erp-crm-db < sqlite_schema.sql
```

### Still getting 401 errors

**Possible causes:**
1. JWT_SECRET changed between deployments (regenerate tokens)
2. Turso connection failing (check logs)
3. Schema not initialized (see above)

### Database query errors

**Check:**
- Schema is properly initialized
- Tables exist: `turso db shell erp-crm-db` then `SELECT name FROM sqlite_master WHERE type='table';`
- libSQL compatibility (most SQLite queries work, some advanced features may differ)

---

## Turso Pricing

### Free Tier (Forever):
- ✅ 9 GB total storage
- ✅ 500 databases
- ✅ 3 locations
- ✅ Unlimited reads
- ✅ Unlimited writes
- ✅ Perfect for this app!

### Paid Plans (if needed):
- **Scaler:** $29/month - 50 GB storage, more locations
- **Pro:** Custom pricing for enterprise needs

**For this app:** Free tier is more than enough!

---

## Advanced: Multiple Environments

Create separate databases for different environments:

```bash
# Production database
turso db create erp-crm-prod

# Staging database
turso db create erp-crm-staging

# Development database (optional, or use local SQLite)
turso db create erp-crm-dev
```

Set appropriate env vars in Vercel for each environment.

---

## Migrations and Schema Updates

When you need to update your database schema:

1. **Update `sqlite_schema.sql`** with your changes

2. **For Turso, run migration:**
   ```bash
   # Option 1: Replace entire schema (CAUTION: may lose data)
   turso db shell erp-crm-db < sqlite_schema.sql
   
   # Option 2: Run specific migration SQL
   turso db shell erp-crm-db
   # Then paste your ALTER TABLE or other migration commands
   ```

3. **Test locally first:**
   - Test migration on local SQLite
   - Test migration on Turso dev database
   - Then apply to production

4. **Redeploy Vercel** (if code changes were needed)

---

## Monitoring and Logs

### View Vercel Logs:
1. Go to Vercel dashboard
2. Select your project
3. Click "Deployments"
4. Select deployment
5. View real-time logs

### Monitor Turso:
```bash
# Check database health
turso db inspect erp-crm-db

# View recent activity
turso db show erp-crm-db
```

---

## Backup Strategy

### Automated backups:

Turso provides automatic backups. View them:
```bash
turso db show erp-crm-db
```

### Manual backup:

```bash
# Download database
turso db shell erp-crm-db --output backup-$(date +%Y%m%d).db

# Or export as SQL
turso db shell erp-crm-db .dump > backup-$(date +%Y%m%d).sql
```

---

## Performance Tips

1. **Use connection pooling:** Already configured in `@libsql/client`

2. **Optimize queries:** Add indexes for frequently queried columns
   ```sql
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_customers_status ON customers(status);
   ```

3. **Choose nearest location:** Turso automatically uses edge locations

4. **Monitor query performance:**
   ```bash
   turso db inspect erp-crm-db
   ```

---

## Security Best Practices

1. **Rotate auth tokens regularly:**
   ```bash
   # Create new token
   turso db tokens create erp-crm-db
   
   # Update in Vercel environment variables
   # Old token will still work until you revoke it
   
   # Revoke old token (optional)
   turso db tokens revoke erp-crm-db <old-token>
   ```

2. **Use strong JWT_SECRET:**
   ```bash
   openssl rand -base64 64
   ```

3. **Enable CORS restrictions** in production (update `src/server.ts`):
   ```typescript
   app.use(cors({
     origin: 'https://your-frontend-domain.vercel.app',
     credentials: true
   }));
   ```

4. **Never commit secrets:** Add `.env` to `.gitignore`

---

## Migration from Old Vercel (without Turso)

If you previously deployed to Vercel without Turso:

1. **Create Turso database** (Step 1 above)
2. **Initialize schema** in Turso
3. **(Optional) Export old data:**
   - Old data was temporary, likely already lost
   - Fresh start with demo data is recommended
4. **Update environment variables** in Vercel
5. **Redeploy** - Vercel will detect changes

---

## Support and Resources

- **Turso Documentation:** [docs.turso.tech](https://docs.turso.tech)
- **Turso Discord:** [discord.gg/turso](https://discord.gg/turso)
- **Vercel Documentation:** [vercel.com/docs](https://vercel.com/docs)
- **libSQL GitHub:** [github.com/libsql](https://github.com/libsql)

---

## Success Checklist

- [ ] Turso CLI installed
- [ ] Turso database created
- [ ] Database URL obtained
- [ ] Auth token generated
- [ ] Schema initialized in Turso
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables set in Vercel
- [ ] Deployment successful
- [ ] Login tested - no 401 errors! ✅
- [ ] Data persistence verified ✅
- [ ] Frontend updated with new URL
- [ ] End-to-end testing complete

---

**Your backend is now running on Vercel with Turso! 🎉**

✅ Persistent database - data survives deployments
✅ No more 401 authentication errors  
✅ SQLite compatibility - familiar API
✅ Distributed globally - fast access everywhere
✅ Free tier - perfect for this application

