import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/contexts/DataContext";
import { Spacing, BorderRadius, Shadows, ZFoodColors } from "@/constants/theme";

interface ClientCardProps {
  id: string;
  name: string;
  quartier: string;
  phone: string;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const LOYALTY_GOAL = 120;

export function ClientCard({ id, name, quartier, phone, onPress }: ClientCardProps) {
  const { theme } = useTheme();
  const { getClientOrderCount } = useData();
  const scale = useSharedValue(1);

  const orderCount = getClientOrderCount(id);
  const loyaltyProgress = Math.min(orderCount / LOYALTY_GOAL, 1);
  const isLoyaltyComplete = orderCount >= LOYALTY_GOAL;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

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
        <View
          style={[
            styles.avatar,
            { backgroundColor: ZFoodColors.primary600 + "20" },
          ]}
        >
          <ThemedText
            style={[styles.avatarText, { color: ZFoodColors.primary600 }]}
          >
            {name.charAt(0).toUpperCase()}
          </ThemedText>
        </View>

        <View style={styles.info}>
          <ThemedText type="h3" style={{ color: theme.text }}>
            {name}
          </ThemedText>
          <View style={styles.detailRow}>
            <Feather name="map-pin" size={12} color={theme.textMuted} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
              {quartier}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Feather name="phone" size={12} color={theme.textMuted} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
              {phone}
            </ThemedText>
          </View>
        </View>

        <View style={styles.orderBadge}>
          <ThemedText type="h2" style={{ color: ZFoodColors.primary600 }}>
            {orderCount}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            paniers
          </ThemedText>
        </View>
      </View>

      <View style={styles.loyaltySection}>
        <View style={styles.loyaltyHeader}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Fidélité
          </ThemedText>
          <ThemedText
            type="small"
            style={{
              color: isLoyaltyComplete ? ZFoodColors.success : theme.textMuted,
              fontWeight: "600",
            }}
          >
            {orderCount}/{LOYALTY_GOAL}
          </ThemedText>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${loyaltyProgress * 100}%`,
                backgroundColor: isLoyaltyComplete
                  ? ZFoodColors.success
                  : ZFoodColors.primary600,
              },
            ]}
          />
        </View>
        {isLoyaltyComplete ? (
          <View style={styles.rewardBadge}>
            <Feather name="gift" size={12} color={ZFoodColors.accent} />
            <ThemedText
              type="small"
              style={{ color: ZFoodColors.accent, fontWeight: "600", marginLeft: 4 }}
            >
              Panier gratuit débloqué
            </ThemedText>
          </View>
        ) : null}
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
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  orderBadge: {
    alignItems: "center",
  },
  loyaltySection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  loyaltyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
});
