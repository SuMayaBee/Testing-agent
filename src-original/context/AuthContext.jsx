import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, provider, isDevMode } from "../lib/firebase-config";

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const localAuthStateLoaded = useRef(false);

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user || null);

      if (!localAuthStateLoaded.current) {
        localAuthStateLoaded.current = true;
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists
      const userDocRef = doc(db, "user-emails", user.email);
      const userDocSnap = await getDoc(userDocRef);

      // If not, create a new user document
      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          name: user.displayName || user.email.split("@")[0],
          organizations: [],
          createdAt: new Date().toISOString(),
        });
      }

      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Context value
  const value = {
    currentUser,
    signIn,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use Auth Context
export function useAuth() {
  return useContext(AuthContext);
}
