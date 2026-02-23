import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useLocalSearchParams, router } from "expo-router";

import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { auth } from "../../src/firebaseConfig";





const PROFILE_FLAG_KEY = "@profile_configured";

type TourismArea =
  | "Turismo cultural"
  | "Turismo histórico"
  | "Enoturismo"
  | "Ecoturismo"
  | "Turismo de aventura"
  | "Turismo gastronômico"
  | "Turismo de negócios"
  | "Turismo religioso"
  | "Turismo de luxo"
  | "Turismo de base comunitária";

export default function HomeScreen() {
  const db = useMemo(() => getFirestore(), []);

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [fullName, setFullName] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<TourismArea[]>([]);
  const [saving, setSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const areas: TourismArea[] = useMemo(
    () => [
      "Turismo cultural",
      "Turismo histórico",
      "Enoturismo",
      "Ecoturismo",
      "Turismo de aventura",
      "Turismo gastronômico",
      "Turismo de negócios",
      "Turismo religioso",
      "Turismo de luxo",
      "Turismo de base comunitária",
    ],
    []
  );

  useEffect(() => {
    (async () => {
      setErrorMsg(null);

      const user = auth.currentUser;
      if (!user) return;

      const configured = await AsyncStorage.getItem(PROFILE_FLAG_KEY);
      if (!configured) {
        setProfileModalVisible(true);
      }
    })();
  }, []);

  function toggleArea(area: TourismArea) {
    setSelectedAreas((prev) => {
      if (prev.includes(area)) return prev.filter((a) => a !== area);
      return [...prev, area];
    });
  }

  function validate() {
    const name = fullName.trim();
    if (name.length < 3) return "Digite seu nome completo.";
    if (selectedAreas.length === 0) return "Selecione pelo menos uma área de atuação.";
    return null;
  }

  async function handleSaveProfile() {
    setErrorMsg(null);

    const user = auth.currentUser;
    if (!user) {
      setErrorMsg("Você precisa estar logada para configurar o perfil.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    try {
      setSaving(true);

      const uid = user.uid;
      await setDoc(
        doc(db, "users", uid),
        {
          fullName: fullName.trim(),
          tourismAreas: selectedAreas,
          profileConfigured: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await AsyncStorage.setItem(PROFILE_FLAG_KEY, "1");
      setProfileModalVisible(false);
    } catch (err) {
      setErrorMsg("Não foi possível salvar agora. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setErrorMsg(null);
    try {
      await signOut(auth);
      router.replace("/"); // ajuste sua rota
    } catch {
      setErrorMsg("Não foi possível sair agora.");
    }
  }
 const params = useLocalSearchParams<{ editProfile?: string }>();

  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;
      if (!user) return;

      // 1) Primeira vez: se não configurou, abre
      // 2) Edição: se veio editProfile=1, abre também
      (async () => {
        const configured = await AsyncStorage.getItem(PROFILE_FLAG_KEY);

        if (!configured || params.editProfile === "1") {
          // (recomendado) preencher campos quando for editar
          if (params.editProfile === "1") {
            try {
              const snap = await getDoc(doc(db, "users", user.uid));
              if (snap.exists()) {
                const data = snap.data();
                setFullName(String(data.fullName ?? ""));
                setSelectedAreas((data.tourismAreas ?? []) as TourismArea[]);
              }
            } catch {
              // se falhar, abre mesmo assim
            }
          }

          setProfileModalVisible(true);

          // limpa o param pra não ficar abrindo sempre
          if (params.editProfile === "1") {
            router.setParams({ editProfile: undefined });
          }
        }
      })();
    }, [params.editProfile, db])
  );


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>

      {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      

      {/* MODAL DE PERFIL (abre só na 1ª vez) */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          // Se você quiser forçar a configurar, NÃO permita fechar.
          // Deixe vazio pra não fechar via botão "voltar" no Android.
        }}
      >
        <Pressable style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Configurar perfil</Text>
            <Text style={styles.modalSubtitle}>
              Informe seu nome completo e selecione suas áreas de atuação.
            </Text>

            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ex.: Paola Nastasio"
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="done"
            />

            <Text style={styles.label}>Áreas de atuação</Text>
            <View style={styles.chipsWrap}>
              {areas.map((area) => {
                const active = selectedAreas.includes(area);
                return (
                  <TouchableOpacity
                    key={area}
                    onPress={() => toggleArea(area)}
                    style={[styles.chip, active && styles.chipActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {area}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
              activeOpacity={0.9}
            >
              {saving ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.buttonText}>Salvar</Text>
              )}
            </TouchableOpacity>

            {/* Se você quiser permitir "configurar depois", pode colocar um botão aqui.
                Mas você disse que quer aparecer só uma vez e depois não abrir mais.
                Então, ideal é obrigar a salvar para fechar.
            */}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  error: { marginTop: 10, color: "#b00020" },

  button: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "white", fontWeight: "700" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalSubtitle: { marginTop: 6, opacity: 0.75 },

  label: { marginTop: 14, fontWeight: "700" },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color:'#0a0a0a'
  },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipActive: {
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  chipText: { color: "#111827", fontWeight: "600" },
  chipTextActive: { color: "white" },
});
