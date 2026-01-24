import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, StyleSheet, Pressable, TextInput, RefreshControl, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSecurity } from "@/contexts/SecurityContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Spacing, BorderRadius, ZFoodColors, Shadows } from "@/constants/theme";
import { getApiUrl } from "@/utils/api";

interface StockConfig {
  id: string;
  currentStock: number;
  minStockAlert: number;
  basketPrice: number;
  updatedAt: string;
  updatedBy: string | null;
  updatedByName: string | null;
}

interface DailyProduction {
  id: string;
  date: string;
  basketsProduced: number;
  basketsSold: number;
  stockBefore: number;
  stockAfter: number;
  notes: string | null;
  adminId: string;
  adminName: string;
  createdAt: string;
}

const DEFAULT_BASKET_PRICE = 5000;

export default function StockProductionScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { requestAuth } = useSecurity();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const isSudo = currentUser?.isSudo || false;
  const [stock, setStock] = useState<StockConfig | null>(null);
  const [production, setProduction] = useState<DailyProduction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newProduction, setNewProduction] = useState({ 
    basketsProduced: "", 
    notes: "" 
  });

  const loadData = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const [stockRes, productionRes] = await Promise.all([
        fetch(`${apiUrl}/api/stock`),
        fetch(`${apiUrl}/api/production`),
      ]);
      
      if (stockRes.ok) {
        const stockData = await stockRes.json();
        setStock(stockData);
      }
      if (productionRes.ok) {
        const productionData = await productionRes.json();
        setProduction(productionData);
      }
    } catch (error) {
      console.error("Error loading stock data:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddProduction = () => {
    const basketsCount = parseInt(newProduction.basketsProduced);
    if (!basketsCount || basketsCount <= 0) {
      showError("Erreur", "Veuillez entrer un nombre de paniers valide");
      return;
    }

    requestAuth(async () => {
      try {
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/api/production`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": "ZFOOD",
            "x-admin-id": currentUser?.id || "unknown",
            "x-admin-name": currentUser?.name || "Unknown",
          },
          body: JSON.stringify({
            date: selectedDate.toISOString().split("T")[0],
            basketsProduced: basketsCount,
            notes: newProduction.notes || null,
          }),
        });

        if (res.ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSuccess("Production ajoutée", `${basketsCount} paniers ajoutés au stock`);
          setNewProduction({ basketsProduced: "", notes: "" });
          setSelectedDate(new Date());
          setShowAddModal(false);
          loadData();
        } else {
          throw new Error("Failed to add production");
        }
      } catch (error) {
        showError("Erreur", "Impossible d'ajouter la production");
      }
    });
  };

  const handleDeleteProduction = (productionId: string, basketsProduced: number) => {
    if (!isSudo) {
      showError("Accès refusé", "Seuls les administrateurs peuvent supprimer une production");
      return;
    }
    Alert.alert(
      "Supprimer cette production ?",
      `Voulez-vous supprimer cette production de ${basketsProduced} paniers ? Le stock sera ajusté en conséquence.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            requestAuth(async () => {
              try {
                const apiUrl = getApiUrl();
                const res = await fetch(`${apiUrl}/api/production/${productionId}`, {
                  method: "DELETE",
                  headers: {
                    "x-admin-password": "ZFOOD",
                    "x-admin-id": currentUser?.id || "unknown",
                    "x-admin-name": currentUser?.name || "Unknown",
                  },
                });

                if (res.ok) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  showSuccess("Production supprimée", "La production a été supprimée");
                  loadData();
                } else {
                  throw new Error("Failed to delete production");
                }
              } catch (error) {
                showError("Erreur", "Impossible de supprimer la production");
              }
            });
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  const isLowStock = stock && stock.currentStock <= stock.minStockAlert;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.backgroundDefault }]}>
        <ActivityIndicator size="large" color={ZFoodColors.primary600} />
        <ThemedText type="body" style={{ color: theme.textMuted, marginTop: Spacing.md }}>
          Chargement du stock...
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <FlatList
        data={production}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ZFoodColors.primary600} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.stockCard, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
              <View style={styles.stockHeader}>
                <View style={[styles.stockIcon, { backgroundColor: isLowStock ? ZFoodColors.error + "20" : ZFoodColors.primary600 + "20" }]}>
                  <Feather name="package" size={24} color={isLowStock ? ZFoodColors.error : ZFoodColors.primary600} />
                </View>
                <View style={styles.stockInfo}>
                  <ThemedText type="small" style={{ color: theme.textMuted }}>Stock actuel</ThemedText>
                  <ThemedText type="h2" style={{ color: isLowStock ? ZFoodColors.error : theme.text }}>
                    {stock?.currentStock || 0} paniers
                  </ThemedText>
                </View>
              </View>
              {isLowStock && (
                <View style={[styles.alertBanner, { backgroundColor: ZFoodColors.error + "15" }]}>
                  <Feather name="alert-triangle" size={16} color={ZFoodColors.error} />
                  <ThemedText type="small" style={{ color: ZFoodColors.error, marginLeft: 8 }}>
                    Stock bas! Minimum: {stock?.minStockAlert} paniers
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
                <Feather name="trending-up" size={20} color={ZFoodColors.primary600} />
                <ThemedText type="h3" style={{ color: theme.text, marginTop: 8 }}>
                  {(stock?.basketPrice || DEFAULT_BASKET_PRICE).toLocaleString()} F
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textMuted }}>Prix/panier</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
                <Feather name="calendar" size={20} color={ZFoodColors.accent} />
                <ThemedText type="h3" style={{ color: theme.text, marginTop: 8 }}>
                  {production.length}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textMuted }}>Productions</ThemedText>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <ThemedText type="h3" style={{ color: theme.text }}>Historique de production</ThemedText>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", padding: Spacing.xl }}>
            <Feather name="box" size={48} color={theme.textMuted} />
            <ThemedText type="h3" style={{ color: theme.text, marginTop: Spacing.md }}>
              Aucune production
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textMuted, textAlign: "center", marginTop: Spacing.sm }}>
              Ajoutez votre première production pour commencer
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.productionCard, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
            {isSudo && (
              <Pressable
                style={styles.productionDeleteButton}
                onPress={() => handleDeleteProduction(item.id, item.basketsProduced)}
              >
                <Feather name="trash-2" size={16} color={ZFoodColors.error} />
              </Pressable>
            )}
            <View style={styles.productionHeader}>
              <View style={[styles.productionIcon, { backgroundColor: ZFoodColors.success + "20" }]}>
                <Feather name="plus-circle" size={20} color={ZFoodColors.success} />
              </View>
              <View style={styles.productionInfo}>
                <ThemedText type="body" style={{ color: theme.text, fontWeight: "600" }}>
                  +{item.basketsProduced} paniers
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textMuted }}>
                  {formatDate(item.date)} • par {item.adminName}
                </ThemedText>
              </View>
            </View>
            <View style={styles.productionDetails}>
              <View style={styles.detailItem}>
                <ThemedText type="small" style={{ color: theme.textMuted }}>Avant</ThemedText>
                <ThemedText type="body" style={{ color: theme.text }}>{item.stockBefore}</ThemedText>
              </View>
              <Feather name="arrow-right" size={16} color={theme.textMuted} />
              <View style={styles.detailItem}>
                <ThemedText type="small" style={{ color: theme.textMuted }}>Après</ThemedText>
                <ThemedText type="body" style={{ color: ZFoodColors.success }}>{item.stockAfter}</ThemedText>
              </View>
              {item.basketsSold > 0 && (
                <View style={styles.detailItem}>
                  <ThemedText type="small" style={{ color: theme.textMuted }}>Vendus</ThemedText>
                  <ThemedText type="body" style={{ color: ZFoodColors.accent }}>{item.basketsSold}</ThemedText>
                </View>
              )}
            </View>
            {item.notes && (
              <ThemedText type="small" style={{ color: theme.textMuted, marginTop: 8, fontStyle: "italic" }}>
                {item.notes}
              </ThemedText>
            )}
          </View>
        )}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: ZFoodColors.primary600 }]}
        onPress={() => setShowAddModal(true)}
      >
        <Feather name="plus" size={24} color="white" />
      </Pressable>

      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3" style={{ color: theme.text }}>Nouvelle production</ThemedText>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <ThemedText type="body" style={{ color: theme.text, marginBottom: 8 }}>Date *</ThemedText>
                <Pressable
                  style={[styles.input, styles.dateInput, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                >
                  <Feather name="calendar" size={20} color={ZFoodColors.primary600} />
                  <ThemedText type="body" style={{ color: theme.text, marginLeft: 8 }}>
                    {`${String(selectedDate.getDate()).padStart(2, '0')}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${selectedDate.getFullYear()}`}
                  </ThemedText>
                  <Feather name={showDatePicker ? "chevron-up" : "chevron-down"} size={20} color={theme.textMuted} style={{ marginLeft: "auto" }} />
                </Pressable>
                {showDatePicker && (
                  <View style={[styles.calendarContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                    <View style={styles.calendarHeader}>
                      <Pressable onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}>
                        <Feather name="chevron-left" size={24} color={ZFoodColors.primary600} />
                      </Pressable>
                      <ThemedText type="body" style={{ color: theme.text, fontWeight: "600" }}>
                        {selectedDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                      </ThemedText>
                      <Pressable onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}>
                        <Feather name="chevron-right" size={24} color={ZFoodColors.primary600} />
                      </Pressable>
                    </View>
                    <View style={styles.calendarDaysHeader}>
                      {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((day) => (
                        <ThemedText key={day} type="small" style={[styles.calendarDayLabel, { color: theme.textMuted }]}>{day}</ThemedText>
                      ))}
                    </View>
                    <View style={styles.calendarDays}>
                      {(() => {
                        const year = selectedDate.getFullYear();
                        const month = selectedDate.getMonth();
                        const firstDay = new Date(year, month, 1);
                        const lastDay = new Date(year, month + 1, 0);
                        const daysInMonth = lastDay.getDate();
                        let startDay = firstDay.getDay() - 1;
                        if (startDay < 0) startDay = 6;
                        const days = [];
                        for (let i = 0; i < startDay; i++) {
                          days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
                        }
                        for (let day = 1; day <= daysInMonth; day++) {
                          const isSelected = day === selectedDate.getDate();
                          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                          days.push(
                            <Pressable
                              key={day}
                              style={[
                                styles.calendarDay,
                                isSelected && { backgroundColor: ZFoodColors.primary600, borderRadius: 20 },
                                isToday && !isSelected && { borderWidth: 1, borderColor: ZFoodColors.primary600, borderRadius: 20 }
                              ]}
                              onPress={() => {
                                setSelectedDate(new Date(year, month, day));
                                setShowDatePicker(false);
                              }}
                            >
                              <ThemedText type="body" style={{ color: isSelected ? "white" : theme.text, textAlign: "center" }}>
                                {day}
                              </ThemedText>
                            </Pressable>
                          );
                        }
                        return days;
                      })()}
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.inputGroup}>
                <ThemedText type="body" style={{ color: theme.text, marginBottom: 8 }}>Paniers produits *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  value={newProduction.basketsProduced}
                  onChangeText={(text) => setNewProduction({ ...newProduction, basketsProduced: text })}
                  placeholder="Nombre de paniers"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.inputGroup}>
                <ThemedText type="body" style={{ color: theme.text, marginBottom: 8 }}>Notes (optionnel)</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                  value={newProduction.notes}
                  onChangeText={(text) => setNewProduction({ ...newProduction, notes: text })}
                  placeholder="Notes sur la production"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setShowAddModal(false)}
              >
                <ThemedText type="body" style={{ color: theme.text }}>Annuler</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.button, styles.submitButton, { backgroundColor: ZFoodColors.primary600 }]}
                onPress={handleAddProduction}
              >
                <ThemedText type="body" style={{ color: "white" }}>Ajouter</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: Spacing.md,
  },
  stockCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  stockHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  stockInfo: {
    marginLeft: Spacing.md,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  productionCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    position: "relative",
  },
  productionDeleteButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: ZFoodColors.error + "15",
    borderRadius: BorderRadius.md,
    zIndex: 1,
  },
  productionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  productionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  productionInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  productionDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.lg,
  },
  detailItem: {
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modal: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalContent: {
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {},
  calendarContainer: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  calendarDaysHeader: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  calendarDayLabel: {
    flex: 1,
    textAlign: "center",
    fontWeight: "600",
  },
  calendarDays: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
