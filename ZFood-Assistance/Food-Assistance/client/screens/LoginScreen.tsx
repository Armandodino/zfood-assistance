import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    
    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await login(email.trim(), password);
    setIsLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error || "Identifiants incorrects");
    }
  };

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
        <Animated.View
          entering={FadeInUp.delay(100).duration(500)}
          style={styles.header}
        >
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
          />
          <ThemedText type="h1" style={styles.title}>
            ZFood
          </ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            Numero 1 dans Attieke
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={[styles.card, { backgroundColor: theme.backgroundRoot }, Shadows.card]}
        >
          <ThemedText type="h3" style={[styles.cardTitle, { color: theme.text }]}>
            Connexion Admin
          </ThemedText>

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
              Email
            </ThemedText>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: theme.backgroundDefault, borderColor: error ? ZFoodColors.error : theme.border },
              ]}
            >
              <Feather name="mail" size={20} color={theme.textMuted} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="votre@email.ci"
                placeholderTextColor={theme.textMuted}
                value={email}
                onChangeText={(text) => { setEmail(text); setError(""); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={[styles.label, { color: theme.textMuted }]}>
              Mot de passe
            </ThemedText>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: theme.backgroundDefault, borderColor: error ? ZFoodColors.error : theme.border },
              ]}
            >
              <Feather name="lock" size={20} color={theme.textMuted} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Votre mot de passe"
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={(text) => { setPassword(text); setError(""); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[
              styles.button,
              { backgroundColor: ZFoodColors.primary600 },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ThemedText type="body" style={styles.buttonText}>
                Connexion...
              </ThemedText>
            ) : (
              <>
                <Feather name="log-in" size={20} color="#FFFFFF" />
                <ThemedText type="body" style={styles.buttonText}>
                  Se connecter
                </ThemedText>
              </>
            )}
          </Pressable>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(500).duration(500)}
          style={styles.footer}
        >
          <ThemedText type="small" style={styles.version}>
            v2.0
          </ThemedText>
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
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    paddingTop: Spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    backgroundColor: "#FFFFFF",
  },
  title: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
  },
  cardTitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
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
  footer: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  badgeText: {
    color: "#FFFFFF",
  },
  version: {
    color: "rgba(255, 255, 255, 0.6)",
  },
});
