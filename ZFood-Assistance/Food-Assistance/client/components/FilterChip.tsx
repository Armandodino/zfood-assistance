import React from "react";
import { StyleSheet, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, ZFoodColors } from "@/constants/theme";

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FilterChip({ label, isActive, onPress }: FilterChipProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.selectionAsync();
    scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    }, 100);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[
        styles.chip,
        {
          backgroundColor: isActive
            ? ZFoodColors.primary600
            : theme.backgroundDefault,
          borderColor: isActive ? ZFoodColors.primary600 : theme.border,
        },
        animatedStyle,
      ]}
    >
      <ThemedText
        type="small"
        style={{
          color: isActive ? "#fff" : theme.textSecondary,
          fontWeight: isActive ? "600" : "400",
        }}
      >
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
});
