# Authentication & Landing Page Setup Guide

## Overview
This guide walks you through setting up NextAuth.js with Google OAuth for your ATM Finder application. The implementation includes:

- **Premium Login Page**: A sleek, centered card interface with gradient backgrounds and animated elements
- **Google OAuth Integration**: Seamless "Continue with Google" authentication
- **Automatic Database Sync**: User data is automatically synced to the MySQL database on first login
- **Protected Routes**: The main app requires authentication; unauthenticated users are redirected to the login page

## Prerequisites

Before proceeding, you need:

1. **Google OAuth Credentials** from [Google Cloud Console](https://console.cloud.google.com/):
   - Google Client ID
   - Google Client Secret
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (for development)

2. **MySQL Database** with the updated schema (Phone_no made nullable)

3. **Environment Variables** configured in `.env.local`

## Step 1: Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**
4. Create an OAuth 2.0 credential (OAuth Client ID):
   - Application Type: Web application
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy your **Client ID** and **Client Secret**

## Step 2: Update Database Schema

Run the migration to make the `Phone_no` field nullable:

```sql
-- Apply migration: Make Phone_no nullable in USER table
USE ATM_MoneyChecker;

ALTER TABLE `USER` 
MODIFY COLUMN Phone_no VARCHAR(20) NULL;
```

This change allows Google OAuth users to sign up without providing a phone number initially.

## Step 3: Configure Environment Variables

Create or update your `.env.local` file in the project root:

```bash
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ATM_MoneyChecker

# Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# NextAuth Configuration
NEXTAUTH_SECRET=your_generated_secret_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### Generate NEXTAUTH_SECRET

Generate a secure secret for NextAuth using:

```bash
# Using Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL:
openssl rand -hex 32
```

## Step 4: Run Database Migrations

Connect to your MySQL database and execute:

```bash
mysql -h localhost -u root -p ATM_MoneyChecker < db/migrations/002_make_phone_nullable.sql
```

## Step 5: Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## How It Works

### Landing/Login Page (`/login`)
- **Features**:
  - Centered premium card interface
  - Deep charcoal gradient background with animated mesh gradients
  - Bold headline: "Never ATM-Hop Again"
  - Smooth loading spinner during authentication
  - Google logo in the authentication button
  - Responsive design for mobile and desktop

### Authentication Flow

1. **User clicks "Continue with Google"**
   - NextAuth redirects to Google's OAuth screen
   - User authorizes the application
   - Google returns user info (Name, Email, Profile Picture)

2. **NextAuth signIn Callback**
   - Checks if user exists in local MySQL database using their email
   - If new user: Automatically inserts:
     - Name (from Google)
     - Email (from Google)
     - ReliabilityScore: 100 (default)
     - BadgeLevel: "Bronze" (default)
     - Phone_no: NULL (not required for OAuth users)

3. **Session Created**
   - JWT token is created with user data
   - User is redirected to the main app (`/`)

### Protected Routes

The main application (`/`) is now protected:
- Unauthenticated users are automatically redirected to `/login`
- Loading state shows while authentication status is being verified
- Session data is available throughout the app via `useSession()`

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/[...nextauth]/
│   │       └── route.js          # NextAuth API route
│   ├── login/
│   │   └── page.js               # Premium login page
│   ├── page.js                   # Protected home page
│   └── layout.js                 # Updated with AuthProvider
├── auth/
│   └── auth.js                   # NextAuth configuration
├── components/
│   ├── AuthProvider.js           # SessionProvider wrapper
│   └── ProtectedLayout.js        # Route protection wrapper
└── lib/
    └── env.js                    # Environment variable management
```

## Environment Variables Explained

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `NEXTAUTH_SECRET` | Encryption key for JWT tokens | Generate with `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth app identifier | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app secret | From Google Cloud Console |
| `DB_HOST` | MySQL database server | Your database host |
| `DB_USER` | MySQL user | Your database user |
| `DB_PASSWORD` | MySQL password | Your database password |
| `DB_NAME` | MySQL database name | `ATM_MoneyChecker` |
| `GOOGLE_MAPS_API_KEY` | For ATM location services | From Google Cloud Console |

## Troubleshooting

### Issue: "Missing required environment variables"
**Solution**: Ensure all variables in `.env.local` are set correctly. Check that there are no typos in variable names.

### Issue: Google login redirects to error page
**Solution**:
1. Verify Google OAuth credentials are correct
2. Check that `http://localhost:3000/api/auth/callback/google` is in Google Cloud's authorized redirect URIs
3. Ensure `NEXTAUTH_SECRET` is configured

### Issue: User not appearing in database
**Solution**:
1. Verify the `signIn` callback errors: Check browser console and server logs
2. Ensure `Phone_no` has been made nullable in the database
3. Check database connection variables are correct

### Issue: Session lost on page reload
**Solution**: This is normal behavior. SessionProvider handles session verification. If the issue persists, check browser cookies and `NEXTAUTH_SECRET` validity.

## Production Deployment

When deploying to production:

1. Update Google OAuth credentials with production URLs
2. Set `NEXTAUTH_URL` environment variable to your domain
3. Generate a new secure `NEXTAUTH_SECRET`
4. Ensure `.env.local` is in your deployment environment (via CI/CD or hosting platform)
5. Use HTTPS for all OAuth callbacks

Example `NEXTAUTH_URL`:
```bash
NEXTAUTH_URL=https://yourdomain.com
```

## Next Steps

1. Test the login flow by clicking "Continue with Google"
2. Verify the user appears in your MySQL database
3. Implement user profile management (phone number collection)
4. Add logout functionality with sign-out button
5. Customize theme colors to match your brand

## Support

For more information:
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication)
