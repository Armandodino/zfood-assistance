import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { AppState, AppStateStatus } from "react-native";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE = 60 * 1000; // 1 minute warning

interface SecurityContextType {
  isAuthenticated: boolean;
  showSecurityModal: boolean;
  pendingAction: (() => void) | null;
  showLogoutWarning: boolean;
  secondsRemaining: number;
  requestAuth: (action: () => void) => void;
  authenticate: (password: string) => boolean;
  cancelAuth: () => void;
  resetInactivityTimer: () => void;
  extendSession: () => void;
  logout: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
  userPassword?: string;
  onAutoLogout?: () => void;
}

export function SecurityProvider({ children, userPassword, onAutoLogout }: SecurityProviderProps) {
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  
  const lastActivityRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    clearAllTimers();
    setIsAuthenticated(false);
    setShowLogoutWarning(false);
    setSecondsRemaining(60);
    if (onAutoLogout) {
      onAutoLogout();
    }
  }, [clearAllTimers, onAutoLogout]);

  const startInactivityTimers = useCallback(() => {
    if (!isAuthenticated) return;
    
    clearAllTimers();
    lastActivityRef.current = Date.now();

    warningTimerRef.current = setTimeout(() => {
      setShowLogoutWarning(true);
      setSecondsRemaining(60);
      
      countdownRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    logoutTimerRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [isAuthenticated, clearAllTimers, logout]);

  const resetInactivityTimer = useCallback(() => {
    if (isAuthenticated && !showLogoutWarning) {
      startInactivityTimers();
    }
  }, [isAuthenticated, showLogoutWarning, startInactivityTimers]);

  const extendSession = useCallback(() => {
    setShowLogoutWarning(false);
    setSecondsRemaining(60);
    startInactivityTimers();
  }, [startInactivityTimers]);

  useEffect(() => {
    if (isAuthenticated) {
      startInactivityTimers();
    } else {
      clearAllTimers();
    }
    return () => clearAllTimers();
  }, [isAuthenticated, startInactivityTimers, clearAllTimers]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && isAuthenticated) {
        const timePassed = Date.now() - lastActivityRef.current;
        if (timePassed >= INACTIVITY_TIMEOUT) {
          logout();
        } else if (timePassed >= INACTIVITY_TIMEOUT - WARNING_BEFORE) {
          const remaining = Math.ceil((INACTIVITY_TIMEOUT - timePassed) / 1000);
          setSecondsRemaining(remaining);
          setShowLogoutWarning(true);
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription?.remove();
  }, [isAuthenticated, logout]);

  const requestAuth = useCallback((action: () => void) => {
    setPendingAction(() => action);
    setShowSecurityModal(true);
  }, []);

  const authenticate = useCallback((password: string): boolean => {
    if (userPassword && password === userPassword) {
      setIsAuthenticated(true);
      setShowSecurityModal(false);
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
      return true;
    }
    return false;
  }, [pendingAction, userPassword]);

  const cancelAuth = useCallback(() => {
    setShowSecurityModal(false);
    setPendingAction(null);
  }, []);

  return (
    <SecurityContext.Provider
      value={{
        isAuthenticated,
        showSecurityModal,
        pendingAction,
        showLogoutWarning,
        secondsRemaining,
        requestAuth,
        authenticate,
        cancelAuth,
        resetInactivityTimer,
        extendSession,
        logout,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error("useSecurity must be used within a SecurityProvider");
  }
  return context;
}
