import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DrawerNavigator from "@/navigation/DrawerNavigator";
import ClientDetailScreen from "@/screens/ClientDetailScreen";
import AddClientScreen from "@/screens/AddClientScreen";
import AddOrderScreen from "@/screens/AddOrderScreen";
import { SecurityModal } from "@/components/SecurityModal";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  ClientDetail: { clientId: string };
  AddClient: undefined;
  AddOrder: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Main"
          component={DrawerNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ClientDetail"
          component={ClientDetailScreen}
          options={{
            headerTitle: "Détails Client",
          }}
        />
        <Stack.Screen
          name="AddClient"
          component={AddClientScreen}
          options={{
            headerTitle: "Nouveau Client",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="AddOrder"
          component={AddOrderScreen}
          options={{
            headerTitle: "Nouvelle Commande",
            presentation: "modal",
          }}
        />
      </Stack.Navigator>
      <SecurityModal />
    </>
  );
}
