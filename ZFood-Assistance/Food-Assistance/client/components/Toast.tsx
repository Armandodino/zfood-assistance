import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ZFoodColors, BorderRadius, Spacing, Shadows } from "@/constants/theme";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  visible: boolean;
  type: ToastType;
  title: string;
  message?: string;
  onDismiss: () => void;
  duration?: number;
}

const toastConfig: Record<ToastType, { icon: keyof typeof Feather.glyphMap; bgColor: string; iconBg: string; iconColor: string }> = {
  success: {
    icon: "check-circle",
    bgColor: "#ffffff",
    iconBg: ZFoodColors.primary600 + "15",
    iconColor: ZFoodColors.primary600,
  },
  error: {
    icon: "x-circle",
    bgColor: "#ffffff",
    iconBg: ZFoodColors.error + "15",
    iconColor: ZFoodColors.error,
  },
  warning: {
    icon: "alert-triangle",
    bgColor: "#ffffff",
    iconBg: ZFoodColors.warning + "15",
    iconColor: ZFoodColors.warning,
  },
  info: {
    icon: "info",
    bgColor: "#ffffff",
    iconBg: ZFoodColors.accent + "15",
    iconColor: ZFoodColors.accent,
  },
};

export function Toast({ visible, type, title, message, onDismiss, duration = 3000 }: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  const config = toastConfig[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + Spacing.md,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <Pressable onPress={handleDismiss} style={[styles.toast, Shadows.card]}>
        <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
          <Feather name={config.icon} size={24} color={config.iconColor} />
        </View>
        <View style={styles.content}>
          <ThemedText style={[styles.title, { color: "#1f2937" }]}>{title}</ThemedText>
          {message ? (
            <ThemedText style={[styles.message, { color: "#6b7280" }]}>{message}</ThemedText>
          ) : null}
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.accentBar, { backgroundColor: config.iconColor }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
  },
  toast: {
    backgroundColor: "#ffffff",
    borderRadius: BorderRadius.xl,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    overflow: "hidden",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  accentBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
});
