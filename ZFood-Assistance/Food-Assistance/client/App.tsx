import React, { useEffect } from "react";
import { StyleSheet, ActivityIndicator, View, Pressable } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import LoginScreen from "@/screens/LoginScreen";
import LoadingScreen from "@/screens/LoadingScreen";
import ChangePasswordScreen from "@/screens/ChangePasswordScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SecurityProvider, useSecurity } from "@/contexts/SecurityContext";
import { DataProvider } from "@/contexts/DataContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { LogoutWarningModal } from "@/components/LogoutWarningModal";
import { ZFoodColors } from "@/constants/theme";

SplashScreen.preventAutoHideAsync();

function ActivityTracker({ children }: { children: React.ReactNode }) {
  const { resetInactivityTimer } = useSecurity();

  return (
    <Pressable 
      style={styles.root} 
      onPress={resetInactivityTimer}
      onTouchStart={resetInactivityTimer}
    >
      {children}
      <LogoutWarningModal />
    </Pressable>
  );
}

function SecureAppContent({ userPassword, onAutoLogout }: { userPassword: string; onAutoLogout: () => void }) {
  return (
    <SecurityProvider userPassword={userPassword} onAutoLogout={onAutoLogout}>
      <ToastProvider>
        <ActivityTracker>
          <NavigationContainer>
            <RootStackNavigator />
          </NavigationContainer>
        </ActivityTracker>
      </ToastProvider>
    </SecurityProvider>
  );
}

function AppContent() {
  const { isLoggedIn, isLoading, showLoadingScreen, finishLoading, mustChangePassword, currentUser, logout } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={ZFoodColors.primary600} />
      </View>
    );
  }

  if (showLoadingScreen) {
    return <LoadingScreen onFinish={finishLoading} />;
  }

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  if (mustChangePassword) {
    return <ChangePasswordScreen />;
  }

  return (
    <DataProvider>
      <SecureAppContent userPassword={currentUser?.password || ""} onAutoLogout={logout} />
    </DataProvider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
              <StatusBar style="auto" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});
