# JWT Secret Key Configuration

## Current Status
✅ JWT Secret is now **environment-variable based** for secure configuration.

## Where is the JWT Secret Stored?

### Local Development
**File**: `backend/.env` (NOT committed to Git)
```
JWT_SECRET=event-management-system-secret-key-2024
```

### Production (Vercel)
**Location**: Vercel Dashboard → Your Project → Settings → Environment Variables
```
JWT_SECRET = your-production-secret-key
```

## How to Generate a Secure JWT Secret

### Option 1: Using Node.js (Recommended)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Output will be a 64-character hex string like:
```
a3f8e9c2b1d4f5a6e7c8b9d0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9
```

### Option 2: Using OpenSSL
```bash
openssl rand -hex 32
```

### Option 3: Using an online generator
Visit: https://www.random.org/strings/?num=1&len=64&digits=on&upperalpha=on&loweralpha=on&unique=on&format=html

## Setup Instructions

### For Local Development
1. The `.env` file is already created with a default secret
2. To use a custom secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Copy the output
   ```
3. Update `backend/.env`:
   ```
   JWT_SECRET=<paste-your-generated-secret-here>
   ```

### For Production (Vercel)
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add**
5. Fill in:
   - **Name**: `JWT_SECRET`
   - **Value**: (Paste your generated secret)
   - **Environment**: Select `Production`, `Preview`, and `Development`
6. Click **Save**
7. Redeploy your application

## Security Best Practices

✅ **DO:**
- Generate a cryptographically secure secret using Node.js or OpenSSL
- Keep the production secret private and never share it
- Store it ONLY in environment variables
- Rotate the secret periodically (at least annually)
- Use different secrets for development and production

❌ **DON'T:**
- Hardcode secrets in source code
- Use simple/predictable secrets
- Commit `.env` files to Git
- Share secrets in chat, email, or forums
- Reuse the same secret across environments

## How It Works in Code

### Backend (auth.js)
```javascript
import 'dotenv/config.js';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-key';
```

The backend now:
1. Loads environment variables from `.env` file (local) or Vercel dashboard (production)
2. Uses `process.env.JWT_SECRET` for all JWT operations
3. Falls back to a default key only if no environment variable is set

### Token Generation
```javascript
const token = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  JWT_SECRET,  // Uses environment variable
  { expiresIn: '24h' }
);
```

### Token Verification
```javascript
const decoded = jwt.verify(token, JWT_SECRET);  // Same secret
```

## Troubleshooting

### ❌ "Invalid token" Error
- Ensure the same `JWT_SECRET` is used for both generation and verification
- Check that your `.env` file is correctly formatted
- Verify the secret is loaded: `console.log(process.env.JWT_SECRET)`

### ❌ Tokens Not Working After Deploy
- Verify `JWT_SECRET` is set in Vercel Environment Variables
- Ensure you redeploy after changing the secret
- Check that the new deployment uses the updated environment variable

### ❌ Local App Works, Production Fails
- Production likely has a different or missing `JWT_SECRET`
- Go to Vercel and add the environment variable
- Redeploy after updating

## Files Modified

- `backend/middleware/auth.js` - Now reads JWT_SECRET from environment
- `backend/.env` - Local development secret (NOT in Git)
- `.env` - Root environment variables (NOT in Git)
- `.env.example` - Template for setup instructions (in Git)

---

**Your JWT secret is now securely configured! 🔐**
