import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from './types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          
          // Check validUntil for verifikator
          if (userData.role === 'verifikator' && userData.validUntil) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const validDate = new Date(userData.validUntil);
            
            if (today > validDate) {
              alert("Masa berlaku akun Verifikator Anda telah habis.");
              await signOut(auth);
              setCurrentUser(null);
              setLoading(false);
              return;
            }
          }
          
          setCurrentUser(userData);
        } else {
          // Auto-create Bapperida if it's the admin email and doc doesn't exist
          if (user.email === 'retri.nastiti@gmail.com') {
            const newUser: User = {
              uid: user.uid,
              name: 'Admin Bapperida',
              email: user.email,
              role: 'bapperida',
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newUser);
            setCurrentUser(newUser);
          } else {
            // For pengusul, the doc is created during registration.
            // If it doesn't exist yet (race condition during register), it will be caught by the next snapshot or reload.
            setCurrentUser(null);
          }
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
