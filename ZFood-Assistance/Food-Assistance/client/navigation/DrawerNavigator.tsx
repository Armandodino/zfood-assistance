import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import DashboardScreen from "@/screens/DashboardScreen";
import ClientsScreen from "@/screens/ClientsScreen";
import OrdersScreen from "@/screens/OrdersScreen";
import StockProductionScreen from "@/screens/StockProductionScreen";
import DataCenterScreen from "@/screens/DataCenterScreen";
import AIAssistantScreen from "@/screens/AIAssistantScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import SudoDashboardScreen from "@/screens/SudoDashboardScreen";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, ZFoodColors, Shadows } from "@/constants/theme";

export type DrawerParamList = {
  Dashboard: undefined;
  Clients: undefined;
  Orders: undefined;
  StockProduction: undefined;
  DataCenter: undefined;
  AIAssistant: undefined;
  Settings: undefined;
  SudoDashboard: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

interface DrawerItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function DrawerItem({ icon, label, isActive, onPress }: DrawerItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[
        styles.drawerItem,
        isActive && { backgroundColor: ZFoodColors.primary600 + "15" },
      ]}
    >
      <View
        style={[
          styles.drawerItemIcon,
          {
            backgroundColor: isActive
              ? ZFoodColors.primary600
              : theme.backgroundSecondary,
          },
        ]}
      >
        <Feather
          name={icon}
          size={18}
          color={isActive ? "#fff" : theme.textSecondary}
        />
      </View>
      <ThemedText
        type="body"
        style={{
          color: isActive ? ZFoodColors.primary600 : theme.text,
          fontWeight: isActive ? "600" : "400",
          marginLeft: Spacing.md,
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { state, navigation } = props;

  const baseScreens: { key: keyof DrawerParamList; icon: keyof typeof Feather.glyphMap; label: string }[] = [
    { key: "Dashboard", icon: "home", label: "Tableau de bord" },
    { key: "Clients", icon: "users", label: "Clients" },
    { key: "Orders", icon: "shopping-bag", label: "Commandes" },
    { key: "StockProduction", icon: "package", label: "Stock & Production" },
    { key: "DataCenter", icon: "bar-chart-2", label: "Data Center" },
    { key: "AIAssistant", icon: "message-circle", label: "Assistant IA" },
    { key: "Settings", icon: "settings", label: "Paramètres" },
  ];

  const screens = currentUser?.isSudo 
    ? [...baseScreens.slice(0, -1), { key: "SudoDashboard" as keyof DrawerParamList, icon: "shield" as keyof typeof Feather.glyphMap, label: "Supervision" }, baseScreens[baseScreens.length - 1]]
    : baseScreens;

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.drawerContent,
        { paddingTop: insets.top + Spacing.lg },
      ]}
    >
      <View style={styles.drawerHeader}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.drawerLogo}
        />
        <View style={styles.drawerHeaderText}>
          <ThemedText type="h2" style={{ color: theme.text }}>
            ZFood
          </ThemedText>
          <ThemedText type="small" style={{ color: ZFoodColors.accent }}>
            Numero 1 dans Attieke
          </ThemedText>
        </View>
      </View>

      <View style={styles.drawerItems}>
        {screens.map((screen, index) => (
          <DrawerItem
            key={screen.key}
            icon={screen.icon}
            label={screen.label}
            isActive={state.index === index}
            onPress={() => navigation.navigate(screen.key)}
          />
        ))}
      </View>

      <View style={[styles.drawerFooter, { borderTopColor: theme.border }]}>
        <View style={[styles.syncBadge, { backgroundColor: ZFoodColors.success + "15" }]}>
          <Feather name="cloud" size={14} color={ZFoodColors.success} />
          <ThemedText type="small" style={{ color: ZFoodColors.success, marginLeft: 4 }}>
            Synchronisé
          </ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.textMuted, marginTop: Spacing.sm }}>
          v2.0
        </ThemedText>
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  const { theme } = useTheme();
  const screenOptions = useScreenOptions();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        ...screenOptions,
        drawerStyle: {
          backgroundColor: theme.backgroundRoot,
          width: 280,
        },
        headerTintColor: theme.text,
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerTitle: "ZFood",
        }}
      />
      <Drawer.Screen
        name="Clients"
        component={ClientsScreen}
        options={{
          headerTitle: "Clients",
        }}
      />
      <Drawer.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          headerTitle: "Commandes",
        }}
      />
      <Drawer.Screen
        name="StockProduction"
        component={StockProductionScreen}
        options={{
          headerTitle: "Stock & Production",
        }}
      />
      <Drawer.Screen
        name="DataCenter"
        component={DataCenterScreen}
        options={{
          headerTitle: "Data Center",
        }}
      />
      <Drawer.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{
          headerTitle: "Assistant IA",
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Paramètres",
        }}
      />
      <Drawer.Screen
        name="SudoDashboard"
        component={SudoDashboardScreen}
        options={{
          headerTitle: "Supervision",
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    marginBottom: Spacing.md,
  },
  drawerLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
  },
  drawerHeaderText: {
    marginLeft: Spacing.md,
  },
  drawerItems: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  drawerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  drawerFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
});
