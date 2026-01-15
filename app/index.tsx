import { useEffect } from "react"
import { View, ActivityIndicator } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { router } from "expo-router"

export default function Index() {
  useEffect(() => {
    const checkFlow = async () => {
      const userId = await AsyncStorage.getItem("userId")

      if (!userId) {
        router.replace("/login")
        return
      }

      const hasProfile = await AsyncStorage.getItem(`hasProfile:${userId}`)

      if (hasProfile === "true") {
        router.replace("/(tabs)/home")
      } else {
        router.replace("/custom/customizeprofile")
      }
    }

    checkFlow()
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  )
}
