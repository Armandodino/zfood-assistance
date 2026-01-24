import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from '../utils/api';

const AUTH_STORAGE_KEY = "@zfood_auth";
const USERS_STORAGE_KEY = "@zfood_users";

async function logActivityToServer(user: { id: string; name: string; email: string }, actionType: string) {
  try {
    await fetch(`${getApiUrl()}/api/activity-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminId: user.id,
        adminName: user.name,
        adminEmail: user.email,
        actionType,
      }),
    });
  } catch (error) {
    console.warn('Failed to log activity:', error);
  }
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  isSudo: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  fonction?: string;
  phone?: string;
  photo?: string;
}

const DEFAULT_USERS: User[] = [
  {
    id: "1",
    name: "Armando",
    email: "armando@zfood.ci",
    password: "Moutonblanc98@",
    isSudo: true,
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Zara Ange",
    email: "zaraange@zfood.ci",
    password: "0000",
    isSudo: false,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Daniel",
    email: "daniel@zfood.ci",
    password: "0000",
    isSudo: false,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Agent",
    email: "agent@zfood.ci",
    password: "Agent2026",
    isSudo: false,
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
  },
];

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  showLoadingScreen: boolean;
  currentUser: User | null;
  allUsers: User[];
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  finishLoading: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (name: string, email: string, fonction?: string, phone?: string, photo?: string) => Promise<{ success: boolean; error?: string }>;
  updateUserAsSudo: (userId: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  completePasswordChange: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      let usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      let users: User[];
      
      if (!usersData) {
        users = DEFAULT_USERS;
        await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      } else {
        users = JSON.parse(usersData);
        // Ensure all default users exist (sync new default accounts)
        let updated = false;
        for (const defaultUser of DEFAULT_USERS) {
          const exists = users.find(u => u.email.toLowerCase() === defaultUser.email.toLowerCase());
          if (!exists) {
            users.push(defaultUser);
            updated = true;
          }
        }
        if (updated) {
          await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }
      }
      setAllUsers(users);

      const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (authData) {
        const { userId } = JSON.parse(authData);
        const user = users.find(u => u.id === userId);
        if (user) {
          setCurrentUser(user);
          setMustChangePassword(user.mustChangePassword);
          setIsLoggedIn(true);
        }
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUsers = async (users: User[]) => {
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    setAllUsers(users);
  };

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: User[] = usersData ? JSON.parse(usersData) : DEFAULT_USERS;
      
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return { success: false, error: "Email non trouve" };
      }
      
      if (user.password !== password) {
        return { success: false, error: "Mot de passe incorrect" };
      }

      setCurrentUser(user);
      setMustChangePassword(user.mustChangePassword);
      setShowLoadingScreen(true);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userId: user.id }));
      
      logActivityToServer(user, 'login');
      
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erreur de connexion" };
    }
  }, []);

  const finishLoading = useCallback(() => {
    setShowLoadingScreen(false);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(async () => {
    if (currentUser) {
      logActivityToServer(currentUser, 'logout');
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    setMustChangePassword(false);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }, [currentUser]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: "Non connecte" };
    }

    if (currentUser.password !== currentPassword) {
      return { success: false, error: "Mot de passe actuel incorrect" };
    }

    if (newPassword.length < 4) {
      return { success: false, error: "Le nouveau mot de passe doit contenir au moins 4 caracteres" };
    }

    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: User[] = usersData ? JSON.parse(usersData) : [];
      
      const updatedUsers = users.map(u => 
        u.id === currentUser.id 
          ? { ...u, password: newPassword, mustChangePassword: false }
          : u
      );
      
      await saveUsers(updatedUsers);
      
      const updatedUser = { ...currentUser, password: newPassword, mustChangePassword: false };
      setCurrentUser(updatedUser);
      setMustChangePassword(false);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erreur lors du changement de mot de passe" };
    }
  }, [currentUser]);

  const completePasswordChange = useCallback(() => {
    setMustChangePassword(false);
  }, []);

  const updateProfile = useCallback(async (name: string, email: string, fonction?: string, phone?: string, photo?: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: "Non connecte" };
    }

    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: User[] = usersData ? JSON.parse(usersData) : [];
      
      const emailExists = users.some(u => u.id !== currentUser.id && u.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        return { success: false, error: "Cet email est deja utilise" };
      }
      
      const updatedUsers = users.map(u => 
        u.id === currentUser.id 
          ? { ...u, name, email, fonction, phone, photo }
          : u
      );
      
      await saveUsers(updatedUsers);
      setCurrentUser({ ...currentUser, name, email, fonction, phone, photo });
      
      // Sync to backend
      try {
        await fetch(`${getApiUrl()}/api/users/${currentUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, fonction, phone, photo }),
        });
      } catch (e) {
        console.warn('Failed to sync profile to backend:', e);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erreur lors de la mise a jour" };
    }
  }, [currentUser]);

  const updateUserAsSudo = useCallback(async (userId: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser?.isSudo) {
      return { success: false, error: "Acces non autorise" };
    }

    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: User[] = usersData ? JSON.parse(usersData) : [];
      
      if (updates.email) {
        const emailExists = users.some(u => u.id !== userId && u.email.toLowerCase() === updates.email!.toLowerCase());
        if (emailExists) {
          return { success: false, error: "Cet email est deja utilise" };
        }
      }
      
      const updatedUsers = users.map(u => 
        u.id === userId 
          ? { ...u, ...updates }
          : u
      );
      
      await saveUsers(updatedUsers);
      
      // Sync to backend
      try {
        await fetch(`${getApiUrl()}/api/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (e) {
        console.warn('Failed to sync user update to backend:', e);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erreur lors de la mise a jour" };
    }
  }, [currentUser]);

  const resetUserPassword = useCallback(async (userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser?.isSudo) {
      return { success: false, error: "Acces non autorise" };
    }

    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: User[] = usersData ? JSON.parse(usersData) : [];
      
      const updatedUsers = users.map(u => 
        u.id === userId 
          ? { ...u, password: newPassword, mustChangePassword: true }
          : u
      );
      
      await saveUsers(updatedUsers);
      
      // Sync to backend
      try {
        await fetch(`${getApiUrl()}/api/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword, mustChangePassword: true }),
        });
      } catch (e) {
        console.warn('Failed to sync password reset to backend:', e);
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erreur lors de la reinitialisation" };
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        showLoadingScreen,
        currentUser,
        allUsers,
        mustChangePassword,
        login,
        logout,
        finishLoading,
        changePassword,
        updateProfile,
        updateUserAsSudo,
        resetUserPassword,
        completePasswordChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
