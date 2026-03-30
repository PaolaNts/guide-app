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
  Alert,
  ScrollView,
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

  const [debugMsg, setDebugMsg] = useState("Tela iniciou");
  const [debugSteps, setDebugSteps] = useState<string[]>([]);

  const params = useLocalSearchParams<{ editProfile?: string }>();

  function addDebug(message: string) {
    const line = `${new Date().toLocaleTimeString("pt-BR")} - ${message}`;
    setDebugMsg(message);
    setDebugSteps((prev) => [...prev, line]);
  }

  function clearDebug() {
    setDebugMsg("Logs limpos");
    setDebugSteps([]);
  }

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
    addDebug("useEffect executou");

    (async () => {
      try {
        setErrorMsg(null);

        const user = auth.currentUser;
        addDebug(`Usuário atual: ${user ? user.uid : "nenhum"}`);

        if (!user) {
          addDebug("Saiu do useEffect porque não há usuário");
          return;
        }

        const configured = await AsyncStorage.getItem(PROFILE_FLAG_KEY);
        addDebug(`AsyncStorage PROFILE_FLAG_KEY: ${configured ?? "null"}`);

        if (!configured) {
          addDebug("Abrindo modal porque não encontrou configuração");
          setProfileModalVisible(true);
        } else {
          addDebug("Perfil já configurado, não abriu modal");
        }
      } catch (err) {
        addDebug(`Erro no useEffect: ${String(err)}`);
        setErrorMsg(`Erro no carregamento inicial: ${String(err)}`);
      }
    })();
  }, []);

  function toggleArea(area: TourismArea) {
    addDebug(`Clicou na área: ${area}`);

    setSelectedAreas((prev) => {
      if (prev.includes(area)) {
        addDebug(`Removeu área: ${area}`);
        return prev.filter((a) => a !== area);
      }

      addDebug(`Adicionou área: ${area}`);
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
    addDebug("Entrou no handleSaveProfile");
    setErrorMsg(null);

    const user = auth.currentUser;
    addDebug(`User no save: ${user ? user.uid : "nenhum"}`);

    if (!user) {
      addDebug("Bloqueou save porque não há usuário");
      setErrorMsg("Você precisa estar logada para configurar o perfil.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      addDebug(`Erro de validação: ${validationError}`);
      setErrorMsg(validationError);
      return;
    }

    try {
      setSaving(true);
      addDebug("Iniciando salvamento no Firestore");

      const uid = user.uid;

      const payload = {
        fullName: fullName.trim(),
        tourismAreas: selectedAreas,
        profileConfigured: true,
        updatedAt: serverTimestamp(),
      };

      addDebug(`Payload montado para uid ${uid}`);

      await setDoc(doc(db, "users", uid), payload, { merge: true });

      addDebug("setDoc executou com sucesso");

      await AsyncStorage.setItem(PROFILE_FLAG_KEY, "1");
      addDebug("AsyncStorage PROFILE_FLAG_KEY salvo com valor 1");

      setProfileModalVisible(false);
      addDebug("Modal fechado com sucesso");
    } catch (err) {
      addDebug(`Erro no handleSaveProfile: ${String(err)}`);
      setErrorMsg(`Não foi possível salvar agora. Detalhe: ${String(err)}`);
      Alert.alert("ERRO", String(err));
    } finally {
      setSaving(false);
      addDebug("Finalizou handleSaveProfile");
    }
  }

  async function handleLogout() {
    setErrorMsg(null);
    addDebug("Entrou no handleLogout");

    try {
      await signOut(auth);
      addDebug("Logout realizado");
      router.replace("/");
    } catch (err) {
      addDebug(`Erro no logout: ${String(err)}`);
      setErrorMsg("Não foi possível sair agora.");
    }
  }

  useFocusEffect(
    useCallback(() => {
      addDebug("useFocusEffect executou");

      const user = auth.currentUser;
      addDebug(`User no focus: ${user ? user.uid : "nenhum"}`);

      if (!user) {
        addDebug("Saiu do focus porque não há usuário");
        return;
      }

      (async () => {
        try {
          const configured = await AsyncStorage.getItem(PROFILE_FLAG_KEY);
          addDebug(`Focus AsyncStorage PROFILE_FLAG_KEY: ${configured ?? "null"}`);
          addDebug(`Param editProfile: ${params.editProfile ?? "undefined"}`);

          if (!configured || params.editProfile === "1") {
            addDebug("Vai abrir modal via focus");

            if (params.editProfile === "1") {
              try {
                addDebug("Tentando carregar dados do Firestore para edição");
                const snap = await getDoc(doc(db, "users", user.uid));

                if (snap.exists()) {
                  const data = snap.data();
                  addDebug("Documento do usuário encontrado no Firestore");
                  setFullName(String(data.fullName ?? ""));
                  setSelectedAreas((data.tourismAreas ?? []) as TourismArea[]);
                } else {
                  addDebug("Documento do usuário não existe no Firestore");
                }
              } catch (err) {
                addDebug(`Erro ao carregar dados para edição: ${String(err)}`);
              }
            }

            setProfileModalVisible(true);
            addDebug("Modal aberto pelo focus");

            if (params.editProfile === "1") {
              router.setParams({ editProfile: undefined });
              addDebug("Limpou param editProfile");
            }
          } else {
            addDebug("Não abriu modal no focus");
          }
        } catch (err) {
          addDebug(`Erro no useFocusEffect: ${String(err)}`);
        }
      })();
    }, [params.editProfile, db])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Home</Text>

      <Text style={styles.debugTitle}>Debug atual:</Text>
      <Text style={styles.debugBox}>{debugMsg}</Text>

      <View style={styles.debugHeaderRow}>
        <Text style={styles.debugTitle}>Passos executados:</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearDebug}>
          <Text style={styles.clearButtonText}>Limpar logs</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.debugList}>
        {debugSteps.length === 0 ? (
          <Text style={styles.debugEmpty}>Sem logs no momento</Text>
        ) : (
          debugSteps.map((item, index) => (
            <Text key={`${item}-${index}`} style={styles.debugItem}>
              {item}
            </Text>
          ))
        )}
      </View>

      {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      <TouchableOpacity
        style={styles.testButton}
        onPress={() => {
          Alert.alert("DEBUG", "Botão de teste clicado");
          addDebug("Botão de teste clicado");
        }}
      >
        <Text style={styles.buttonText}>Testar alerta</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.testButton}
        onPress={async () => {
          const value = await AsyncStorage.getItem(PROFILE_FLAG_KEY);
          Alert.alert("AsyncStorage", String(value));
          addDebug(`Leitura manual AsyncStorage: ${value ?? "null"}`);
        }}
      >
        <Text style={styles.buttonText}>Ver AsyncStorage</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.testButton}
        onPress={async () => {
          await AsyncStorage.removeItem(PROFILE_FLAG_KEY);
          addDebug("Removido PROFILE_FLAG_KEY do AsyncStorage");
          Alert.alert("DEBUG", "Flag removida");
        }}
      >
        <Text style={styles.buttonText}>Limpar AsyncStorage</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.testButton}
        onPress={async () => {
          try {
            await AsyncStorage.clear();
            addDebug("AsyncStorage LIMPO COMPLETAMENTE");
            Alert.alert("DEBUG", "AsyncStorage limpo");
          } catch (err) {
            addDebug(`Erro ao limpar AsyncStorage: ${String(err)}`);
            Alert.alert("ERRO", String(err));
          }
        }}
      >
        <Text style={styles.buttonText}>Limpar AsyncStorage (tudo)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.testButton}
        onPress={() => {
          addDebug("Abrindo modal manualmente");
          setProfileModalVisible(true);
        }}
      >
        <Text style={styles.buttonText}>Abrir modal manualmente</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.testButton} onPress={handleLogout}>
        <Text style={styles.buttonText}>Sair</Text>
      </TouchableOpacity>

      <Modal
        visible={profileModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {}}
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
              onChangeText={(text) => {
                setFullName(text);
                addDebug(`Digitando nome: ${text}`);
              }}
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
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111827",
  },
  error: {
    marginTop: 10,
    color: "#b00020",
    fontWeight: "600",
  },
  debugHeaderRow: {
    marginTop: 12,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  debugTitle: {
    fontWeight: "800",
    color: "#111827",
  },
  debugBox: {
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 10,
    color: "#111827",
  },
  debugList: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    maxHeight: 260,
  },
  debugItem: {
    color: "#374151",
    marginBottom: 4,
    fontSize: 12,
  },
  debugEmpty: {
    color: "#6b7280",
    fontSize: 12,
  },
  clearButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  clearButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  testButton: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
  },
  button: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    marginTop: 6,
    opacity: 0.75,
    color: "#374151",
  },
  label: {
    marginTop: 14,
    fontWeight: "700",
    color: "#111827",
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0a0a0a",
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
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
  chipText: {
    color: "#111827",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "white",
  },
});