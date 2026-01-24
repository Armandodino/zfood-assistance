import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Pressable, Alert, Image, ActivityIndicator, Platform, TextInput, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useData } from "@/contexts/DataContext";
import { useAuth, User } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Spacing, BorderRadius, ZFoodColors, Shadows } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { 
  requestNotificationPermission, 
  checkNotificationPermission,
  scheduleUnpaidReminder,
  cancelAllNotifications,
  getScheduledNotifications
} from "@/services/notifications";

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingsItem({ icon, label, value, onPress, danger }: SettingsItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[styles.settingsItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
    >
      <View
        style={[
          styles.settingsIcon,
          {
            backgroundColor: danger
              ? ZFoodColors.error + "15"
              : ZFoodColors.primary600 + "15",
          },
        ]}
      >
        <Feather
          name={icon}
          size={18}
          color={danger ? ZFoodColors.error : ZFoodColors.primary600}
        />
      </View>
      <View style={styles.settingsContent}>
        <ThemedText
          type="body"
          style={{ color: danger ? ZFoodColors.error : theme.text }}
        >
          {label}
        </ThemedText>
        {value ? (
          <ThemedText type="small" style={{ color: theme.textMuted }}>
            {value}
          </ThemedText>
        ) : null}
      </View>
      {onPress ? (
        <Feather name="chevron-right" size={20} color={theme.textMuted} />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { clients, orders, refreshData } = useData();
  const { logout, currentUser, allUsers, changePassword, updateProfile, resetUserPassword } = useAuth();
  const { showSuccess, showError } = useToast();
  const { pickAndUpload, isUploading: isUploadingPhoto } = useImageUpload();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncSpreadsheetId, setLastSyncSpreadsheetId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFonction, setEditFonction] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");

  const unpaidOrders = orders.filter(o => !o.isPaid);
  const otherUsers = allUsers.filter(u => u.id !== currentUser?.id);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    if (Platform.OS === 'web') return;
    const enabled = await checkNotificationPermission();
    setNotificationsEnabled(enabled);
    const scheduled = await getScheduledNotifications();
    setScheduledCount(scheduled.length);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Notifications activées", "Vous recevrez des rappels pour les impayés");
    } else {
      Alert.alert("Permission refusée", "Activez les notifications dans les paramètres du téléphone");
    }
  };

  const handleScheduleUnpaidReminders = async () => {
    if (unpaidOrders.length === 0) {
      Alert.alert("Aucun impayé", "Tous les paiements sont à jour");
      return;
    }

    await cancelAllNotifications();

    let count = 0;
    for (const order of unpaidOrders) {
      const result = await scheduleUnpaidReminder(
        order.clientName,
        order.amount,
        order.id,
        24
      );
      if (result) count++;
    }

    setScheduledCount(count);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Rappels programmés",
      `${count} rappel(s) programmé(s) pour demain`
    );
  };

  const handleSyncToSheets = async () => {
    setIsSyncing(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(new URL("/api/sync-sheets", apiUrl).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clients, orders }),
      });

      const result = await response.json();

      if (result.success) {
        setLastSyncSpreadsheetId(result.spreadsheetId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Synchronisation réussie",
          result.message,
          [
            { text: "OK" },
            {
              text: "Ouvrir Google Sheets",
              onPress: () => {
                Linking.openURL(`https://docs.google.com/spreadsheets/d/${result.spreadsheetId}`);
              },
            },
          ]
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erreur", error.message || "Impossible de synchroniser avec Google Sheets");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnecter",
          style: "destructive",
          onPress: async () => {
            await logout();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const openProfileModal = () => {
    setEditName(currentUser?.name || "");
    setEditEmail(currentUser?.email || "");
    setEditFonction(currentUser?.fonction || "");
    setEditPhone(currentUser?.phone || "");
    setEditPhoto(currentUser?.photo || "");
    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      showError("Erreur", "Veuillez remplir le nom et l'email");
      return;
    }
    const result = await updateProfile(
      editName.trim(), 
      editEmail.trim(),
      editFonction.trim() || undefined,
      editPhone.trim() || undefined,
      editPhoto.trim() || undefined
    );
    if (result.success) {
      showSuccess("Profil mis à jour", "Vos informations ont été enregistrées");
      setShowProfileModal(false);
    } else {
      showError("Erreur", result.error || "Impossible de mettre à jour");
    }
  };

  const openPasswordModal = () => {
    setCurrentPass("");
    setNewPass("");
    setConfirmPass("");
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!currentPass || !newPass || !confirmPass) {
      showError("Erreur", "Veuillez remplir tous les champs");
      return;
    }
    if (newPass !== confirmPass) {
      showError("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }
    const result = await changePassword(currentPass, newPass);
    if (result.success) {
      showSuccess("Mot de passe modifié", "Votre nouveau mot de passe a été enregistré");
      setShowPasswordModal(false);
    } else {
      showError("Erreur", result.error || "Impossible de modifier");
    }
  };

  const openAdminModal = (user: User) => {
    setSelectedUser(user);
    setNewAdminPass("");
    setShowAdminModal(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newAdminPass) {
      showError("Erreur", "Veuillez entrer un nouveau mot de passe");
      return;
    }
    const result = await resetUserPassword(selectedUser.id, newAdminPass);
    if (result.success) {
      showSuccess("Mot de passe réinitialisé", `Le mot de passe de ${selectedUser.name} a été changé`);
      setShowAdminModal(false);
    } else {
      showError("Erreur", result.error || "Impossible de réinitialiser");
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingHorizontal: Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
      }}
    >
      <View style={[styles.profileCard, { backgroundColor: theme.backgroundRoot }, Shadows.card]}>
        {currentUser?.photo ? (
          <Image 
            source={{ uri: currentUser.photo }} 
            style={styles.avatarImage}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: ZFoodColors.primary600 }]}>
            <ThemedText type="h1" style={{ color: "#fff" }}>
              {currentUser?.name?.charAt(0).toUpperCase() || "U"}
            </ThemedText>
          </View>
        )}
        <ThemedText type="h2" style={{ color: theme.text }}>
          {currentUser?.name || "Utilisateur"}
        </ThemedText>
        {currentUser?.fonction ? (
          <ThemedText type="body" style={{ color: ZFoodColors.primary600, fontWeight: "600" }}>
            {currentUser.fonction}
          </ThemedText>
        ) : null}
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          {currentUser?.email || ""}
        </ThemedText>
        {currentUser?.phone ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: Spacing.xs }}>
            <Feather name="phone" size={14} color={theme.textMuted} />
            <ThemedText type="small" style={{ color: theme.textMuted, marginLeft: 6 }}>
              {currentUser.phone}
            </ThemedText>
          </View>
        ) : null}
        {currentUser?.isSudo ? (
          <View style={styles.sudoBadge}>
            <Feather name="shield" size={14} color="#fff" />
            <ThemedText type="small" style={{ color: "#fff", marginLeft: 4 }}>
              Super Admin
            </ThemedText>
          </View>
        ) : (
          <View style={styles.adminBadge}>
            <Feather name="user" size={14} color={ZFoodColors.primary600} />
            <ThemedText type="small" style={{ color: ZFoodColors.primary600, marginLeft: 4 }}>
              Administrateur
            </ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundRoot }, Shadows.cardSmall]}>
        <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.textMuted }]}>
          DONNÉES
        </ThemedText>
        <SettingsItem
          icon="users"
          label="Clients"
          value={`${clients.length} enregistré(s)`}
        />
        <SettingsItem
          icon="shopping-bag"
          label="Commandes"
          value={`${orders.length} enregistrée(s)`}
        />
        <SettingsItem
          icon="refresh-cw"
          label="Actualiser les données"
          onPress={async () => {
            await refreshData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundRoot }, Shadows.cardSmall]}>
        <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.textMuted }]}>
          GOOGLE SHEETS
        </ThemedText>
        <Pressable
          style={[styles.syncButton, { backgroundColor: ZFoodColors.primary600 }]}
          onPress={handleSyncToSheets}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Feather name="upload-cloud" size={20} color="#fff" />
          )}
          <ThemedText style={styles.syncButtonText}>
            {isSyncing ? "Synchronisation..." : "Envoyer vers Google Sheets"}
          </ThemedText>
        </Pressable>
        <ThemedText type="small" style={[styles.syncInfo, { color: theme.textMuted }]}>
          Exporte tous vos clients et commandes vers une feuille Google Sheets pour sauvegarde et partage
        </ThemedText>
        {lastSyncSpreadsheetId ? (
          <Pressable
            style={[styles.openSheetButton, { borderColor: ZFoodColors.primary600 }]}
            onPress={() => {
              Linking.openURL(`https://docs.google.com/spreadsheets/d/${lastSyncSpreadsheetId}`);
            }}
          >
            <Feather name="external-link" size={16} color={ZFoodColors.primary600} />
            <ThemedText style={{ color: ZFoodColors.primary600, marginLeft: Spacing.sm }}>
              Ouvrir le fichier
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.section, { backgroundColor: theme.backgroundRoot }, Shadows.cardSmall]}>
        <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.textMuted }]}>
          WEBAPP EQUIPE
        </ThemedText>
        <Pressable
          style={[styles.syncButton, { backgroundColor: ZFoodColors.accent }]}
          onPress={() => {
            const baseUrl = getApiUrl();
            Linking.openURL(`${baseUrl}/webapp`);
          }}
        >
          <Feather name="globe" size={20} color="#fff" />
          <ThemedText style={styles.syncButtonText}>
            Ouvrir la WebApp
          </ThemedText>
        </Pressable>
        <ThemedText type="small" style={[styles.syncInfo, { color: theme.textMuted }]}>
          Interface web interactive pour votre équipe à distance. Mot de passe admin: ZFOOD
        </ThemedText>
      </View>

      {Platform.OS !== 'web' ? (
        <View style={[styles.section, { backgroundColor: theme.backgroundRoot }, Shadows.cardSmall]}>
          <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.textMuted }]}>
            NOTIFICATIONS
          </ThemedText>
          {notificationsEnabled ? (
            <>
              <SettingsItem
                icon="bell"
                label="Notifications"
                value="Activées"
              />
              <Pressable
                style={[styles.syncButton, { backgroundColor: ZFoodColors.accent }]}
                onPress={handleScheduleUnpaidReminders}
              >
                <Feather name="clock" size={20} color="#fff" />
                <ThemedText style={styles.syncButtonText}>
                  Programmer rappels impayés ({unpaidOrders.length})
                </ThemedText>
              </Pressable>
              {scheduledCount > 0 ? (
                <ThemedText type="small" style={[styles.syncInfo, { color: theme.textMuted }]}>
                  {scheduledCount} rappel(s) programmé(s)
                </ThemedText>
              ) : null}
            </>
          ) : (
            <Pressable
              style={[styles.syncButton, { backgroundColor: ZFoodColors.primary600 }]}
              onPress={handleEnableNotifications}
            >
              <Feather name="bell" size={20} color="#fff" />
              <ThemedText style={styles.syncButtonText}>
                Activer les notifications
              </ThemedText>
            </Pressable>
          )}
          <ThemedText type="small" style={[styles.syncInfo, { color: theme.textMuted }]}>
            Recevez des rappels pour les paiements en attente
          </ThemedText>
        </View>
      ) : null}

      <View style={[styles.section, { backgroundColor: theme.backgroundRoot }, Shadows.cardSmall]}>
        <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.textMuted }]}>
          MON COMPTE
        </ThemedText>
        <SettingsItem
          icon="edit-2"
          label="Modifier mon profil"
          value="Nom et email"
          onPress={openProfileModal}
        />
        <SettingsItem
          icon="lock"
          label="Changer mon mot de passe"
          onPress={openPasswordModal}
        />
        <SettingsItem
          icon="log-out"
          label="Se déconnecter"
          onPress={handleLogout}
          danger
        />
      </View>

      {currentUser?.isSudo ? (
        <View style={[styles.section, { backgroundColor: theme.backgroundRoot }, Shadows.cardSmall]}>
          <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.textMuted }]}>
            GESTION DES ADMINS
          </ThemedText>
          <ThemedText type="small" style={[styles.adminInfo, { color: theme.textSecondary }]}>
            En tant que Super Admin, vous pouvez réinitialiser les mots de passe des autres administrateurs.
          </ThemedText>
          {otherUsers.map(user => (
            <SettingsItem
              key={user.id}
              icon="user"
              label={user.name}
              value={user.email}
              onPress={() => openAdminModal(user)}
            />
          ))}
        </View>
      ) : null}

      <Modal visible={showProfileModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ScrollView 
            style={[styles.modalContent, { backgroundColor: theme.backgroundRoot, maxHeight: "80%" }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ThemedText type="h3" style={{ color: theme.text, marginBottom: Spacing.lg }}>
              Modifier mon profil
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: Spacing.xs }}>
              Nom
            </ThemedText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Votre nom"
              placeholderTextColor={theme.textMuted}
            />
            <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: Spacing.xs, marginTop: Spacing.md }}>
              Email
            </ThemedText>
            <TextInput
              style={[
                styles.modalInput, 
                { 
                  backgroundColor: currentUser?.isSudo ? theme.backgroundDefault : theme.border,
                  color: currentUser?.isSudo ? theme.text : theme.textMuted, 
                  borderColor: theme.border 
                }
              ]}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Votre email"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={currentUser?.isSudo === true}
            />
            {!currentUser?.isSudo && (
              <ThemedText type="small" style={{ color: ZFoodColors.accent, marginTop: Spacing.xs }}>
                Seul le Super Admin peut modifier l'email
              </ThemedText>
            )}
            <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: Spacing.xs, marginTop: Spacing.md }}>
              Fonction
            </ThemedText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              value={editFonction}
              onChangeText={setEditFonction}
              placeholder="Ex: Directeur, Comptable, Commercial..."
              placeholderTextColor={theme.textMuted}
            />
            <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: Spacing.xs, marginTop: Spacing.md }}>
              Telephone
            </ThemedText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Ex: +225 07 XX XX XX XX"
              placeholderTextColor={theme.textMuted}
              keyboardType="phone-pad"
            />
            <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: Spacing.xs, marginTop: Spacing.md }}>
              Photo de profil
            </ThemedText>
            <View style={styles.photoUploadContainer}>
              {editPhoto ? (
                <Image source={{ uri: editPhoto }} style={styles.photoPreview} />
              ) : (
                <View style={[styles.photoPreview, { backgroundColor: theme.backgroundDefault, justifyContent: "center", alignItems: "center" }]}>
                  <Feather name="user" size={32} color={theme.textMuted} />
                </View>
              )}
              <Pressable
                style={[styles.uploadButton, { backgroundColor: ZFoodColors.primary600 }]}
                onPress={async () => {
                  const result = await pickAndUpload();
                  if (result.success && result.objectPath) {
                    setEditPhoto(result.objectPath);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } else if (result.error) {
                    showError("Erreur", result.error);
                  }
                }}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="camera" size={16} color="#fff" />
                    <ThemedText style={{ color: "#fff", marginLeft: Spacing.xs, fontWeight: "600" }}>
                      {editPhoto ? "Changer" : "Ajouter"}
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </View>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, { borderColor: theme.border }]} onPress={() => setShowProfileModal(false)}>
                <ThemedText style={{ color: theme.text }}>Annuler</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalButton, { backgroundColor: ZFoodColors.primary600 }]} onPress={handleSaveProfile}>
                <ThemedText style={{ color: "#fff" }}>Enregistrer</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <ThemedText type="h3" style={{ color: theme.text, marginBottom: Spacing.lg }}>
              Changer mon mot de passe
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: Spacing.xs }}>
              Mot de passe actuel
            </ThemedText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              value={currentPass}
              onChangeText={setCurrentPass}
              placeholder="Mot de passe actuel"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />
            <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: Spacing.xs, marginTop: Spacing.md }}>
              Nouveau mot de passe
            </ThemedText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              value={newPass}
              onChangeText={setNewPass}
              placeholder="Nouveau mot de passe"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />
            <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: Spacing.xs, marginTop: Spacing.md }}>
              Confirmer le nouveau mot de passe
            </ThemedText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              value={confirmPass}
              onChangeText={setConfirmPass}
              placeholder="Confirmer le mot de passe"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, { borderColor: theme.border }]} onPress={() => setShowPasswordModal(false)}>
                <ThemedText style={{ color: theme.text }}>Annuler</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalButton, { backgroundColor: ZFoodColors.primary600 }]} onPress={handleSavePassword}>
                <ThemedText style={{ color: "#fff" }}>Enregistrer</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAdminModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <ThemedText type="h3" style={{ color: theme.text, marginBottom: Spacing.sm }}>
              Réinitialiser le mot de passe
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
              {selectedUser?.name} ({selectedUser?.email})
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textMuted, marginBottom: Spacing.xs }}>
              Nouveau mot de passe
            </ThemedText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              value={newAdminPass}
              onChangeText={setNewAdminPass}
              placeholder="Nouveau mot de passe"
              placeholderTextColor={theme.textMuted}
            />
            <ThemedText type="small" style={{ color: ZFoodColors.warning, marginTop: Spacing.sm }}>
              L'utilisateur devra changer ce mot de passe à la prochaine connexion.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, { borderColor: theme.border }]} onPress={() => setShowAdminModal(false)}>
                <ThemedText style={{ color: theme.text }}>Annuler</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalButton, { backgroundColor: ZFoodColors.accent }]} onPress={handleResetPassword}>
                <ThemedText style={{ color: "#fff" }}>Réinitialiser</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <ThemedText type="small" style={{ color: theme.textMuted, textAlign: "center" }}>
          ZFood v2.0
        </ThemedText>
        <ThemedText type="small" style={{ color: ZFoodColors.accent, textAlign: "center" }}>
          Numéro 1 dans l'Attiéké
        </ThemedText>
        <View style={styles.devCredit}>
          <Feather name="code" size={12} color={ZFoodColors.primary600} />
          <ThemedText type="small" style={{ color: ZFoodColors.primary600, marginLeft: 4 }}>
            Developed by Armando Anzan
          </ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.textMuted, textAlign: "center", marginTop: Spacing.xs }}>
          © 2025 ZFood. Tous droits réservés.
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: Spacing.md,
  },
  photoUploadContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  photoPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  sudoBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: ZFoodColors.accent,
    borderRadius: BorderRadius.full,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: ZFoodColors.primary600 + "15",
    borderRadius: BorderRadius.full,
  },
  adminInfo: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  section: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  sectionTitle: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  footer: {
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
    alignItems: "center",
  },
  devCredit: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: ZFoodColors.primary600 + "10",
    borderRadius: BorderRadius.full,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  syncButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  syncInfo: {
    textAlign: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  openSheetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
});
