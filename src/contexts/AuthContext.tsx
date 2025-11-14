'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: 'agent' | 'admin';
    createdAt: string;
    lastLoginAt: string;
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signInWithDevBypass: () => Promise<void>;
    signUpWithEmail: (name: string, email: string, password: string, role?: 'agent' | 'admin') => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);

            if (user) {
                await loadUserProfile(user.uid);
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const loadUserProfile = async (userId: string) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                setUserProfile(userDoc.data() as UserProfile);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    };

    const createUserProfile = async (user: User, additionalData: Partial<UserProfile> = {}) => {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                const profile: UserProfile = {
                    id: user.uid,
                    name: additionalData.name || user.displayName || 'Unknown User',
                    email: user.email || '',
                    avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(additionalData.name || user.displayName || 'User')}&background=0ea5e9&color=fff`,
                    role: additionalData.role || 'agent',
                    createdAt: new Date().toISOString(),
                    lastLoginAt: new Date().toISOString()
                };

                await setDoc(userRef, profile);
                setUserProfile(profile);

                toast({
                    title: "Welcome!",
                    description: `Your ${profile.role} account has been created successfully.`,
                });
            } else {
                // Update last login time
                await setDoc(userRef, {
                    lastLoginAt: new Date().toISOString()
                }, { merge: true });

                setUserProfile(userDoc.data() as UserProfile);
            }
        } catch (error) {
            console.error('Error creating/updating user profile:', error);
            toast({
                title: "Profile Error",
                description: "Failed to create or update user profile",
                variant: "destructive"
            });
        }
    };

    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await createUserProfile(result.user);

            toast({
                title: "Welcome back!",
                description: "Successfully signed in with Google",
            });
        } catch (error: any) {
            console.error('Google sign in error:', error);
            toast({
                title: "Sign In Failed",
                description: error.message || "Failed to sign in with Google",
                variant: "destructive"
            });
            throw error;
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await createUserProfile(result.user);

            toast({
                title: "Welcome back!",
                description: "Successfully signed in",
            });
        } catch (error: any) {
            console.error('Email sign in error:', error);

            let errorMessage = "Failed to sign in";
            if (error.code === 'auth/user-not-found') {
                errorMessage = "No account found with this email";
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = "Incorrect password";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Invalid email address";
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = "This account has been disabled";
            }

            toast({
                title: "Sign In Failed",
                description: errorMessage,
                variant: "destructive"
            });
            throw new Error(errorMessage);
        }
    };

    const signUpWithEmail = async (name: string, email: string, password: string, role: 'agent' | 'admin' = 'agent') => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Update display name
            await updateProfile(result.user, {
                displayName: name
            });

            await createUserProfile(result.user, { name, role });

            toast({
                title: "Account Created!",
                description: `Your ${role} account has been successfully created.`,
            });
        } catch (error: any) {
            console.error('Email sign up error:', error);

            let errorMessage = "Failed to create account";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "An account with this email already exists";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Invalid email address";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Password should be at least 6 characters";
            }

            toast({
                title: "Registration Failed",
                description: errorMessage,
                variant: "destructive"
            });
            throw new Error(errorMessage);
        }
    };

    const signInWithDevBypass = async () => {
        // Only allow in development mode
        if (process.env.NODE_ENV !== 'development') {
            throw new Error('Development bypass is only available in development mode');
        }

        try {
            // Create a mock user object for development bypass
            const mockUser = {
                uid: 'dev-bypass-user',
                email: 'dev@example.com',
                displayName: 'Development User',
                photoURL: null,
                emailVerified: true,
                isAnonymous: false,
                metadata: {},
                providerData: [],
                refreshToken: '',
                tenantId: null,
                delete: async () => { },
                getIdToken: async () => 'mock-token',
                getIdTokenResult: async () => ({
                    token: 'mock-token',
                    expirationTime: new Date().toISOString(),
                    authTime: new Date().toISOString(),
                    issuedAtTime: new Date().toISOString(),
                    signInProvider: null,
                    signInSecondFactor: null,
                    claims: {}
                }),
                reload: async () => { },
                toJSON: () => ({})
            } as any;

            // Set the mock user
            setUser(mockUser);

            // Create a mock user profile
            const mockProfile: UserProfile = {
                id: mockUser.uid,
                name: mockUser.displayName,
                email: mockUser.email,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(mockUser.displayName)}&background=0ea5e9&color=fff`,
                role: 'admin',
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString()
            };

            setUserProfile(mockProfile);

            toast({
                title: "Development Mode",
                description: "Successfully bypassed authentication (Development Mode)",
            });
        } catch (error: any) {
            console.error('Development bypass error:', error);
            toast({
                title: "Bypass Failed",
                description: error.message || "Failed to bypass authentication",
                variant: "destructive"
            });
            throw error;
        }
    };

    const signOut = async () => {
        try {
            // If we're in development mode and using bypass, just clear the state
            if (process.env.NODE_ENV === 'development' && user?.uid === 'dev-bypass-user') {
                setUser(null);
                setUserProfile(null);
            } else {
                await firebaseSignOut(auth);
                setUserProfile(null);
            }

            toast({
                title: "Signed Out",
                description: "You have been successfully signed out",
            });
        } catch (error: any) {
            console.error('Sign out error:', error);
            toast({
                title: "Sign Out Failed",
                description: "Failed to sign out",
                variant: "destructive"
            });
            throw error;
        }
    };

    const value: AuthContextType = {
        user,
        userProfile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signInWithDevBypass,
        signUpWithEmail,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
