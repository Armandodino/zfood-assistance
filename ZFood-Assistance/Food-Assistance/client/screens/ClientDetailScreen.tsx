import React, { useMemo, useState } from "react";
import { View, FlatList, StyleSheet, Pressable, Alert, TextInput, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { OrderCard } from "@/components/OrderCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/contexts/DataContext";
import { useSecurity } from "@/contexts/SecurityContext";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, ZFoodColors, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "ClientDetail">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LOYALTY_GOAL = 120;
const BASKET_PRICE = 5000;

export default function ClientDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { theme } = useTheme();
  const { clients, getClientOrders, updateOrder, deleteClient, updateClient, deleteOrder } = useData();
  const { requestAuth } = useSecurity();
  const { showSuccess, showError } = useToast();
  const { currentUser } = useAuth();

  const { clientId } = route.params;
  const isSudo = currentUser?.isSudo || false;
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editQuartier, setEditQuartier] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const client = clients.find((c) => c.id === clientId);
  const clientOrders = useMemo(() => getClientOrders(clientId), [clientId, getClientOrders]);

  const totalBaskets = clientOrders.reduce((sum, o) => sum + (o.quantity || 1), 0);
  const paidBaskets = clientOrders.filter((o) => o.isPaid).reduce((sum, o) => sum + (o.quantity || 1), 0);
  const unpaidBaskets = totalBaskets - paidBaskets;
  const orderCount = clientOrders.length;
  const loyaltyProgress = Math.min(totalBaskets / LOYALTY_GOAL, 1);
  const isLoyaltyComplete = totalBaskets >= LOYALTY_GOAL;
  
  const totalOrderAmount = clientOrders.reduce((sum, o) => sum + (o.amount || (o.quantity || 1) * BASKET_PRICE), 0);
  const totalPaidAmount = clientOrders.reduce((sum, o) => sum + (o.paidAmount || (o.isPaid ? (o.amount || (o.quantity || 1) * BASKET_PRICE) : 0)), 0);
  const totalRemainingAmount = totalOrderAmount - totalPaidAmount;

  const handleTogglePaid = (orderId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const actionText = newStatus ? "marquer comme paye" : "marquer comme impaye";
    
    Alert.alert(
      "Confirmer le changement",
      `Voulez-vous ${actionText} cette commande ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: () => {
            requestAuth(async () => {
              try {
                await updateOrder(orderId, { isPaid: newStatus });
                showSuccess(
                  newStatus ? "Paiement confirme" : "Statut modifie",
                  newStatus ? "Commande marquee comme payee" : "Commande marquee comme impayee"
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

  const handleDeleteClient = () => {
    if (!isSudo) {
      showError("Accès refusé", "Seuls les administrateurs peuvent supprimer un client");
      return;
    }
    Alert.alert(
      "Supprimer ce client ?",
      `Etes-vous sur de vouloir supprimer ${client?.name} ? Cette action est irreversible et supprimera egalement l'historique des commandes.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            requestAuth(async () => {
              try {
                const clientName = client?.name;
                await deleteClient(clientId);
                showSuccess("Client supprime", `${clientName} a ete supprime de votre carnet`);
                setTimeout(() => navigation.goBack(), 1500);
              } catch (error) {
                showError("Erreur", "Impossible de supprimer le client");
              }
            });
          },
        },
      ]
    );
  };

  const handleOpenEditClient = () => {
    if (!isSudo) {
      showError("Accès refusé", "Seuls les administrateurs peuvent modifier un client");
      return;
    }
    if (client) {
      setEditName(client.name);
      setEditQuartier(client.quartier);
      setEditPhone(client.phone);
      setShowEditModal(true);
    }
  };

  const handleSaveClient = () => {
    if (!editName.trim() || !editQuartier.trim() || !editPhone.trim()) {
      showError("Erreur", "Tous les champs sont obligatoires");
      return;
    }
    requestAuth(async () => {
      try {
        await updateClient(clientId, {
          name: editName.trim(),
          quartier: editQuartier.trim(),
          phone: editPhone.trim(),
        });
        showSuccess("Client modifié", "Les informations ont été mises à jour");
        setShowEditModal(false);
      } catch (error) {
        showError("Erreur", "Impossible de modifier le client");
      }
    });
  };

  const handleDeleteOrder = (orderId: string, clientName: string) => {
    if (!isSudo) {
      showError("Accès refusé", "Seuls les administrateurs peuvent supprimer une commande");
      return;
    }
    Alert.alert(
      "Supprimer cette commande ?",
      `Voulez-vous supprimer cette commande de ${clientName} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            requestAuth(async () => {
              try {
                await deleteOrder(orderId);
                showSuccess("Commande supprimée", "La commande a été supprimée");
              } catch (error) {
                showError("Erreur", "Impossible de supprimer la commande");
              }
            });
          },
        },
      ]
    );
  };

  if (!client) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText>Client non trouvé</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <FlatList
        data={clientOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.profileCard, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
              {isSudo && (
                <Pressable style={styles.editButton} onPress={handleOpenEditClient}>
                  <Feather name="edit-2" size={18} color={ZFoodColors.primary600} />
                </Pressable>
              )}
              <View style={[styles.avatar, { backgroundColor: ZFoodColors.primary600 + "20" }]}>
                <ThemedText style={[styles.avatarText, { color: ZFoodColors.primary600 }]}>
                  {client.name.charAt(0).toUpperCase()}
                </ThemedText>
              </View>

              <ThemedText type="h1" style={{ color: theme.text, marginTop: Spacing.md }}>
                {client.name}
              </ThemedText>

              <View style={styles.infoRow}>
                <Feather name="map-pin" size={14} color={theme.textMuted} />
                <ThemedText type="body" style={{ color: theme.textSecondary, marginLeft: 6 }}>
                  {client.quartier}
                </ThemedText>
              </View>

              <View style={styles.infoRow}>
                <Feather name="phone" size={14} color={theme.textMuted} />
                <ThemedText type="body" style={{ color: theme.textSecondary, marginLeft: 6 }}>
                  {client.phone}
                </ThemedText>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <ThemedText type="h2" style={{ color: ZFoodColors.primary600 }}>
                    {orderCount}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    Commandes
                  </ThemedText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                  <ThemedText type="h2" style={{ color: ZFoodColors.primary900 }}>
                    {totalBaskets}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textMuted }}>
                    Paniers total
                  </ThemedText>
                </View>
              </View>

              <View style={styles.basketsRow}>
                <View style={[styles.basketStat, { backgroundColor: ZFoodColors.success + "15" }]}>
                  <Feather name="check-circle" size={16} color={ZFoodColors.success} />
                  <ThemedText type="h3" style={{ color: ZFoodColors.success, marginLeft: Spacing.sm }}>
                    {paidBaskets}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: ZFoodColors.success, marginLeft: Spacing.xs }}>
                    paniers payés
                  </ThemedText>
                </View>
                <View style={[styles.basketStat, { backgroundColor: ZFoodColors.warning + "15" }]}>
                  <Feather name="clock" size={16} color={ZFoodColors.warning} />
                  <ThemedText type="h3" style={{ color: ZFoodColors.warning, marginLeft: Spacing.sm }}>
                    {unpaidBaskets}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: ZFoodColors.warning, marginLeft: Spacing.xs }}>
                    paniers impayés
                  </ThemedText>
                </View>
              </View>

              <View style={styles.financialSection}>
                <ThemedText type="h4" style={{ color: theme.text, marginBottom: Spacing.md }}>
                  Récapitulatif financier
                </ThemedText>
                <View style={styles.financialRow}>
                  <View style={styles.financialItem}>
                    <ThemedText type="small" style={{ color: theme.textMuted }}>Total</ThemedText>
                    <ThemedText type="h3" style={{ color: theme.text }}>{totalOrderAmount.toLocaleString()} F</ThemedText>
                  </View>
                  <View style={[styles.financialDivider, { backgroundColor: theme.border }]} />
                  <View style={styles.financialItem}>
                    <ThemedText type="small" style={{ color: ZFoodColors.success }}>Payé</ThemedText>
                    <ThemedText type="h3" style={{ color: ZFoodColors.success }}>{totalPaidAmount.toLocaleString()} F</ThemedText>
                  </View>
                  <View style={[styles.financialDivider, { backgroundColor: theme.border }]} />
                  <View style={styles.financialItem}>
                    <ThemedText type="small" style={{ color: ZFoodColors.error }}>Reste à payer</ThemedText>
                    <ThemedText type="h3" style={{ color: ZFoodColors.error }}>{totalRemainingAmount.toLocaleString()} F</ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.loyaltySection}>
                <View style={styles.loyaltyHeader}>
                  <ThemedText type="h4" style={{ color: theme.text }}>
                    Programme Fidélité
                  </ThemedText>
                  <ThemedText
                    type="body"
                    style={{
                      color: isLoyaltyComplete ? ZFoodColors.success : theme.textSecondary,
                      fontWeight: "600",
                    }}
                  >
                    {totalBaskets}/{LOYALTY_GOAL}
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
                    <Feather name="gift" size={16} color={ZFoodColors.accent} />
                    <ThemedText
                      type="body"
                      style={{ color: ZFoodColors.accent, fontWeight: "600", marginLeft: 6 }}
                    >
                      Panier cadeau mérité ce mois!
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText type="small" style={{ color: theme.textMuted, marginTop: Spacing.sm }}>
                    Encore {LOYALTY_GOAL - totalBaskets} paniers ce mois pour recevoir un panier cadeau
                  </ThemedText>
                )}
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <ThemedText type="h3" style={{ color: theme.text }}>
                Historique des commandes
              </ThemedText>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.orderItemContainer}>
            <OrderCard
              id={item.id}
              clientName={item.clientName}
              quantity={item.quantity || 1}
              amount={item.amount}
              date={item.date}
              isPaid={item.isPaid}
              onTogglePaid={() => handleTogglePaid(item.id, item.isPaid)}
            />
            {isSudo && (
              <Pressable
                style={styles.orderDeleteButton}
                onPress={() => handleDeleteOrder(item.id, item.clientName)}
              >
                <Feather name="trash-2" size={16} color={ZFoodColors.error} />
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            image={require("../../assets/images/illustrations/empty_orders_illustration.png")}
            title="Aucune commande"
            subtitle="Ce client n'a pas encore de commandes enregistrées"
          />
        }
        ListFooterComponent={
          isSudo ? (
            <Pressable
              style={[styles.deleteButton, { borderColor: ZFoodColors.error }]}
              onPress={handleDeleteClient}
            >
              <Feather name="trash-2" size={18} color={ZFoodColors.error} />
              <ThemedText style={{ color: ZFoodColors.error, marginLeft: Spacing.sm }}>
                Supprimer le client
              </ThemedText>
            </Pressable>
          ) : null
        }
      />

      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3" style={{ color: theme.text }}>Modifier le client</ThemedText>
              <Pressable onPress={() => setShowEditModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText type="body" style={{ color: theme.text, marginBottom: 8 }}>Nom *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nom du client"
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText type="body" style={{ color: theme.text, marginBottom: 8 }}>Quartier *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                value={editQuartier}
                onChangeText={setEditQuartier}
                placeholder="Quartier"
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText type="body" style={{ color: theme.text, marginBottom: 8 }}>Téléphone *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Numéro de téléphone"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <ThemedText type="body" style={{ color: theme.text }}>Annuler</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton, { backgroundColor: ZFoodColors.primary600 }]}
                onPress={handleSaveClient}
              >
                <ThemedText type="body" style={{ color: "white" }}>Enregistrer</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  profileCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "800",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  basketsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    width: "100%",
  },
  basketStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  loyaltySection: {
    width: "100%",
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  loyaltyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    justifyContent: "center",
  },
  sectionHeader: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  financialSection: {
    width: "100%",
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  financialRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  financialItem: {
    flex: 1,
    alignItems: "center",
  },
  financialDivider: {
    width: 1,
    height: 36,
  },
  editButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: ZFoodColors.primary600 + "15",
    borderRadius: BorderRadius.md,
  },
  orderItemContainer: {
    position: "relative",
    marginBottom: Spacing.sm,
  },
  orderDeleteButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: ZFoodColors.error + "15",
    borderRadius: BorderRadius.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
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
  inputGroup: {
    marginBottom: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {},
});
