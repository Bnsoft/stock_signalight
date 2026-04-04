# Signalight Phase 9 Deployment Guide

This guide covers deploying Signalight to production with authentication, calculator, and full commercial features.

## Prerequisites

- Node.js 18+ (for frontend)
- Python 3.10+ (for backend)
- Git account (for version control)
- Vercel account (for frontend hosting)
- Railway/Render account (for backend hosting)
- Supabase account (optional, for managed auth)

## Frontend Deployment (Vercel)

### 1. Prepare Frontend

```bash
cd signalight-web/signalight-landing

# Install dependencies
bun install

# Build locally to test
bun run build

# Create .env.local
cp .env.example .env.local
# Edit .env.local with your production values:
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Select project or create new
# - Set root directory: signalight-web/signalight-landing
# - Confirm build settings
```

### 3. Configure Environment Variables in Vercel Dashboard

In your Vercel project settings, add:
- `NEXT_PUBLIC_API_URL` = your backend URL
- Any other environment variables needed

### 4. Set Up Auto-Deployment

In Vercel dashboard:
- Connect your GitHub repository
- Enable automatic deployments on push to main branch
- Set production branch to `main`

## Backend Deployment (Railway/Render)

### 1. Prepare Backend

```bash
cd signalight-engine

# Create .env file
cp ../.env.example .env
# Edit .env with production values

# Test locally
python -m uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
```

### 2. Create requirements.txt

```bash
# Generate requirements from your imports
pip freeze > requirements.txt
```

### 3. Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add environment variables
railway variables set JWT_SECRET_KEY=your-secret-key
railway variables set SUPABASE_URL=your-supabase-url
railway variables set SUPABASE_SERVICE_KEY=your-service-key

# Deploy
railway up
```

### 4. Deploy to Render (Alternative)

1. Go to render.com
2. Create new Web Service
3. Connect GitHub repository
4. Set:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn src.api:app --host 0.0.0.0 --port 8000`
5. Add environment variables in dashboard
6. Deploy

## Database Setup

### 1. Initialize SQLite

The database initializes automatically on first API call via `store.init_db()`.

For manual initialization:
```python
from src.store import init_db
init_db()
```

### 2. (Optional) Configure Supabase

If using Supabase:

```bash
# Create Supabase project at supabase.com
# Get URL and service key

# Create tables in Supabase SQL editor:
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  auth_method TEXT,
  password_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  theme TEXT DEFAULT 'system',
  notification_email BOOLEAN DEFAULT true,
  api_calls_limit INTEGER DEFAULT 1000,
  subscription_plan TEXT DEFAULT 'guest',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE calculations (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  principal FLOAT,
  period_months INTEGER,
  target_roi FLOAT,
  final_value FLOAT,
  net_profit FLOAT,
  tax_amount FLOAT,
  after_tax_roi FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Domain Configuration

### 1. Custom Domain (Vercel)

In Vercel project settings → Domains:
- Add your custom domain
- Follow DNS configuration steps
- Wait for SSL certificate (5-10 minutes)

### 2. API Domain

Point API subdomain (api.yourdomain.com) to your Railway/Render deployment:
- Get deployment URL from Railway/Render dashboard
- Add CNAME record: `api.yourdomain.com` → `deployment-url`

### 3. Update Frontend URL

Update `NEXT_PUBLIC_API_URL` in Vercel to use new API domain:
```
https://api.yourdomain.com
```

## Testing Production Deployment

### 1. Test Authentication

```bash
# Test signup
curl -X POST https://api.yourdomain.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test guest mode
curl -X POST https://api.yourdomain.com/auth/guest
```

### 2. Test Calculator

```bash
# Test calculation endpoint
curl -X POST https://api.yourdomain.com/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test-user","principal":10000,"period_months":12,"target_roi":15}'
```

### 3. Test Frontend

Visit: https://yourdomain.com
- Test signup/login flow
- Create calculation
- Share calculation
- View profile

## Monitoring & Logging

### 1. Vercel Analytics

In Vercel dashboard:
- Core Web Vitals
- Performance metrics
- Error rates

### 2. Railway Logs

```bash
# View logs
railway logs

# Filter by service
railway logs --service api
```

### 3. Error Tracking (Optional)

Integrate Sentry for error tracking:
```bash
# Install Sentry
pip install sentry-sdk

# Add to src/api.py
import sentry_sdk
sentry_sdk.init("your-sentry-dsn")
```

## Performance Optimization

### 1. Frontend Optimization

- Enable automatic image optimization in Next.js
- Use dynamic imports for large components
- Enable compression in Vercel settings

### 2. Backend Optimization

- Enable caching with Redis (optional)
- Use database indexes (already in schema)
- Implement rate limiting
- Add CORS caching headers

### 3. Database Optimization

```sql
-- Verify indexes exist
SELECT * FROM sqlite_master WHERE type='index';

-- Add missing indexes if needed
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_calculations_user ON calculations(user_id);
```

## Security Checklist

- [ ] Change `JWT_SECRET_KEY` in production
- [ ] Enable HTTPS (auto in Vercel/Railway)
- [ ] Set up rate limiting on API
- [ ] Enable CORS properly
- [ ] Validate all user inputs
- [ ] Use environment variables for secrets
- [ ] Enable 2FA on accounts
- [ ] Regular security audits
- [ ] Set up error monitoring
- [ ] Implement WAF (Web Application Firewall)

## Rollback Plan

### 1. Quick Rollback

```bash
# Vercel - revert to previous deployment
vercel rollback

# Railway - select previous release
railway redeploy <previous-deployment-id>
```

### 2. Database Rollback

Keep database backups:
```bash
# Backup before major changes
cp data/signalight.db data/signalight.db.backup.$(date +%Y%m%d)

# Restore if needed
cp data/signalight.db.backup.YYYYMMDD data/signalight.db
```

## Ongoing Maintenance

### Daily
- Monitor error rates
- Check uptime status

### Weekly
- Review logs for issues
- Monitor database growth

### Monthly
- Security updates
- Dependency updates
- Performance analysis

## Support & Troubleshooting

### Common Issues

**"Failed to connect to API"**
- Check NEXT_PUBLIC_API_URL is correct
- Verify backend is running
- Check CORS settings

**"Database locked"**
- Restart backend service
- Check for concurrent requests
- Consider scaling database

**"High memory usage"**
- Check for memory leaks in code
- Reduce connection pool size
- Scale up instance size

## Cost Optimization

- **Vercel**: Free tier includes 100GB bandwidth
- **Railway**: $5/month free tier, pay-as-you-go
- **Supabase**: Free tier up to 500MB database
- **Total Monthly**: ~$0-15 for hobby tier

## Next Steps

1. Set up monitoring and alerts
2. Configure backup automation
3. Plan scaling strategy
4. Set up staging environment
5. Document runbooks for operations team
