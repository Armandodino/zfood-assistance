import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSecurity } from "@/contexts/SecurityContext";
import { Spacing, BorderRadius, ZFoodColors, Shadows } from "@/constants/theme";

export function SecurityModal() {
  const { theme } = useTheme();
  const { showSecurityModal, authenticate, cancelAuth } = useSecurity();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const shakeX = useSharedValue(0);

  const handleSubmit = async () => {
    const success = authenticate(password);
    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPassword("");
      setError(false);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(true);
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  };

  const handleCancel = () => {
    setPassword("");
    setError(false);
    cancelAuth();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <Modal
      visible={showSecurityModal}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleCancel} />
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.modalContent,
            { backgroundColor: theme.backgroundRoot },
            Shadows.card,
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: ZFoodColors.accent + "20" }]}>
            <Feather name="lock" size={32} color={ZFoodColors.accent} />
          </View>

          <ThemedText type="h2" style={styles.title}>
            Authentification Requise
          </ThemedText>

          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Entrez le mot de passe administrateur pour continuer
          </ThemedText>

          <Animated.View style={animatedStyle}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: error ? ZFoodColors.error : theme.border,
                },
              ]}
              placeholder="Mot de passe"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(false);
              }}
              secureTextEntry
              autoFocus
              onSubmitEditing={handleSubmit}
            />
          </Animated.View>

          {error ? (
            <ThemedText style={[styles.errorText, { color: ZFoodColors.error }]}>
              Mot de passe incorrect
            </ThemedText>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
              onPress={handleCancel}
            >
              <ThemedText style={{ color: theme.textSecondary }}>Annuler</ThemedText>
            </Pressable>

            <Pressable
              style={[styles.button, styles.confirmButton, { backgroundColor: ZFoodColors.primary600 }]}
              onPress={handleSubmit}
            >
              <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                Valider
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: 320,
    padding: Spacing["2xl"],
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  input: {
    width: 260,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
});
