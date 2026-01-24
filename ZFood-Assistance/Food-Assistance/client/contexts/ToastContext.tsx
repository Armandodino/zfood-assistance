import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import * as Haptics from "expo-haptics";

import { Toast, ToastType } from "@/components/Toast";

interface ToastState {
  visible: boolean;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    title: "",
    message: undefined,
  });

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    if (type === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (type === "error") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (type === "warning") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setToast({
      visible: true,
      type,
      title,
      message,
    });
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast("success", title, message);
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast("error", title, message);
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    showToast("warning", title, message);
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast("info", title, message);
  }, [showToast]);

  const handleDismiss = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onDismiss={handleDismiss}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
