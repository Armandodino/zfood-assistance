import React, { useState, useMemo } from "react";
import { View, FlatList, StyleSheet, ScrollView, RefreshControl, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { OrderCard } from "@/components/OrderCard";
import { FilterChip } from "@/components/FilterChip";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/contexts/DataContext";
import { useSecurity } from "@/contexts/SecurityContext";
import { useToast } from "@/contexts/ToastContext";
import { Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = "all" | "paid" | "unpaid" | "today" | "week" | "month";

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { orders, updateOrder, isLoading, refreshData } = useData();
  const { requestAuth } = useSecurity();
  const { showSuccess, showError } = useToast();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "paid", label: "Payé" },
    { key: "unpaid", label: "Impayé" },
    { key: "today", label: "Aujourd'hui" },
    { key: "week", label: "Semaine" },
    { key: "month", label: "Mois" },
  ];

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    let filtered = [...orders];

    switch (activeFilter) {
      case "paid":
        filtered = filtered.filter((o) => o.isPaid);
        break;
      case "unpaid":
        filtered = filtered.filter((o) => !o.isPaid);
        break;
      case "today":
        filtered = filtered.filter((o) => new Date(o.date) >= today);
        break;
      case "week":
        filtered = filtered.filter((o) => new Date(o.date) >= weekAgo);
        break;
      case "month":
        filtered = filtered.filter((o) => new Date(o.date) >= monthAgo);
        break;
    }

    return filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [orders, activeFilter]);

  const handleTogglePaid = (orderId: string, currentStatus: boolean) => {
    const order = orders.find(o => o.id === orderId);
    const newStatus = !currentStatus;
    const actionText = newStatus ? "marquer comme paye" : "marquer comme impaye";
    
    Alert.alert(
      "Confirmer le changement",
      `Voulez-vous ${actionText} cette commande de ${order?.clientName || 'ce client'} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          style: "default",
          onPress: () => {
            requestAuth(async () => {
              try {
                await updateOrder(orderId, { isPaid: newStatus });
                showSuccess(
                  newStatus ? "Paiement confirme" : "Statut modifie",
                  newStatus 
                    ? `Commande de ${order?.clientName} marquee comme payee`
                    : `Commande de ${order?.clientName} marquee comme impayee`
                );
              } catch (error) {
                showError("Erreur", "Impossible de modifier le statut");
              }
            });
          },
        },
      ]
    );
  };

  const handleAddOrder = () => {
    navigation.navigate("AddOrder");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View
        style={[
          styles.filterContainer,
          {
            paddingTop: headerHeight + Spacing.md,
            backgroundColor: theme.backgroundDefault,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filters.map((filter) => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              isActive={activeFilter === filter.key}
              onPress={() => setActiveFilter(filter.key)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 100,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshData} />
        }
        renderItem={({ item }) => (
          <OrderCard
            id={item.id}
            clientName={item.clientName}
            quantity={item.quantity || 1}
            amount={item.amount}
            date={item.date}
            isPaid={item.isPaid}
            onTogglePaid={() => handleTogglePaid(item.id, item.isPaid)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            image={require("../../assets/images/illustrations/empty_orders_illustration.png")}
            title="Aucune commande"
            subtitle={
              activeFilter === "all"
                ? "Enregistrez votre première commande"
                : "Aucune commande ne correspond à ce filtre"
            }
          />
        }
      />

      <FAB onPress={handleAddOrder} bottom={insets.bottom + 24} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    paddingBottom: Spacing.md,
  },
  filterScroll: {
    paddingHorizontal: Spacing.lg,
  },
});
