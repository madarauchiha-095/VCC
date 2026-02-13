# Vercel Deployment Guide

## Quick Start Deployment

### Prerequisites
- GitHub account with repository pushed (✅ Already done)
- Vercel account (free tier available at vercel.com)

### Deployment Steps

1. **Go to Vercel.com**
   - Sign up or log in with your GitHub account

2. **Import Project**
   - Click "Add New" → "Project"
   - Select your GitHub repository (`madarauchiha-095/VCC`)
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Vite** (auto-detected)
   - Root Directory: **./** (leave as is)
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`
   - Install Command: `npm install`

4. **Environment Variables**
   - Click "Add" and configure:
     ```
     JWT_SECRET = your-secret-key-here
     NODE_ENV = production
     DATABASE_URL = ./data/events.db
     ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-3 minutes)
   - Your app will be live at: `https://your-project-name.vercel.app`

## Project Architecture

### Frontend (`/frontend`)
- **Framework**: React 18 + Vite
- **Build Output**: `frontend/dist/`
- **API Base**: `/api` (relative URLs for all backend calls)

### Backend (`/backend`)
- **Framework**: Node.js + Express
- **Deployment**: Vercel Serverless Functions via `/api`
- **Routes**:
  - `/api/auth` - Authentication
  - `/api/events` - Event management
  - `/api/approvals` - Approval workflow
  - `/api/admin` - Admin functions

### API Handler (`/api`)
- **File**: `/api/index.js`
- **Purpose**: Wraps Express app for Vercel serverless functions

## File Structure

```
VCC/
├── frontend/              # React + Vite app
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/               # Express API server
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── package.json
├── api/
│   └── index.js          # Vercel serverless handler
├── vercel.json           # Vercel configuration
├── .vercelignore        # Files to exclude from deployment
├── .env.example         # Environment variables template
└── package.json         # Root monorepo config
```

## Important Notes

1. **Database**: SQLite database will be created on first run
2. **JWT_SECRET**: Change this in production at Vercel dashboard
3. **CORS**: Backend allows all origins (configured for frontend)
4. **Build Time**: First deploy may take 2-3 minutes

## Post-Deployment

### Access Your App
- Frontend: `https://your-project-name.vercel.app`
- API Health: `https://your-project-name.vercel.app/api/health`

### Demo Credentials
Default accounts are created on first API call:
- **Coordinator**: coord@example.com / password123
- **HOD**: hod@example.com / password123
- **Dean**: dean@example.com / password123
- **Head**: head@example.com / password123
- **Admin**: admin@example.com / password123

### Update Environment Variables
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `JWT_SECRET` and other variables as needed
3. Redeploy: `npm run build && npm start`

## Troubleshooting

### Build Fails
- Ensure all backend dependencies are in `backend/package.json`
- Check Node.js version compatibility (18+ recommended)

### API Calls Return 404
- Verify API routes in backend start with `/api/`
- Check frontend's `api.js` baseURL is `/api`

### Database Errors
- SQLite database is created automatically
- Check Vercel function logs for errors

### JWT Errors
- Ensure `JWT_SECRET` is set in Environment Variables
- Keep the same secret across all function invocations

## Local Development

```bash
# Install dependencies
npm install

# Run both frontend and backend
npm run dev

# Run tests
npm test

# Run conflict tests
npm run test:conflicts
```

## Support

For issues or questions:
- Check Vercel dashboard logs
- Review `/backend` server output
- Verify environment variables are set
- Check GitHub for latest changes

---

**Your app is ready for production deployment! 🚀**
