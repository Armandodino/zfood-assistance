import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSecurity } from "@/contexts/SecurityContext";
import { Spacing, BorderRadius, Shadows, ZFoodColors } from "@/constants/theme";

interface OrderCardProps {
  id: string;
  clientName: string;
  quantity: number;
  amount: number;
  date: string;
  isPaid: boolean;
  onTogglePaid: () => void;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OrderCard({
  id,
  clientName,
  quantity,
  amount,
  date,
  isPaid,
  onTogglePaid,
  onPress,
}: OrderCardProps) {
  const { theme } = useTheme();
  const { requestAuth } = useSecurity();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handleTogglePaid = () => {
    requestAuth(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onTogglePaid();
    });
  };

  const formattedDate = new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedTime = new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedAmount = new Intl.NumberFormat("fr-FR").format(amount);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundRoot },
        Shadows.cardSmall,
        animatedStyle,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.leftContent}>
          <ThemedText type="h3" style={{ color: theme.text }}>
            {clientName}
          </ThemedText>
          <View style={styles.dateRow}>
            <Feather name="calendar" size={12} color={theme.textMuted} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
              {formattedDate} à {formattedTime}
            </ThemedText>
          </View>
          <View style={styles.quantityBadge}>
            <Feather name="shopping-bag" size={12} color={ZFoodColors.primary600} />
            <ThemedText type="small" style={{ color: ZFoodColors.primary600, marginLeft: 4, fontWeight: "600" }}>
              {quantity || 1} panier{(quantity || 1) > 1 ? "s" : ""}
            </ThemedText>
          </View>
        </View>

        <View style={styles.rightContent}>
          <ThemedText type="h2" style={{ color: ZFoodColors.primary900 }}>
            {formattedAmount}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            FCFA
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={handleTogglePaid}
          style={[
            styles.statusBadge,
            {
              backgroundColor: isPaid
                ? ZFoodColors.success + "15"
                : ZFoodColors.warning + "15",
            },
          ]}
        >
          <Feather
            name={isPaid ? "check-circle" : "clock"}
            size={14}
            color={isPaid ? ZFoodColors.success : ZFoodColors.warning}
          />
          <ThemedText
            type="small"
            style={{
              color: isPaid ? ZFoodColors.success : ZFoodColors.warning,
              fontWeight: "600",
              marginLeft: 4,
            }}
          >
            {isPaid ? "Payé" : "Impayé"}
          </ThemedText>
        </Pressable>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius["2xl"],
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  leftContent: {
    flex: 1,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  quantityBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    backgroundColor: ZFoodColors.primary600 + "10",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  rightContent: {
    alignItems: "flex-end",
  },
  footer: {
    marginTop: Spacing.md,
    flexDirection: "row",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
});
