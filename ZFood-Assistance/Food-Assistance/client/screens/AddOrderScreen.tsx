import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useData, Client } from "@/contexts/DataContext";
import { useSecurity } from "@/contexts/SecurityContext";
import { useToast } from "@/contexts/ToastContext";
import { Spacing, BorderRadius, ZFoodColors, Shadows } from "@/constants/theme";

export default function AddOrderScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { clients, addOrder } = useData();
  const { requestAuth } = useSecurity();
  const { showSuccess, showError, showWarning } = useToast();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [pricePerBasket] = useState(5000);
  const [paymentType, setPaymentType] = useState<'unpaid' | 'partial' | 'full'>('unpaid');
  const [paidAmount, setPaidAmount] = useState(0);
  const [showClientPicker, setShowClientPicker] = useState(false);

  const totalAmount = quantity * pricePerBasket;
  const isPaid = paymentType === 'full' || (paymentType === 'partial' && paidAmount >= totalAmount);
  const remainingAmount = totalAmount - paidAmount;
  const isValid = selectedClient && quantity > 0;
  
  const getCollectionDate = () => {
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() + 3);
    return orderDate.toISOString();
  };

  const handleSave = () => {
    if (!isValid || !selectedClient) {
      showWarning("Information manquante", "Veuillez selectionner un client");
      return;
    }

    requestAuth(async () => {
      try {
        const actualPaidAmount = paymentType === 'full' ? totalAmount : (paymentType === 'partial' ? paidAmount : 0);
        await addOrder({
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          quantity,
          amount: totalAmount,
          paidAmount: actualPaidAmount,
          isPaid: actualPaidAmount >= totalAmount,
          date: new Date().toISOString(),
          collectionDate: actualPaidAmount >= totalAmount ? new Date().toISOString() : getCollectionDate(),
        });
        const paymentInfo = actualPaidAmount > 0 && actualPaidAmount < totalAmount 
          ? `(${actualPaidAmount.toLocaleString()} payé, reste ${(totalAmount - actualPaidAmount).toLocaleString()})`
          : '';
        showSuccess(
          "Commande enregistree",
          `${quantity} panier(s) pour ${selectedClient.name} - ${totalAmount.toLocaleString()} FCFA ${paymentInfo}`
        );
        setTimeout(() => navigation.goBack(), 1500);
      } catch (error) {
        showError("Erreur", "Impossible d'enregistrer la commande");
      }
    });
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingHorizontal: Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
      }}
    >
      <View style={[styles.card, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
        <View style={styles.inputGroup}>
          <ThemedText type="h4" style={[styles.label, { color: theme.text }]}>
            Client
          </ThemedText>
          <Pressable
            style={[
              styles.clientPicker,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
            onPress={() => setShowClientPicker(!showClientPicker)}
          >
            <ThemedText
              style={{
                color: selectedClient ? theme.text : theme.textMuted,
                flex: 1,
              }}
            >
              {selectedClient ? selectedClient.name : "Sélectionner un client"}
            </ThemedText>
            <Feather
              name={showClientPicker ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.textMuted}
            />
          </Pressable>

          {showClientPicker ? (
            <ScrollView
              style={[
                styles.clientList,
                { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
              ]}
              nestedScrollEnabled
            >
              {clients.length === 0 ? (
                <View style={styles.noClients}>
                  <ThemedText type="body" style={{ color: theme.textMuted }}>
                    Aucun client disponible
                  </ThemedText>
                </View>
              ) : (
                clients.map((client) => (
                  <Pressable
                    key={client.id}
                    style={[
                      styles.clientItem,
                      selectedClient?.id === client.id && {
                        backgroundColor: ZFoodColors.primary600 + "15",
                      },
                    ]}
                    onPress={() => {
                      setSelectedClient(client);
                      setShowClientPicker(false);
                    }}
                  >
                    <View style={[styles.clientAvatar, { backgroundColor: ZFoodColors.primary600 + "20" }]}>
                      <ThemedText style={{ color: ZFoodColors.primary600, fontWeight: "600" }}>
                        {client.name.charAt(0)}
                      </ThemedText>
                    </View>
                    <View style={styles.clientInfo}>
                      <ThemedText type="body" style={{ color: theme.text }}>
                        {client.name}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.textMuted }}>
                        {client.quartier}
                      </ThemedText>
                    </View>
                    {selectedClient?.id === client.id ? (
                      <Feather name="check" size={18} color={ZFoodColors.primary600} />
                    ) : null}
                  </Pressable>
                ))
              )}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="h4" style={[styles.label, { color: theme.text }]}>
            Quantite de paniers
          </ThemedText>
          <View style={styles.quantityContainer}>
            <Pressable
              style={[
                styles.quantityButton,
                { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
              ]}
              onPress={() => {
                if (quantity > 1) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setQuantity(quantity - 1);
                }
              }}
            >
              <Feather name="minus" size={20} color={quantity > 1 ? ZFoodColors.primary600 : theme.textMuted} />
            </Pressable>
            
            <View style={[styles.quantityDisplay, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <ThemedText type="h2" style={{ color: ZFoodColors.primary600 }}>
                {quantity}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textMuted }}>
                panier{quantity > 1 ? "s" : ""}
              </ThemedText>
            </View>
            
            <Pressable
              style={[
                styles.quantityButton,
                { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setQuantity(quantity + 1);
              }}
            >
              <Feather name="plus" size={20} color={ZFoodColors.primary600} />
            </Pressable>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="h4" style={[styles.label, { color: theme.text }]}>
            Montant total
          </ThemedText>
          <View style={[styles.totalDisplay, { backgroundColor: ZFoodColors.primary600 + "10", borderColor: ZFoodColors.primary600 }]}>
            <ThemedText type="h2" style={{ color: ZFoodColors.primary600 }}>
              {new Intl.NumberFormat("fr-FR").format(totalAmount)}
            </ThemedText>
            <ThemedText type="body" style={{ color: ZFoodColors.primary600 }}>
              FCFA
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textMuted, marginTop: Spacing.xs }}>
            {quantity} x {new Intl.NumberFormat("fr-FR").format(pricePerBasket)} FCFA
          </ThemedText>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="h4" style={[styles.label, { color: theme.text }]}>
            Statut de paiement
          </ThemedText>
          <View style={styles.paymentToggle}>
            <Pressable
              style={[
                styles.toggleOption,
                paymentType === 'unpaid' && { backgroundColor: ZFoodColors.warning + "20", borderColor: ZFoodColors.warning },
                { borderColor: theme.border },
              ]}
              onPress={() => { setPaymentType('unpaid'); setPaidAmount(0); }}
            >
              <Feather name="clock" size={18} color={paymentType === 'unpaid' ? ZFoodColors.warning : theme.textMuted} />
              <ThemedText style={{ color: paymentType === 'unpaid' ? ZFoodColors.warning : theme.textMuted, marginLeft: Spacing.sm, fontWeight: paymentType === 'unpaid' ? "600" : "400" }}>
                Impayé
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.toggleOption,
                paymentType === 'partial' && { backgroundColor: ZFoodColors.accent + "20", borderColor: ZFoodColors.accent },
                { borderColor: theme.border },
              ]}
              onPress={() => setPaymentType('partial')}
            >
              <Feather name="percent" size={18} color={paymentType === 'partial' ? ZFoodColors.accent : theme.textMuted} />
              <ThemedText style={{ color: paymentType === 'partial' ? ZFoodColors.accent : theme.textMuted, marginLeft: Spacing.sm, fontWeight: paymentType === 'partial' ? "600" : "400" }}>
                Partiel
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.toggleOption,
                paymentType === 'full' && { backgroundColor: ZFoodColors.success + "20", borderColor: ZFoodColors.success },
                { borderColor: theme.border },
              ]}
              onPress={() => { setPaymentType('full'); setPaidAmount(totalAmount); }}
            >
              <Feather name="check-circle" size={18} color={paymentType === 'full' ? ZFoodColors.success : theme.textMuted} />
              <ThemedText style={{ color: paymentType === 'full' ? ZFoodColors.success : theme.textMuted, marginLeft: Spacing.sm, fontWeight: paymentType === 'full' ? "600" : "400" }}>
                Payé
              </ThemedText>
            </Pressable>
          </View>
          
          {paymentType === 'partial' && (
            <View style={{ marginTop: Spacing.md }}>
              <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: Spacing.xs }}>
                Montant reçu (sur {totalAmount.toLocaleString()} FCFA)
              </ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                keyboardType="numeric"
                placeholder="Montant payé"
                placeholderTextColor={theme.textMuted}
                value={paidAmount > 0 ? paidAmount.toString() : ''}
                onChangeText={(text) => setPaidAmount(parseInt(text) || 0)}
              />
              {paidAmount > 0 && paidAmount < totalAmount && (
                <View style={[styles.remainingBadge, { backgroundColor: ZFoodColors.warning + "15" }]}>
                  <Feather name="alert-circle" size={14} color={ZFoodColors.warning} />
                  <ThemedText type="small" style={{ color: ZFoodColors.warning, marginLeft: Spacing.xs }}>
                    Reste à payer: {remainingAmount.toLocaleString()} FCFA (encaissement dans 3 jours)
                  </ThemedText>
                </View>
              )}
            </View>
          )}
          
          {paymentType === 'unpaid' && (
            <View style={[styles.collectionInfo, { backgroundColor: ZFoodColors.info + "10" }]}>
              <Feather name="calendar" size={14} color={ZFoodColors.info} />
              <ThemedText type="small" style={{ color: ZFoodColors.info, marginLeft: Spacing.xs }}>
                Encaissement prévu dans 3 jours
              </ThemedText>
            </View>
          )}
        </View>

        <Pressable
          style={[
            styles.saveButton,
            {
              backgroundColor: isValid ? ZFoodColors.primary600 : theme.backgroundSecondary,
            },
          ]}
          onPress={handleSave}
          disabled={!isValid}
        >
          <ThemedText
            style={{
              color: isValid ? "#fff" : theme.textMuted,
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            Enregistrer la commande
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius["2xl"],
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    fontSize: 16,
    borderWidth: 1,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityDisplay: {
    flex: 1,
    height: 60,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  totalDisplay: {
    height: 60,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  clientPicker: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  clientList: {
    maxHeight: 200,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  clientItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  clientInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  noClients: {
    padding: Spacing.lg,
    alignItems: "center",
  },
  paymentToggle: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  toggleOption: {
    flex: 1,
    height: Spacing.inputHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  saveButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  remainingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  collectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
});
