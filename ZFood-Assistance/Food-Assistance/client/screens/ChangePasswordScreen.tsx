import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, ZFoodColors, Shadows } from "@/constants/theme";

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { currentUser, changePassword } = useAuth();

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async () => {
    setError("");

    if (!currentPass || !newPass || !confirmPass) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    if (newPass !== confirmPass) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (newPass.length < 4) {
      setError("Le nouveau mot de passe doit contenir au moins 4 caracteres");
      return;
    }

    if (newPass === "0000") {
      setError("Veuillez choisir un mot de passe different de 0000");
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await changePassword(currentPass, newPass);
    setIsLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error || "Erreur lors du changement");
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: ZFoodColors.primary600 }]}>
        <View style={[styles.content, { paddingTop: insets.top + Spacing.xl }]}>
          <Animated.View entering={FadeInUp.duration(500)} style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Feather name="check-circle" size={64} color={ZFoodColors.success} />
            </View>
            <ThemedText type="h2" style={styles.successTitle}>
              Mot de passe modifie
            </ThemedText>
            <ThemedText type="body" style={styles.successMessage}>
              Votre nouveau mot de passe a ete enregistre avec succes.
            </ThemedText>
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: ZFoodColors.primary600 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.header}>
          <View style={styles.lockIcon}>
            <Feather name="shield" size={48} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={styles.title}>
            Changement obligatoire
          </ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            Bonjour {currentUser?.name}, vous devez changer votre mot de passe par defaut pour continuer.
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={[styles.card, { backgroundColor: theme.backgroundRoot }, Shadows.card]}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color={ZFoodColors.error} />
              <ThemedText type="small" style={styles.errorText}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={[styles.label, { color: theme.textMuted }]}>
              Mot de passe actuel
            </ThemedText>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
              ]}
            >
              <Feather name="lock" size={20} color={theme.textMuted} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Votre mot de passe actuel"
                placeholderTextColor={theme.textMuted}
                value={currentPass}
                onChangeText={(text) => { setCurrentPass(text); setError(""); }}
                secureTextEntry={!showCurrentPass}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowCurrentPass(!showCurrentPass)}>
                <Feather name={showCurrentPass ? "eye-off" : "eye"} size={20} color={theme.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={[styles.label, { color: theme.textMuted }]}>
              Nouveau mot de passe
            </ThemedText>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
              ]}
            >
              <Feather name="key" size={20} color={theme.textMuted} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Minimum 4 caracteres"
                placeholderTextColor={theme.textMuted}
                value={newPass}
                onChangeText={(text) => { setNewPass(text); setError(""); }}
                secureTextEntry={!showNewPass}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowNewPass(!showNewPass)}>
                <Feather name={showNewPass ? "eye-off" : "eye"} size={20} color={theme.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={[styles.label, { color: theme.textMuted }]}>
              Confirmer le nouveau mot de passe
            </ThemedText>
            <View
              style={[
                styles.inputContainer,
                { 
                  backgroundColor: theme.backgroundDefault, 
                  borderColor: confirmPass && confirmPass !== newPass ? ZFoodColors.error : theme.border,
                },
              ]}
            >
              <Feather name="check-circle" size={20} color={confirmPass && confirmPass === newPass ? ZFoodColors.success : theme.textMuted} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Repetez le nouveau mot de passe"
                placeholderTextColor={theme.textMuted}
                value={confirmPass}
                onChangeText={(text) => { setConfirmPass(text); setError(""); }}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          <Pressable
            style={[
              styles.button,
              { backgroundColor: ZFoodColors.primary600 },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ThemedText type="body" style={styles.buttonText}>
                Enregistrement...
              </ThemedText>
            ) : (
              <>
                <Feather name="save" size={20} color="#FFFFFF" />
                <ThemedText type="body" style={styles.buttonText}>
                  Enregistrer
                </ThemedText>
              </>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    paddingHorizontal: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ZFoodColors.error + "15",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    color: ZFoodColors.error,
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  successTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  successMessage: {
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
});
