import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { User } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth } from "../../src/firebaseConfig";
import { useEffect, useState } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export default function Profile() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // ✅ faltava isso
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      setEmail(user.email ?? "");

      const db = getFirestore();
      const snap = await getDoc(doc(db, "users", user.uid));

      if (snap.exists()) {
        const data = snap.data();
        if (data.fullName) setName(String(data.fullName));
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    try {
      setErrorMsg(null);

      await signOut(auth);

      await AsyncStorage.multiRemove(["token", "userId"]);

      router.replace("/login");
    } catch (error) {
      setErrorMsg("Não foi possível sair da conta");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#87a2eb9f", "#c581c960"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        <View style={styles.containerprofile}>
          <Text style={styles.textH1}>Perfil</Text>

          {errorMsg && <Text style={{ color: "red" }}>{errorMsg}</Text>}

          <Avatar
            size="xl"
            style={{
              marginTop: 20,
              borderWidth: 3,
              borderColor: "white",
              backgroundColor: "#d3d3d3",
            }}
          >
            <Icon as={User} size="xl" className="stroke-white" />
            <AvatarImage />
          </Avatar>

          <Text style={styles.textH2}>{name || "Nome não informado"}</Text>
          <Text style={styles.textH2}>{email || "Email não informado"}</Text>
        </View>

        <View style={{ alignItems: "center" }}>
          <Text style={styles.textH2}>Configuração</Text>
        </View>

        <View style={styles.Containerconfig}>
          <TouchableOpacity
            onPress={() => router.push("/home?editProfile=1")}
            style={styles.btnprofile}
          >
            <Text style={styles.btntext}>Editar perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnprofile} onPress={handleLogout}>
            <Text style={styles.btntext}>Sair</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  textH1: {
    fontFamily: "Inter",
    fontWeight: "600",
    fontSize: 24,
    color: "#1a1919",
    marginTop: 20,
  },
  textH2: {
    fontFamily: "Inter",
    fontWeight: "600",
    fontSize: 16,
    color: "#1a1919",
    marginTop: 10,
  },
  container: {
    flex: 1,
    alignItems: "center",
  },
  containerprofile: {
    alignItems: "center",
    width: "95%",
    backgroundColor: "#ffffffec",
    marginTop: 10,
    borderRadius: 10,
    padding: 10,
  },
  Containerconfig: {
    flex: 1,
    width: "95%",
    alignItems: "center",
    backgroundColor: "#ffffffec",
    marginTop: 10,
    borderRadius: 10,
  },
  btntext: {
    color: "#1a1919",
    fontFamily: "Inter",
    fontWeight: "500",
    fontSize: 16,
  },
  btnprofile: {
    borderRadius: 12,
    backgroundColor: "transparent",
    padding: 10,
    fontFamily: "Inter",
    fontWeight: 400 as any,
    fontSize: 16,
    width: "95%",
    marginTop: 10,
  },
});
