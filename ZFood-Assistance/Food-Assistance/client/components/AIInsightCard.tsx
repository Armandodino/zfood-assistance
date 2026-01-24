import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/contexts/DataContext";
import { Spacing, BorderRadius, Shadows, ZFoodColors } from "@/constants/theme";

export function AIInsightCard() {
  const { theme } = useTheme();
  const { clients, orders, getTotalRevenue, getUnpaidTotal } = useData();

  const totalRevenue = getTotalRevenue();
  const unpaidTotal = getUnpaidTotal();
  const todayOrders = orders.filter((o) => {
    const today = new Date();
    const orderDate = new Date(o.date);
    return (
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()
    );
  }).length;

  const getInsightMessage = () => {
    if (orders.length === 0) {
      return "Bienvenue sur ZFood Assistance. Commencez par ajouter vos premiers clients et enregistrez vos commandes pour voir les insights.";
    }

    if (unpaidTotal > totalRevenue * 0.3) {
      return `Attention: Les impayés représentent ${Math.round((unpaidTotal / (totalRevenue + unpaidTotal)) * 100)}% de vos ventes. Pensez à relancer vos clients.`;
    }

    if (todayOrders === 0) {
      return "Aucune commande enregistrée aujourd'hui. C'est le moment idéal pour contacter vos clients réguliers.";
    }

    if (todayOrders >= 5) {
      return `Excellente journée avec ${todayOrders} commandes. Votre activité progresse bien.`;
    }

    const avgOrderValue = orders.length > 0 ? (totalRevenue + unpaidTotal) / orders.length : 5000;
    return `Panier moyen: ${new Intl.NumberFormat("fr-FR").format(Math.round(avgOrderValue))} FCFA. ${clients.length} clients actifs dans votre carnet.`;
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundRoot },
        Shadows.card,
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: ZFoodColors.accent + "20" }]}>
          <Feather name="zap" size={18} color={ZFoodColors.accent} />
        </View>
        <ThemedText type="h3" style={{ color: theme.text }}>
          Insights IA
        </ThemedText>
      </View>
      <ThemedText type="body" style={[styles.message, { color: theme.textSecondary }]}>
        {getInsightMessage()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius["2xl"],
    borderLeftWidth: 4,
    borderLeftColor: ZFoodColors.accent,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  message: {
    lineHeight: 22,
  },
});
