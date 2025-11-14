# Firebase Setup Guide

## Problem
The Next.js build is failing because Firebase Admin environment variables are missing in production mode.

## Solution

### 1. Set up Firebase Admin Credentials

To get the required Firebase Admin credentials:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **"Generate New Private Key"** for the Firebase Admin SDK
5. Download the JSON file

### 2. Update Environment Variables

Replace the placeholder values in `.env.local` with your actual Firebase credentials:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (from the downloaded JSON file)
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_ADMIN_PROJECT_ID=your-project-id
```

### 3. For Production Deployment

Set the same environment variables in your production environment (Vercel, Netlify, etc.):

- `FIREBASE_ADMIN_PRIVATE_KEY`
- `FIREBASE_ADMIN_CLIENT_EMAIL` 
- `FIREBASE_ADMIN_PROJECT_ID`

### 4. Alternative: Development Mode Only

If you don't need Firebase functionality for development, you can:

1. Set `NODE_ENV=development` in `.env.local`
2. The app will use fallback credentials and mock services

### 5. Test the Build

After setting up the environment variables:

```bash
npm run build
```

## Current Status

The build is currently failing because:
- Firebase Admin credentials are using placeholder values
- API routes require Firebase services that aren't initialized

## Next Steps

1. Replace placeholder values in `.env.local` with actual Firebase credentials
2. Run `npm run build` to test
3. Deploy with proper environment variables in production
