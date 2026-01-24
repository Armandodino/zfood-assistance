import React, { useState, useMemo } from "react";
import { View, FlatList, StyleSheet, TextInput, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ClientCard } from "@/components/ClientCard";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/contexts/DataContext";
import { Spacing, BorderRadius, ZFoodColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { clients, isLoading, refreshData } = useData();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.quartier.toLowerCase().includes(query) ||
        c.phone.includes(query)
    );
  }, [clients, searchQuery]);

  const handleAddClient = () => {
    navigation.navigate("AddClient");
  };

  const handleClientPress = (clientId: string) => {
    navigation.navigate("ClientDetail", { clientId });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View
        style={[
          styles.searchContainer,
          {
            paddingTop: headerHeight + Spacing.md,
            backgroundColor: theme.backgroundDefault,
          },
        ]}
      >
        <View
          style={[
            styles.searchInput,
            { backgroundColor: theme.backgroundRoot, borderColor: theme.border },
          ]}
        >
          <Feather name="search" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchText, { color: theme.text }]}
            placeholder="Rechercher un client..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <Feather
              name="x"
              size={18}
              color={theme.textMuted}
              onPress={() => setSearchQuery("")}
            />
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredClients}
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
          <ClientCard
            id={item.id}
            name={item.name}
            quartier={item.quartier}
            phone={item.phone}
            onPress={() => handleClientPress(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            image={require("../../assets/images/illustrations/empty_clients_illustration.png")}
            title="Aucun client"
            subtitle="Ajoutez votre premier client pour commencer à gérer vos commandes"
          />
        }
      />

      <FAB onPress={handleAddClient} bottom={insets.bottom + 24} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  searchText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
  },
});
