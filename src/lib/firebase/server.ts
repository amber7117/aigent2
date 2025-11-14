import * as admin from 'firebase-admin';

// Validate required environment variables for Firebase Admin
const requiredAdminEnvVars = [
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
];

const missingAdminEnvVars = requiredAdminEnvVars.filter(envVar => !process.env[envVar]);

if (missingAdminEnvVars.length > 0) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Missing Firebase Admin environment variables in production:', missingAdminEnvVars);
    throw new Error('Firebase Admin environment variables are required in production');
  } else {
    console.warn('Missing Firebase Admin environment variables in development:', missingAdminEnvVars);
  }
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  // Only initialize if we have all required environment variables and they're not placeholder values
  const hasValidCredentials = missingAdminEnvVars.length === 0 &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY !== '-----BEGIN PRIVATE KEY-----\nyour_actual_private_key_here\n-----END PRIVATE KEY-----\n' &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY !== '-----BEGIN PRIVATE KEY-----\nyour_production_private_key_here\n-----END PRIVATE KEY-----\n' &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL !== 'firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com' &&
    process.env.FIREBASE_ADMIN_PROJECT_ID !== 'your_project_id';

  if (hasValidCredentials) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      });
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);

      // Fallback to application default credentials in development
      if (process.env.NODE_ENV === 'development') {
        try {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          });
          console.log('Firebase Admin SDK initialized with application default credentials');
        } catch (fallbackError) {
          console.error('Failed to initialize Firebase Admin SDK with fallback:', fallbackError);
        }
      }
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.error('Firebase Admin SDK not initialized: Missing valid Firebase Admin credentials in production');
    } else {
      console.warn('Firebase Admin SDK not initialized: Using placeholder Firebase Admin credentials in development');
    }
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export { admin };
