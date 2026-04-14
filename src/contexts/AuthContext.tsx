import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isClient: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          const isAdminEmail = user.email === "mhasifshaikh7028@gmail.com";
          
          if (isAdminEmail && data.role !== 'admin') {
            // Upgrade existing profile to admin if it's the admin email
            const updatedProfile = { ...data, role: 'admin' as UserRole };
            await setDoc(docRef, updatedProfile, { merge: true });
            setProfile(updatedProfile);
          } else {
            setProfile(data);
          }
        } else {
          // Create default profile for new users
          const isAdminEmail = user.email === "mhasifshaikh7028@gmail.com";
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            role: isAdminEmail ? 'admin' : 'client',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            createdAt: new Date(),
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isClient: profile?.role === 'client',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
