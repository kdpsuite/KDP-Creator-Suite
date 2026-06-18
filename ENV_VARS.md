# KDP Creator Suite - Environment Variables Documentation

This document describes all environment variables used by the KDP Creator Suite ecosystem.

## Backend Environment Variables

### Database Configuration

**`DATABASE_URL`** (Required)
- **Type:** String (PostgreSQL connection string)
- **Example:** `postgresql://user:password@db.example.com:5432/kdp_creator`
- **Purpose:** Connection string for PostgreSQL database (Supabase)
- **Notes:** Must use `postgresql://` scheme (not `postgres://`)

### Supabase Configuration

**`SUPABASE_URL`** (Required)
- **Type:** String (HTTPS URL)
- **Example:** `https://yjzgiunyjmjftpmhezuk.supabase.co`
- **Purpose:** Supabase project URL for authentication and storage
- **Notes:** Get from Supabase project settings

**`SUPABASE_KEY`** (Required)
- **Type:** String (API key)
- **Example:** `sb_publishable_uXl7Xz9j3Umko-7sZiZsBA_0dCFiU3K`
- **Purpose:** Supabase anonymous/public key for client-side operations
- **Notes:** This is the ANON key, not the service role key

**`SUPABASE_SERVICE_KEY`** (Optional)
- **Type:** String (API key)
- **Purpose:** Supabase service role key for server-side operations
- **Notes:** Only needed for admin operations; keep secret

### JWT Configuration

**`SECRET_KEY`** (Required)
- **Type:** String (random secret)
- **Example:** `your-secret-key-change-in-production`
- **Purpose:** Flask session secret key
- **Notes:** Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

**`JWT_SECRET_KEY`** (Required)
- **Type:** String (random secret)
- **Example:** `your-jwt-secret-key-change-in-production`
- **Purpose:** Secret key for signing JWT tokens
- **Notes:** Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

**`JWT_ACCESS_TOKEN_EXPIRES`** (Optional)
- **Type:** Integer (seconds)
- **Default:** `86400` (24 hours)
- **Purpose:** JWT token expiration time
- **Notes:** Recommended: 24-48 hours for user convenience

### Stripe Configuration

**`STRIPE_API_KEY`** (Optional)
- **Type:** String (Stripe secret key)
- **Example:** `sk_test_...` or `sk_live_...`
- **Purpose:** Stripe API key for payment processing
- **Notes:** Use `sk_test_` for development, `sk_live_` for production

**`STRIPE_WEBHOOK_SECRET`** (Optional)
- **Type:** String (Stripe webhook secret)
- **Example:** `whsec_...`
- **Purpose:** Secret for verifying Stripe webhook signatures
- **Notes:** Get from Stripe dashboard > Webhooks

### Application Configuration

**`ENVIRONMENT`** (Optional)
- **Type:** String (enum)
- **Options:** `development`, `staging`, `production`
- **Default:** `development`
- **Purpose:** Application environment indicator
- **Notes:** Used for logging and feature flags

**`DEBUG`** (Optional)
- **Type:** Boolean (`True` or `False`)
- **Default:** `True`
- **Purpose:** Enable Flask debug mode
- **Notes:** MUST be `False` in production

**`CORS_ORIGINS`** (Optional)
- **Type:** String (comma-separated URLs)
- **Example:** `http://localhost:3000,http://localhost:5173,https://yourdomain.com`
- **Purpose:** Allowed origins for CORS requests
- **Notes:** If empty, allows all origins (not recommended for production)

### Logging Configuration

**`LOG_LEVEL`** (Optional)
- **Type:** String (enum)
- **Options:** `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
- **Default:** `INFO`
- **Purpose:** Logging verbosity level
- **Notes:** Use `DEBUG` for development, `INFO` for production

### Email Configuration

**`SMTP_SERVER`** (Optional)
- **Type:** String (SMTP server hostname)
- **Example:** `smtp.gmail.com`
- **Purpose:** SMTP server for sending emails
- **Notes:** Only needed if email features are enabled

**`SMTP_PORT`** (Optional)
- **Type:** Integer
- **Default:** `587`
- **Purpose:** SMTP server port
- **Notes:** Usually 587 (TLS) or 465 (SSL)

**`SMTP_USERNAME`** (Optional)
- **Type:** String (email address)
- **Example:** `your-email@gmail.com`
- **Purpose:** SMTP authentication username
- **Notes:** For Gmail, use app-specific password

**`SMTP_PASSWORD`** (Optional)
- **Type:** String (password)
- **Purpose:** SMTP authentication password
- **Notes:** For Gmail, generate app-specific password in account settings

**`SMTP_FROM_EMAIL`** (Optional)
- **Type:** String (email address)
- **Example:** `noreply@yourdomain.com`
- **Purpose:** Email address for outgoing emails
- **Notes:** Should be a valid email address

### Feature Flags

**`ENABLE_2FA`** (Optional)
- **Type:** Boolean (`True` or `False`)
- **Default:** `True`
- **Purpose:** Enable two-factor authentication
- **Notes:** Can be disabled for testing

**`ENABLE_BATCH_PROCESSING`** (Optional)
- **Type:** Boolean (`True` or `False`)
- **Default:** `True`
- **Purpose:** Enable batch processing of files
- **Notes:** Requires additional compute resources

**`ENABLE_PDF_PROCESSING`** (Optional)
- **Type:** Boolean (`True` or `False`)
- **Default:** `True`
- **Purpose:** Enable PDF conversion and processing
- **Notes:** Requires PDF libraries (reportlab, PyPDF2)

### Rate Limiting

**`RATE_LIMIT_REQUESTS`** (Optional)
- **Type:** Integer
- **Default:** `100`
- **Purpose:** Maximum requests per time window
- **Notes:** Set to 0 to disable rate limiting

**`RATE_LIMIT_WINDOW`** (Optional)
- **Type:** Integer (seconds)
- **Default:** `3600` (1 hour)
- **Purpose:** Time window for rate limiting
- **Notes:** Combined with RATE_LIMIT_REQUESTS

### File Upload Configuration

**`MAX_FILE_SIZE`** (Optional)
- **Type:** Integer (bytes)
- **Default:** `52428800` (50 MB)
- **Purpose:** Maximum file upload size
- **Notes:** Vercel has a 50 MB limit for function payloads

**`ALLOWED_FILE_TYPES`** (Optional)
- **Type:** String (comma-separated file extensions)
- **Default:** `pdf,jpg,jpeg,png,gif`
- **Purpose:** Allowed file types for upload
- **Notes:** Without dots (e.g., `pdf` not `.pdf`)

### Vercel Configuration

**`VERCEL_ENV`** (Auto-set by Vercel)
- **Type:** String (enum)
- **Options:** `development`, `preview`, `production`
- **Purpose:** Vercel environment indicator
- **Notes:** Automatically set by Vercel, do not override

**`VERCEL_URL`** (Auto-set by Vercel)
- **Type:** String (URL)
- **Example:** `https://dashboard-backend-hazel.vercel.app`
- **Purpose:** Vercel deployment URL
- **Notes:** Automatically set by Vercel, do not override

---

## Frontend Environment Variables

### API Configuration

**`VITE_API_URL`** (Optional)
- **Type:** String (URL or path)
- **Default:** `/api`
- **Example:** `http://localhost:5000/api` or `/api`
- **Purpose:** Backend API base URL
- **Notes:** Use `/api` for production (Vercel rewrites), full URL for local development

### Supabase Configuration

**`VITE_SUPABASE_URL`** (Required)
- **Type:** String (HTTPS URL)
- **Example:** `https://yjzgiunyjmjftpmhezuk.supabase.co`
- **Purpose:** Supabase project URL for authentication
- **Notes:** Must match backend SUPABASE_URL

**`VITE_SUPABASE_ANON_KEY`** (Required)
- **Type:** String (API key)
- **Example:** `sb_publishable_uXl7Xz9j3Umko-7sZiZsBA_0dCFiU3K`
- **Purpose:** Supabase anonymous key for client-side auth
- **Notes:** Must match backend SUPABASE_KEY

---

## Setting Environment Variables in Vercel

### For Backend (dashboard-backend)

1. Go to Vercel Dashboard > Projects > dashboard-backend
2. Click "Settings" > "Environment Variables"
3. Add the following variables:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `SECRET_KEY`
   - `JWT_SECRET_KEY`
   - `STRIPE_API_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `ENVIRONMENT` (set to `production`)
   - `DEBUG` (set to `False`)

### For Frontend (dashboard-frontend)

1. Go to Vercel Dashboard > Projects > dashboard-frontend
2. Click "Settings" > "Environment Variables"
3. Add the following variables:
   - `VITE_API_URL` (set to `/api`)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## Local Development Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp backend-api/kdp-creator-api/.env.example backend-api/kdp-creator-api/.env
   ```

2. Fill in the values in `.env` with your local/development credentials

3. For frontend, create `.env.local`:
   ```bash
   cp web-dashboard/kdp-creator-dashboard/.env.example web-dashboard/kdp-creator-dashboard/.env.local
   ```

4. Start the backend:
   ```bash
   cd backend-api/kdp-creator-api
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python src/main.py
   ```

5. Start the frontend (in a new terminal):
   ```bash
   cd web-dashboard/kdp-creator-dashboard
   pnpm install
   pnpm run dev
   ```

---

## Troubleshooting

### "Missing required environment variables" Error

**Solution:** Check that all required variables are set in `.env` or Vercel environment settings.

### "Connection refused" Error

**Solution:** Check that `DATABASE_URL` is correct and the database is accessible.

### "Invalid JWT token" Error

**Solution:** Ensure `JWT_SECRET_KEY` is the same on both frontend and backend.

### "CORS error" in Browser Console

**Solution:** Check that `CORS_ORIGINS` includes the frontend URL, or set to `*` for development.

### Frontend shows "API URL not configured"

**Solution:** Ensure `VITE_API_URL` is set in frontend environment variables.

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong random secrets** for `SECRET_KEY` and `JWT_SECRET_KEY`
3. **Rotate secrets regularly** in production
4. **Use different secrets** for development and production
5. **Keep Stripe keys secret** and use separate test/live keys
6. **Set `DEBUG=False`** in production
7. **Use HTTPS** for all production URLs
8. **Restrict CORS origins** to known frontend URLs in production

---

## Questions?

If you need help setting up environment variables, refer to the main README or contact the development team.
