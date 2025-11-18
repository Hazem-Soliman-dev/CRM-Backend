# Railway Environment Variables Configuration

## Required Environment Variables

Set these variables in Railway Dashboard → Variables tab:

### 1. NODE_ENV
```
NODE_ENV=production
```
- **Required:** Yes
- **Description:** Sets the application environment mode
- **Value:** `production`

### 2. JWT_SECRET
```
JWT_SECRET=<your-secret-key>
```
- **Required:** Yes
- **Description:** Secret key for signing JWT tokens
- **Value:** Strong random string (minimum 32 characters)
- **Generate:**
  ```bash
  openssl rand -base64 32
  ```
  Example output: `Jk9L3mP8nQw2Rt5Yx7Zv4Bc6Nd1Fg0Hj8Kl2Mn5Pq9Rs`

### 3. PORT
```
PORT=5000
```
- **Required:** No (Railway sets this automatically)
- **Description:** Server port
- **Default:** Railway assigns dynamically
- **Note:** Usually you don't need to set this

---

## Optional Environment Variables

### 4. JWT_EXPIRES_IN
```
JWT_EXPIRES_IN=7d
```
- **Required:** No
- **Description:** Access token expiration time
- **Default:** `7d` (7 days)
- **Format:** Use time units: `1h`, `2d`, `30m`, etc.

### 5. JWT_REFRESH_EXPIRES_IN
```
JWT_REFRESH_EXPIRES_IN=30d
```
- **Required:** No
- **Description:** Refresh token expiration time
- **Default:** `30d` (30 days)
- **Format:** Use time units: `1h`, `2d`, `30m`, etc.

### 6. FORCE_DEMO_SEED
```
FORCE_DEMO_SEED=0
```
- **Required:** No
- **Description:** Force reseed demo data on every restart
- **Default:** `0` (disabled)
- **Values:** `1` (enabled), `0` (disabled)
- **Note:** Only enable for testing/development

---

## How to Set Environment Variables in Railway

### Method 1: Railway Dashboard (Recommended)

1. Go to [railway.app](https://railway.app)
2. Open your project
3. Click on your service
4. Go to **Variables** tab
5. Click **+ New Variable**
6. Add each variable:
   - Variable Name: `NODE_ENV`
   - Variable Value: `production`
7. Click **Add**
8. Repeat for all required variables

### Method 2: Railway CLI

```bash
# Login to Railway
railway login

# Link to your project
railway link

# Set variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=<your-generated-secret>
railway variables set PORT=5000
railway variables set JWT_EXPIRES_IN=7d
railway variables set JWT_REFRESH_EXPIRES_IN=30d
```

### Method 3: Bulk Import (Railway Dashboard)

1. Go to **Variables** tab
2. Click **Raw Editor**
3. Paste all variables:
   ```
   NODE_ENV=production
   JWT_SECRET=<your-secret-key>
   PORT=5000
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d
   FORCE_DEMO_SEED=0
   ```
4. Click **Update Variables**

---

## Quick Setup Checklist

- [ ] Generate strong JWT_SECRET: `openssl rand -base64 32`
- [ ] Set NODE_ENV=production
- [ ] Set JWT_SECRET with generated value
- [ ] (Optional) Set PORT=5000
- [ ] (Optional) Set JWT_EXPIRES_IN=7d
- [ ] (Optional) Set JWT_REFRESH_EXPIRES_IN=30d
- [ ] Deploy application
- [ ] Test authentication endpoints

---

## Security Notes

⚠️ **Never commit secrets to version control**

✅ **Best Practices:**
- Use Railway dashboard to set sensitive variables
- Generate cryptographically secure JWT_SECRET
- Rotate JWT_SECRET periodically (requires users to re-login)
- Use long expiration times only for trusted environments
- Keep JWT_SECRET length >= 32 characters

❌ **Never:**
- Commit `.env` files with production secrets
- Share JWT_SECRET publicly
- Use weak or predictable secrets
- Reuse secrets across environments

---

## Verification

After setting environment variables, verify they're loaded:

1. Check Railway logs after deployment
2. Look for startup messages showing environment
3. Test JWT token generation with login endpoint

Expected log output:
```
✅ SQLite database initialized
📋 Initializing database schema...
✅ Database schema created successfully
🚀 Server running on port 5000
📊 Environment: production
```

---

## Troubleshooting

### Issue: "Missing required environment variables"
**Solution:** Check that JWT_SECRET is set in Railway dashboard

### Issue: "Authentication failed" on login
**Solution:** Verify JWT_SECRET is a valid string (no special characters that need escaping)

### Issue: Tokens expire too quickly
**Solution:** Increase JWT_EXPIRES_IN value (e.g., `14d` for 14 days)

### Issue: Database reseeds on every restart
**Solution:** Set FORCE_DEMO_SEED=0 or remove the variable

