import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/contexts/DataContext";
import { useSecurity } from "@/contexts/SecurityContext";
import { useToast } from "@/contexts/ToastContext";
import { Spacing, BorderRadius, ZFoodColors, Shadows } from "@/constants/theme";

export default function AddClientScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { addClient } = useData();
  const { requestAuth } = useSecurity();
  const { showSuccess, showError, showWarning } = useToast();

  const [name, setName] = useState("");
  const [quartier, setQuartier] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState({ name: false, quartier: false, phone: false });

  const cleanPhone = phone.replace(/\s/g, "");
  const isPhoneValid = /^[0-9]{10}$/.test(cleanPhone);
  const isNameValid = name.trim().length >= 2;
  const isQuartierValid = quartier.trim().length >= 2;
  const isValid = isNameValid && isQuartierValid && isPhoneValid;

  const formatPhoneNumber = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 10);
    const parts = [];
    for (let i = 0; i < digits.length; i += 2) {
      parts.push(digits.slice(i, i + 2));
    }
    return parts.join(" ");
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhoneNumber(text));
  };

  const handleSave = () => {
    setTouched({ name: true, quartier: true, phone: true });

    if (!isNameValid) {
      showWarning("Nom invalide", "Le nom doit contenir au moins 2 caracteres");
      return;
    }

    if (!isQuartierValid) {
      showWarning("Quartier invalide", "Le quartier doit contenir au moins 2 caracteres");
      return;
    }

    if (!isPhoneValid) {
      showWarning("Numero invalide", "Le numero doit contenir exactement 10 chiffres");
      return;
    }

    requestAuth(async () => {
      try {
        await addClient({
          name: name.trim(),
          quartier: quartier.trim(),
          phone: cleanPhone,
        });
        showSuccess("Client ajoute", `${name.trim()} a ete ajoute a votre carnet`);
        setTimeout(() => navigation.goBack(), 1500);
      } catch (error) {
        showError("Erreur", "Impossible d'ajouter le client");
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
          <View style={styles.labelRow}>
            <ThemedText type="h4" style={[styles.label, { color: theme.text }]}>
              Nom complet
            </ThemedText>
            <ThemedText type="small" style={{ color: ZFoodColors.error }}>*</ThemedText>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: theme.backgroundDefault, 
                  color: theme.text, 
                  borderColor: touched.name && !isNameValid ? ZFoodColors.error : isNameValid ? ZFoodColors.success : theme.border,
                  borderWidth: touched.name && !isNameValid ? 2 : 1,
                },
              ]}
              placeholder="Ex: Kouadio Aya"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
              onBlur={() => setTouched({ ...touched, name: true })}
              autoFocus
            />
            {isNameValid ? (
              <View style={styles.validIcon}>
                <Feather name="check-circle" size={20} color={ZFoodColors.success} />
              </View>
            ) : null}
          </View>
          {touched.name && !isNameValid ? (
            <ThemedText type="small" style={styles.errorText}>
              Le nom doit contenir au moins 2 caracteres
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <ThemedText type="h4" style={[styles.label, { color: theme.text }]}>
              Quartier
            </ThemedText>
            <ThemedText type="small" style={{ color: ZFoodColors.error }}>*</ThemedText>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: theme.backgroundDefault, 
                  color: theme.text, 
                  borderColor: touched.quartier && !isQuartierValid ? ZFoodColors.error : isQuartierValid ? ZFoodColors.success : theme.border,
                  borderWidth: touched.quartier && !isQuartierValid ? 2 : 1,
                },
              ]}
              placeholder="Ex: Cocody, Plateau, Yopougon..."
              placeholderTextColor={theme.textMuted}
              value={quartier}
              onChangeText={setQuartier}
              onBlur={() => setTouched({ ...touched, quartier: true })}
            />
            {isQuartierValid ? (
              <View style={styles.validIcon}>
                <Feather name="check-circle" size={20} color={ZFoodColors.success} />
              </View>
            ) : null}
          </View>
          {touched.quartier && !isQuartierValid ? (
            <ThemedText type="small" style={styles.errorText}>
              Le quartier doit contenir au moins 2 caracteres
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <ThemedText type="h4" style={[styles.label, { color: theme.text }]}>
              Telephone
            </ThemedText>
            <ThemedText type="small" style={{ color: ZFoodColors.error }}>*</ThemedText>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: theme.backgroundDefault, 
                  color: theme.text, 
                  borderColor: touched.phone && !isPhoneValid ? ZFoodColors.error : isPhoneValid ? ZFoodColors.success : theme.border,
                  borderWidth: touched.phone && !isPhoneValid ? 2 : 1,
                },
              ]}
              placeholder="07 00 00 00 00"
              placeholderTextColor={theme.textMuted}
              value={phone}
              onChangeText={handlePhoneChange}
              onBlur={() => setTouched({ ...touched, phone: true })}
              keyboardType="phone-pad"
              maxLength={14}
            />
            {isPhoneValid ? (
              <View style={styles.validIcon}>
                <Feather name="check-circle" size={20} color={ZFoodColors.success} />
              </View>
            ) : null}
          </View>
          <ThemedText type="small" style={{ color: theme.textMuted, marginTop: Spacing.xs }}>
            Format: 10 chiffres (ex: 07 08 09 10 11)
          </ThemedText>
          {touched.phone && !isPhoneValid && cleanPhone.length > 0 ? (
            <ThemedText type="small" style={styles.errorText}>
              {cleanPhone.length}/10 chiffres
            </ThemedText>
          ) : null}
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
            Enregistrer le client
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: Spacing.sm,
  },
  label: {},
  inputWrapper: {
    position: "relative",
  },
  input: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
    paddingRight: 48,
    borderRadius: BorderRadius.sm,
    fontSize: 16,
    borderWidth: 1,
  },
  validIcon: {
    position: "absolute",
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  errorText: {
    color: ZFoodColors.error,
    marginTop: Spacing.xs,
  },
  saveButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
});
