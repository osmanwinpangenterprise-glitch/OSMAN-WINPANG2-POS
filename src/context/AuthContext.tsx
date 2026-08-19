import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../config/firebase';
import { UserProfile, UserRole } from '../types';
import { DEMO_STAFF } from '../config/constants';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  activeRole: UserRole;
  isAdmin: boolean;
  isManager: boolean;
  isCashier: boolean;
  isStorekeeper: boolean;
  canProcessSales: boolean;
  canManageProducts: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  loginWithGoogle: () => Promise<void>;
  switchStaffProfile: (staffUser: (typeof DEMO_STAFF)[0]) => void;
  updateRole: (newRole: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('owe_active_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default to Administrator profile for immediate access
    return {
      userId: DEMO_STAFF[0].userId,
      email: DEMO_STAFF[0].email,
      fullName: DEMO_STAFF[0].fullName,
      role: 'ADMINISTRATOR',
      employeeId: DEMO_STAFF[0].employeeId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
  const [loading, setLoading] = useState(true);
  const { success, error: toastError, info } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            setProfile(data);
            localStorage.setItem('owe_active_profile', JSON.stringify(data));
          } else {
            // Create user profile for new Google sign in
            const newProfile: UserProfile = {
              userId: currentUser.uid,
              email: currentUser.email || 'user@osmanwinpang.com',
              fullName: currentUser.displayName || 'Enterprise Staff',
              photoURL: currentUser.photoURL || null,
              role: currentUser.email?.includes('admin') || currentUser.email?.includes('osman') ? 'ADMINISTRATOR' : 'MANAGER',
              employeeId: `EMP-${Math.floor(100 + Math.random() * 900)}`,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
            localStorage.setItem('owe_active_profile', JSON.stringify(newProfile));
          }
        } catch (err) {
          console.warn('Could not fetch user profile from Firestore:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      success('Logged In', `Welcome back, ${result.user.displayName || result.user.email}`);
    } catch (err: unknown) {
      toastError('Login Failed', err instanceof Error ? err.message : 'Authentication could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  const switchStaffProfile = (staff: (typeof DEMO_STAFF)[0]) => {
    const newProfile: UserProfile = {
      userId: staff.userId,
      email: staff.email,
      fullName: staff.fullName,
      role: staff.role,
      employeeId: staff.employeeId,
      status: staff.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProfile(newProfile);
    localStorage.setItem('owe_active_profile', JSON.stringify(newProfile));
    info('Active Role Switched', `Now operating as ${staff.fullName} (${staff.role})`);
  };

  const updateRole = async (newRole: UserRole) => {
    if (!profile) return;
    const updated = { ...profile, role: newRole, updatedAt: new Date().toISOString() };
    setProfile(updated);
    localStorage.setItem('owe_active_profile', JSON.stringify(updated));
    if (user) {
      try {
        await setDoc(doc(db, 'users', profile.userId), updated, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${profile.userId}`);
      }
    }
    success('Role Updated', `Switched to ${newRole}`);
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      // Reset to default cashier/admin profile
      switchStaffProfile(DEMO_STAFF[0]);
      success('Logged Out', 'Signed out of Google account.');
    } catch (err: unknown) {
      toastError('Logout Failed', err instanceof Error ? err.message : 'Error logging out.');
    }
  };

  const activeRole: UserRole = profile?.role || 'ADMINISTRATOR';
  const isAdmin = activeRole === 'ADMINISTRATOR';
  const isManager = isAdmin || activeRole === 'MANAGER';
  const isCashier = isManager || activeRole === 'CASHIER';
  const isStorekeeper = isManager || activeRole === 'STOREKEEPER';

  const canProcessSales = isCashier;
  const canManageProducts = isStorekeeper || isManager;
  const canViewReports = isManager;
  const canManageSettings = isAdmin;
  const canManageUsers = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        activeRole,
        isAdmin,
        isManager,
        isCashier,
        isStorekeeper,
        canProcessSales,
        canManageProducts,
        canViewReports,
        canManageSettings,
        canManageUsers,
        loginWithGoogle,
        switchStaffProfile,
        updateRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
