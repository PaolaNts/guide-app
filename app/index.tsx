import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function Index() {
  useEffect(() => {
    async function checkAuth() {
      const token = await AsyncStorage.getItem("token");
      const hasProfile = await AsyncStorage.getItem("hasProfile");

      if (!token) {
        router.replace("/login");
        return;
      }

      if (hasProfile === "true") {
        router.replace("/neew");
      } else {
        router.replace("/home");
      }
    }

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
