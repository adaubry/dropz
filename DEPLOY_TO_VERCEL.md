# Deploy to Vercel - Step by Step

## Prerequisites

- GitHub account (project must be pushed to GitHub)
- Vercel account (free tier works)
- Neon PostgreSQL account (free tier works)

---

## Step 1: Set Up Database (Neon PostgreSQL)

1. Go to https://neon.tech
2. Sign up / Log in
3. Click **"Create Project"**
4. Choose a name (e.g., "dropz-db")
5. Select region closest to you
6. Click **"Create Project"**

### Get Connection String

7. After creation, you'll see your connection string
8. Copy the **"Connection string"** (looks like: `postgresql://user:pass@host/db?sslmode=require`)
9. **Save this** - you'll need it for Vercel

---

## Step 2: Push Code to GitHub

```bash
# If not already a GitHub repo
git remote add origin https://github.com/YOUR_USERNAME/dropz.git
git branch -M main
git push -u origin main

# If you already have a remote
git push origin your-branch-name
```

---

## Step 3: Deploy to Vercel

1. Go to https://vercel.com
2. Sign up / Log in
3. Click **"Add New"** → **"Project"**
4. **Import** your GitHub repository (you may need to authorize Vercel to access GitHub)
5. Select the `dropz` repository

### Configure Build Settings

6. Vercel should auto-detect Next.js - keep defaults:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** (auto-detected)
   - **Output Directory:** (auto-detected)

### Add Environment Variables (REQUIRED)

7. Click **"Environment Variables"** section
8. Add these **REQUIRED** variables:

**POSTGRES_URL** (from Neon dashboard):
```
postgresql://user:pass@host/db?sslmode=require
```

**AUTH_SECRET** (generate with command below):
```bash
# Run this command locally to generate a secure secret
openssl rand -base64 32
```
Copy the output and paste it as the value for `AUTH_SECRET`

**Example in Vercel UI:**
```
Key: POSTGRES_URL
Value: postgresql://neondb_owner:abc123@ep-cool-name.aws.neon.tech/neondb?sslmode=require

Key: AUTH_SECRET
Value: (paste your generated secret here)
```

**Optional variables:**

```env
# Next.js (optional)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

9. Click **"Deploy"**

---

## Step 4: Run Database Migrations

After first deployment, you need to set up database tables.

### Option A: Use Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Pull environment variables
vercel env pull

# Run migrations
pnpm drizzle-kit push
```

### Option B: Use Neon SQL Editor

1. Go to your Neon dashboard
2. Click **"SQL Editor"**
3. Run the schema from `src/db/schema.ts` manually (or use drizzle-kit locally)

---

## Step 5: Verify Deployment

1. Open your deployed URL (e.g., `https://dropz-xyz.vercel.app`)
2. Test sign up / login
3. Create a planet
4. Upload some markdown files
5. Check if everything works

---

## Common Issues & Fixes

### Issue: "AUTH_SECRET environment variable is not set"

**Fix:** Generate and add AUTH_SECRET:
```bash
# Generate secret
openssl rand -base64 32
```
- Go to Vercel → Settings → Environment Variables
- Add `AUTH_SECRET` with the generated value
- Redeploy the project

### Issue: "Database connection failed"

**Fix:** Check your `POSTGRES_URL` in Vercel:
- Go to Settings → Environment Variables
- Verify the connection string is correct
- Make sure it ends with `?sslmode=require`
- Redeploy after fixing

### Issue: "Module not found" errors

**Fix:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
git commit -m "fix: Update lockfile"
git push
```

### Issue: Build fails with TypeScript errors

**Fix:** Run locally first:
```bash
pnpm build
```
Fix any TypeScript errors, then push.

### Issue: Images not loading

**Fix:** Check image domains in `next.config.mjs`:
```js
images: {
  domains: ['your-image-domain.com'],
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**',
    },
  ],
}
```

---

## Updating Environment Variables

To add/change environment variables after deployment:

1. Go to Vercel Dashboard → Your Project
2. Click **"Settings"** → **"Environment Variables"**
3. Add/Edit variables
4. Choose which environments (Production, Preview, Development)
5. Click **"Save"**
6. **Important:** Redeploy for changes to take effect
   - Go to **"Deployments"** tab
   - Click latest deployment
   - Click **"..."** menu → **"Redeploy"**

---

## Local Development After Deployment

To work locally with Vercel environment variables:

```bash
# Pull env vars from Vercel
vercel env pull .env.local

# Run dev server
pnpm dev
```

---

## Custom Domain (Optional)

1. Go to Project Settings → **"Domains"**
2. Add your custom domain
3. Follow DNS setup instructions
4. Wait for DNS propagation (5-60 minutes)

---

## Monitoring

**Check logs:**
1. Go to your project on Vercel
2. Click **"Deployments"**
3. Click on a deployment
4. View **"Build Logs"** or **"Function Logs"**

**Check analytics:**
- Vercel provides built-in analytics
- See traffic, performance, errors in the Dashboard

---

## Quick Command Reference

```bash
# Deploy from CLI
vercel

# Deploy to production
vercel --prod

# Pull environment variables
vercel env pull

# View logs
vercel logs

# List deployments
vercel ls

# Run migrations
pnpm drizzle-kit push

# Check build locally
pnpm build
```

---

## What Gets Deployed

- ✅ Next.js application
- ✅ API routes (`/api/*`)
- ✅ Server components
- ✅ Static assets (images, fonts)
- ✅ Edge functions (if any)
- ❌ Database (hosted separately on Neon)
- ❌ Uploaded files (use Vercel Blob storage if needed)

---

## Next Steps After Deployment

1. **Test all features:**
   - Sign up / Login
   - Create planets
   - Upload folders
   - Edit content
   - page.md functionality

2. **Set up monitoring:**
   - Enable Vercel Analytics
   - Set up error tracking (Sentry, etc.)

3. **Configure domains:**
   - Add custom domain
   - Set up SSL (automatic with Vercel)

4. **Performance:**
   - Check Vercel Speed Insights
   - Optimize images if needed

5. **Security:**
   - Review environment variables
   - Set up rate limiting (Upstash Redis)
   - Configure CORS if needed

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Neon Docs:** https://neon.tech/docs
- **Next.js Docs:** https://nextjs.org/docs

---

## Cost Estimate (Free Tier)

- **Vercel:** Free (hobby plan)
  - Unlimited deployments
  - 100GB bandwidth/month
  - Automatic HTTPS

- **Neon:** Free
  - 0.5GB storage
  - 10 branches
  - Auto-suspend after 5 min inactivity

**Total: $0/month** (for hobby projects)

---

## Done! 🎉

Your app should now be live at `https://your-project.vercel.app`

Test it and enjoy! If something breaks, check the logs in Vercel Dashboard.
