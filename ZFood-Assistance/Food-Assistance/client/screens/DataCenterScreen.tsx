import React, { useMemo } from "react";
import { View, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/contexts/DataContext";
import { Spacing, BorderRadius, Shadows, ZFoodColors } from "@/constants/theme";

interface ClientStats {
  id: string;
  name: string;
  orderCount: number;
  totalAmount: number;
}

export default function DataCenterScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { clients, orders, isLoading, refreshData } = useData();

  const clientStats: ClientStats[] = useMemo(() => {
    const stats = clients.map((client) => {
      const clientOrders = orders.filter((o) => o.clientId === client.id);
      return {
        id: client.id,
        name: client.name,
        orderCount: clientOrders.length,
        totalAmount: clientOrders.reduce((sum, o) => sum + o.amount, 0),
      };
    });
    return stats.sort((a, b) => b.orderCount - a.orderCount).slice(0, 10);
  }, [clients, orders]);

  const maxOrderCount = Math.max(...clientStats.map((c) => c.orderCount), 1);

  if (orders.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
        <View style={{ paddingTop: headerHeight }}>
          <EmptyState
            image={require("../../assets/images/illustrations/empty_stats_illustration.png")}
            title="Pas encore de données"
            subtitle="Les statistiques apparaîtront ici une fois que vous aurez enregistré des commandes"
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingHorizontal: Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
      }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
      }
    >
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <View style={[styles.card, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
          <View style={styles.cardHeader}>
            <Feather name="bar-chart-2" size={20} color={ZFoodColors.primary600} />
            <ThemedText type="h2" style={{ color: theme.text, marginLeft: Spacing.sm }}>
              Top Clients
            </ThemedText>
          </View>

          <View style={styles.chartContainer}>
            {clientStats.map((client, index) => (
              <View key={client.id} style={styles.chartRow}>
                <View style={styles.chartLabel}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
                    {client.name}
                  </ThemedText>
                </View>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${(client.orderCount / maxOrderCount) * 100}%`,
                        backgroundColor:
                          index === 0
                            ? ZFoodColors.primary600
                            : index === 1
                            ? ZFoodColors.primary900
                            : ZFoodColors.primary600 + "80",
                      },
                    ]}
                  />
                </View>
                <ThemedText type="small" style={[styles.chartValue, { color: theme.text }]}>
                  {client.orderCount}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <View style={[styles.card, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
          <View style={styles.cardHeader}>
            <Feather name="database" size={20} color={ZFoodColors.primary600} />
            <ThemedText type="h2" style={{ color: theme.text, marginLeft: Spacing.sm }}>
              Données Détaillées
            </ThemedText>
          </View>

          <View style={styles.tableContainer}>
            <View style={[styles.tableHeader, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="h4" style={[styles.tableCell, styles.cellName, { color: theme.text }]}>
                Client
              </ThemedText>
              <ThemedText type="h4" style={[styles.tableCell, styles.cellNumber, { color: theme.text }]}>
                Paniers
              </ThemedText>
              <ThemedText type="h4" style={[styles.tableCell, styles.cellAmount, { color: theme.text }]}>
                Total (FCFA)
              </ThemedText>
            </View>

            {clientStats.map((client, index) => (
              <View
                key={client.id}
                style={[
                  styles.tableRow,
                  index % 2 === 1 && { backgroundColor: theme.backgroundDefault },
                ]}
              >
                <ThemedText
                  type="body"
                  style={[styles.tableCell, styles.cellName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {client.name}
                </ThemedText>
                <ThemedText
                  type="body"
                  style={[styles.tableCell, styles.cellNumber, { color: ZFoodColors.primary600, fontWeight: "600" }]}
                >
                  {client.orderCount}
                </ThemedText>
                <ThemedText
                  type="body"
                  style={[styles.tableCell, styles.cellAmount, { color: theme.text }]}
                >
                  {new Intl.NumberFormat("fr-FR").format(client.totalAmount)}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius["2xl"],
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  chartContainer: {
    gap: Spacing.md,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chartLabel: {
    width: 80,
    marginRight: Spacing.sm,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
  },
  chartValue: {
    width: 30,
    textAlign: "right",
    marginLeft: Spacing.sm,
    fontWeight: "600",
  },
  tableContainer: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  tableCell: {
    fontSize: 13,
  },
  cellName: {
    flex: 2,
  },
  cellNumber: {
    flex: 1,
    textAlign: "center",
  },
  cellAmount: {
    flex: 1.5,
    textAlign: "right",
  },
});
