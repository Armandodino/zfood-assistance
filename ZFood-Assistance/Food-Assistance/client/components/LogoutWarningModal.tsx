import React from "react";
import { View, StyleSheet, Modal, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useSecurity } from "@/contexts/SecurityContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, ZFoodColors } from "@/constants/theme";

export function LogoutWarningModal() {
  const { theme } = useTheme();
  const { showLogoutWarning, secondsRemaining, extendSession, logout: securityLogout } = useSecurity();
  const { logout: authLogout } = useAuth();

  const handleExtend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    extendSession();
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    securityLogout();
    authLogout();
  };

  return (
    <Modal
      visible={showLogoutWarning}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.iconContainer, { backgroundColor: ZFoodColors.warning + "20" }]}>
            <Feather name="clock" size={32} color={ZFoodColors.warning} />
          </View>
          
          <ThemedText type="h3" style={[styles.title, { color: theme.text }]}>
            Session inactive
          </ThemedText>
          
          <ThemedText type="body" style={[styles.message, { color: theme.textSecondary }]}>
            Pour votre securite, vous serez deconnecte dans
          </ThemedText>
          
          <View style={styles.countdownContainer}>
            <ThemedText type="h1" style={[styles.countdown, { color: ZFoodColors.warning }]}>
              {secondsRemaining}
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              secondes
            </ThemedText>
          </View>

          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.extendButton, { backgroundColor: ZFoodColors.primary600 }]}
              onPress={handleExtend}
            >
              <Feather name="refresh-cw" size={18} color="#fff" />
              <ThemedText style={styles.buttonTextWhite}>
                Rester connecte
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.button, styles.logoutButton, { borderColor: theme.border }]}
              onPress={handleLogout}
            >
              <Feather name="log-out" size={18} color={theme.textSecondary} />
              <ThemedText style={[styles.buttonText, { color: theme.textSecondary }]}>
                Se deconnecter
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modal: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  countdownContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  countdown: {
    fontSize: 48,
    fontWeight: "800",
  },
  buttons: {
    width: "100%",
    gap: Spacing.sm,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  extendButton: {},
  logoutButton: {
    borderWidth: 1,
  },
  buttonTextWhite: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 16,
  },
});
