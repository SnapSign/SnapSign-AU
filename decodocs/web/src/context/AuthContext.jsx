import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, connectAuthEmulator } from 'firebase/auth';

/**
 * AuthContext provides auth state management with error handling
 * Auth failures are treated as soft errors - the app continues to work
 */
const AuthContext = createContext();

// Firebase configuration
let firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'snapsign-au.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID || 'snapsign-au',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'snapsign-au.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const isProbablyPlaceholder = (v) => {
  if (!v || typeof v !== 'string') return true;
  const s = v.trim();
  return (
    s === '' ||
    s.includes('your_') ||
    s.includes('replace_me') ||
    s.includes('changeme')
  );
};

// Initialize Firebase
let app = null;
let auth = null;
let authEmulatorConnected = false;

try {
  // Check if we are in MOCK_AUTH mode (e.g. End-to-End tests)
  if (window.MOCK_AUTH) {
     // In mock mode, if keys are missing, provide dummy values to ensure app initialization
     if (isProbablyPlaceholder(firebaseConfig.apiKey)) {
         console.log('Using dummy Firebase config for MOCK_AUTH mode');
         firebaseConfig = {
             apiKey: "AIzaSyDummyKeyForMockStats",
             authDomain: "mock-project.firebaseapp.com",
             projectId: "mock-project",
             storageBucket: "mock-project.appspot.com",
             messagingSenderId: "123456789",
             appId: "1:123456789:web:abcdef"
         };
     }
  } else if (isProbablyPlaceholder(firebaseConfig.apiKey)) {
    throw new Error(
      'Missing/placeholder Firebase API key. Set VITE_FIREBASE_API_KEY in decodocs-repo/web/.env (or enable the Auth emulator).'
    );
  }

  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);

  // Optional: local dev can run against the Firebase Auth emulator.
  // This keeps local development unblocked when you don't want to use real project keys.
  const useEmulator = String(import.meta.env.VITE_USE_FIREBASE_EMULATOR || '').toLowerCase() === 'true';
  if (useEmulator && !authEmulatorConnected) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    authEmulatorConnected = true;
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
}

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    status: 'pending', // pending, authenticated, error
    user: null,
    error: null,
  });

  useEffect(() => {
    const initAuth = async () => {
      // Test Mode Mock
      if (window.MOCK_AUTH) {
        // window.MOCK_AUTH_USER can be set to null to simulate logged-out state
        // If undefined, defaults to a valid user
        const mockUser = window.MOCK_AUTH_USER === undefined 
          ? { uid: 'test-user', isAnonymous: true } 
          : window.MOCK_AUTH_USER;

        setAuthState({
          status: mockUser ? 'authenticated' : 'unauthenticated',
          user: mockUser,
          error: null
        });
        return;
      }

      if (!auth) {
        setAuthState({
          status: 'error',
          user: null,
          error: new Error('Firebase Auth not available'),
        });
        console.error('Firebase Auth not available');
        return;
      }

      try {
        const userCredential = await signInAnonymously(auth);
        setAuthState({
          status: 'authenticated',
          user: userCredential.user,
          error: null,
        });
      } catch (error) {
        console.error('Authentication error:', error);
        // Treat auth failure as a soft error - app continues to work
        setAuthState({
          status: 'error',
          user: null,
          error,
        });
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ authState, app, auth }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 * Returns { authState, app, auth }
 * authState has: { status, user, error }
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
