import React from "react";
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { StatCard } from "@/components/StatCard";
import { AIInsightCard } from "@/components/AIInsightCard";
import { QuickAction } from "@/components/QuickAction";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/contexts/DataContext";
import { Spacing, ZFoodColors, BorderRadius, Shadows } from "@/constants/theme";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { clients, orders, getTotalRevenue, getUnpaidTotal, isLoading, refreshData } =
    useData();

  const totalRevenue = getTotalRevenue();
  const unpaidTotal = getUnpaidTotal();
  const totalBaskets = orders.reduce((sum, o) => sum + (o.quantity || 1), 0);
  const unpaidOrders = orders.filter((o) => !o.isPaid);
  const todayOrders = orders.filter((o) => {
    const today = new Date().toDateString();
    return new Date(o.date).toDateString() === today;
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
      }
    >
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <View style={styles.statsGrid}>
          <StatCard
            icon="users"
            label="Clients"
            value={clients.length}
            subValue="actifs"
            iconColor={ZFoodColors.primary600}
          />
          <StatCard
            icon="shopping-bag"
            label="Paniers"
            value={totalBaskets}
            subValue="vendus"
            iconColor={ZFoodColors.primary900}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <View style={styles.statsGrid}>
          <StatCard
            icon="trending-up"
            label="Chiffre d'affaires"
            value={`${formatCurrency(totalRevenue)}`}
            subValue="FCFA"
            iconColor={ZFoodColors.success}
          />
          <StatCard
            icon="alert-circle"
            label="Impayés"
            value={`${formatCurrency(unpaidTotal)}`}
            subValue="FCFA"
            iconColor={ZFoodColors.warning}
            accentColor={unpaidTotal > 0 ? ZFoodColors.warning : undefined}
          />
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(400)}
        style={styles.quickActionsSection}
      >
        <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.textMuted }]}>
          ACTIONS RAPIDES
        </ThemedText>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="user-plus"
            label="Nouveau client"
            color={ZFoodColors.primary600}
            onPress={() => navigation.navigate("AddClient")}
          />
          <QuickAction
            icon="plus-circle"
            label="Commande"
            color={ZFoodColors.accent}
            onPress={() => navigation.navigate("AddOrder")}
          />
          <QuickAction
            icon="bar-chart-2"
            label="Statistiques"
            color={ZFoodColors.primary900}
            onPress={() => navigation.navigate("DataCenter")}
          />
        </View>
      </Animated.View>

      {unpaidOrders.length > 0 ? (
        <Animated.View
          entering={FadeInDown.delay(350).duration(400)}
          style={styles.alertSection}
        >
          <Pressable
            style={[styles.alertCard, { backgroundColor: ZFoodColors.warning + "15" }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("Orders");
            }}
          >
            <View style={[styles.alertIcon, { backgroundColor: ZFoodColors.warning + "20" }]}>
              <Feather name="alert-triangle" size={20} color={ZFoodColors.warning} />
            </View>
            <View style={styles.alertContent}>
              <ThemedText type="body" style={{ color: ZFoodColors.warning, fontWeight: "600" }}>
                {unpaidOrders.length} commande(s) impayee(s)
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textMuted }}>
                Touchez pour voir les details
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={ZFoodColors.warning} />
          </Pressable>
        </Animated.View>
      ) : null}

      <Animated.View
        entering={FadeInDown.delay(400).duration(400)}
        style={styles.insightSection}
      >
        <AIInsightCard />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(450).duration(400)}
        style={styles.todaySection}
      >
        <View style={[styles.todayCard, { backgroundColor: theme.backgroundRoot }, Shadows.cardSmall]}>
          <View style={styles.todayHeader}>
            <Feather name="calendar" size={18} color={ZFoodColors.primary600} />
            <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm, fontWeight: "600" }}>
              Aujourd'hui
            </ThemedText>
          </View>
          <View style={styles.todayStats}>
            <View style={styles.todayStat}>
              <ThemedText type="h2" style={{ color: ZFoodColors.primary600 }}>
                {todayOrders.length}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textMuted }}>
                commandes
              </ThemedText>
            </View>
            <View style={[styles.todayDivider, { backgroundColor: theme.border }]} />
            <View style={styles.todayStat}>
              <ThemedText type="h2" style={{ color: ZFoodColors.success }}>
                {todayOrders.filter((o) => o.isPaid).length}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textMuted }}>
                payees
              </ThemedText>
            </View>
            <View style={[styles.todayDivider, { backgroundColor: theme.border }]} />
            <View style={styles.todayStat}>
              <ThemedText type="h2" style={{ color: ZFoodColors.warning }}>
                {todayOrders.filter((o) => !o.isPaid).length}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textMuted }}>
                impayees
              </ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(500).duration(400)}
        style={styles.badgeSection}
      >
        <View style={[styles.badge, { backgroundColor: theme.backgroundRoot }]}>
          <Feather name="map-pin" size={16} color={ZFoodColors.primary600} />
          <ThemedText type="body" style={[styles.badgeText, { color: theme.text }]}>
            Abidjan
          </ThemedText>
        </View>
        <View style={[styles.syncBadge, { backgroundColor: ZFoodColors.success + "15" }]}>
          <Feather name="cloud" size={14} color={ZFoodColors.success} />
          <ThemedText type="small" style={{ color: ZFoodColors.success, marginLeft: 4 }}>
            Synchronisé
          </ThemedText>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickActionsSection: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  alertSection: {
    marginTop: Spacing.lg,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  alertContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  insightSection: {
    marginTop: Spacing.lg,
  },
  todaySection: {
    marginTop: Spacing.lg,
  },
  todayCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  todayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  todayStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  todayStat: {
    alignItems: "center",
  },
  todayDivider: {
    width: 1,
    height: 40,
  },
  badgeSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  badgeText: {
    marginLeft: Spacing.sm,
    fontWeight: "600",
  },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
});
