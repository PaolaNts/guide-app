import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/src/firebaseConfig";

type RouteStatus = "draft" | "shared" | "accepted" | "scheduled" | "completed";
type ScheduleStatus = "none" | "pending" | "done";

type RouteItem = {
  id: string;
  title?: string;
  clientName?: string;
  status?: RouteStatus;
  scheduleStatus?: ScheduleStatus;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  acceptedAt?: any;
  createdAt?: any;
  updatedAt?: any;
};

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getBestTitle(route: RouteItem) {
  const title = route.title?.trim();
  return title || "Rota sem título";
}

function formatDisplayDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const d = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeString(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export default function ScheduleRouteScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);

  const [dateValue, setDateValue] = useState(getTodayString());
  const [timeValue, setTimeValue] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const pendingRoutes = useMemo(() => {
    return routes.filter(
      (route) =>
        route.status === "accepted" &&
        route.scheduleStatus === "pending"
    );
  }, [routes]);

  useEffect(() => {
    const auth = getAuth();

    let unsubscribeRoutes: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeRoutes) {
        unsubscribeRoutes();
        unsubscribeRoutes = null;
      }

      if (!user) {
        setRoutes([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const q = query(
        collection(db, "users", user.uid, "routes"),
        orderBy("createdAt", "desc")
      );

      unsubscribeRoutes = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((d) => ({
            ...(d.data() as Omit<RouteItem, "id">),
            id: d.id,
          }));

          setRoutes(data);
          setLoading(false);
        },
        (error) => {
          console.log("Erro ao carregar rotas pendentes:", error);
          setMsg("Não foi possível carregar as rotas agora.");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRoutes) unsubscribeRoutes();
    };
  }, []);

  function openConfirm(route: RouteItem) {
    setMsg(null);
    setSelectedRoute(route);
    setDateValue(route.scheduledDate || getTodayString());
    setTimeValue(route.scheduledTime || "");
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (saving) return;
    setConfirmOpen(false);
    setSelectedRoute(null);
    setMsg(null);
  }

  async function handleSchedule() {
    const user = getAuth().currentUser;
    if (!user || !selectedRoute) return;

    const cleanDate = dateValue.trim();
    const cleanTime = timeValue.trim();

    if (!isValidDateString(cleanDate)) {
      setMsg("Digite a data no formato AAAA-MM-DD.");
      return;
    }

    if (!isValidTimeString(cleanTime)) {
      setMsg("Digite o horário no formato HH:MM.");
      return;
    }

    try {
      setSaving(true);
      setMsg(null);

      const routeRef = doc(db, "users", user.uid, "routes", selectedRoute.id);

      await updateDoc(routeRef, {
        status: "scheduled",
        scheduleStatus: "done",
        scheduledDate: cleanDate,
        scheduledTime: cleanTime,
        updatedAt: serverTimestamp(),
      });

      setConfirmOpen(false);
      setSelectedRoute(null);
      setTimeValue("");
    } catch (error) {
      console.log("Erro ao agendar rota:", error);
      setMsg("Não foi possível salvar o agendamento agora.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Carregando rotas aceitas…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconBtn}
          activeOpacity={0.9}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Agendar rota</Text>

        <View style={styles.iconPlaceholder} />
      </View>

      <Text style={styles.subtitle}>
        Escolha uma rota aceita para marcar data e horário na agenda.
      </Text>

      <FlatList
        data={pendingRoutes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-outline" size={26} color="#111827" />
            <Text style={styles.emptyTitle}>Nenhuma rota pendente</Text>
            <Text style={styles.emptyText}>
              Quando uma cliente aceitar uma rota, ela vai aparecer aqui para você agendar.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const title = getBestTitle(item);
          const client = item.clientName?.trim() || "Cliente não informado";

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => openConfirm(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSubtitle}>{client}</Text>

                <View style={styles.pendingBadge}>
                  <Ionicons name="time-outline" size={14} color="#92400E" />
                  <Text style={styles.pendingBadgeText}>Aguardando agenda</Text>
                </View>
              </View>

              <View style={styles.scheduleBtn}>
                <Ionicons name="calendar-outline" size={18} color="#111827" />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal transparent visible={confirmOpen} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={closeConfirm}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar-clear-outline" size={22} color="#111827" />
              <Text style={styles.modalTitle}>Confirmar agendamento</Text>
            </View>

            <Text style={styles.modalRouteTitle}>
              {selectedRoute ? getBestTitle(selectedRoute) : ""}
            </Text>

            {!!selectedRoute?.clientName && (
              <Text style={styles.modalRouteSubtitle}>
                {selectedRoute.clientName}
              </Text>
            )}

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Data</Text>
              <TextInput
                value={dateValue}
                onChangeText={setDateValue}
                placeholder="2026-03-17"
                autoCapitalize="none"
                style={styles.input}
              />
              <Text style={styles.helperText}>Formato: AAAA-MM-DD</Text>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Horário</Text>
              <TextInput
                value={timeValue}
                onChangeText={setTimeValue}
                placeholder="14:00"
                keyboardType="numbers-and-punctuation"
                style={styles.input}
              />
              <Text style={styles.helperText}>Formato: HH:MM</Text>
            </View>

            {dateValue && isValidDateString(dateValue) && (
              <Text style={styles.previewText}>
                Data selecionada: {formatDisplayDate(dateValue)}
              </Text>
            )}

            {msg && <Text style={styles.errorText}>{msg}</Text>}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeConfirm}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, saving && { opacity: 0.7 }]}
                onPress={handleSchedule}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 24,
  },

  loadingText: {
    marginTop: 10,
    color: "#6B7280",
    fontWeight: "700",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  iconPlaceholder: {
    width: 40,
    height: 40,
  },

  subtitle: {
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 2,
  },

  emptyWrap: {
    marginTop: 36,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  emptyText: {
    marginTop: 8,
    textAlign: "center",
    color: "#6B7280",
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  cardSubtitle: {
    marginTop: 4,
    color: "#6B7280",
    fontWeight: "600",
  },

  pendingBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  pendingBadgeText: {
    color: "#92400E",
    fontWeight: "800",
    fontSize: 12,
  },

  scheduleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },

  modalBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  modalRouteTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  modalRouteSubtitle: {
    marginTop: 4,
    color: "#6B7280",
    fontWeight: "600",
  },

  fieldWrap: {
    marginTop: 14,
  },

  label: {
    marginBottom: 6,
    fontWeight: "700",
    color: "#111827",
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#111827",
    fontSize: 15,
  },

  helperText: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },

  previewText: {
    marginTop: 14,
    color: "#374151",
    fontWeight: "700",
  },

  errorText: {
    marginTop: 12,
    color: "#DC2626",
    fontWeight: "700",
  },

  modalActions: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },

  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  cancelText: {
    fontWeight: "800",
    color: "#374151",
  },

  confirmButton: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 90,
    alignItems: "center",
  },

  confirmText: {
    color: "#fff",
    fontWeight: "900",
  },
});