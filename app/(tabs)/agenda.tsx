import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  Calendar,
  DateData,
  LocaleConfig,
} from "react-native-calendars";
import * as Localization from "expo-localization";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/src/firebaseConfig";

//
// ===== Idiomas =====
//

LocaleConfig.locales["en"] = {
  monthNames: [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ],
  monthNamesShort: [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ],
  dayNames: [
    "Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"
  ],
  dayNamesShort: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  today: "Today",
};

LocaleConfig.locales["pt-br"] = {
  monthNames: [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ],
  monthNamesShort: [
    "Jan","Fev","Mar","Abr","Mai","Jun",
    "Jul","Ago","Set","Out","Nov","Dez"
  ],
  dayNames: [
    "Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"
  ],
  dayNamesShort: ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],
  today: "Hoje",
};

const languageTag =
  Localization.getLocales?.()?.[0]?.languageTag ?? "en-US";

LocaleConfig.defaultLocale = languageTag.toLowerCase().startsWith("pt")
  ? "pt-br"
  : "en";

//
// ===== Tipos =====
//

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
  createdAt?: any;
};

type AgendaItem = {
  id: string;
  client: string;
  service: string;
  time: string;
  date: string;
};

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const safeDate = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat(languageTag, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(safeDate);
}

export default function ClientAgenda() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddOptions, setShowAddOptions] = useState(false);

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
          console.log("Erro ao carregar agenda:", error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRoutes) unsubscribeRoutes();
    };
  }, []);

  const appointments = useMemo<AgendaItem[]>(() => {
    return routes
      .filter(
        (route) =>
          route.status === "scheduled" &&
          route.scheduleStatus === "done" &&
          !!route.scheduledDate
      )
      .map((route) => ({
        id: route.id,
        client: route.clientName?.trim() || "Cliente não informado",
        service: route.title?.trim() || "Rota sem título",
        time: route.scheduledTime?.trim() || "Sem horário",
        date: route.scheduledDate!,
      }));
  }, [routes]);

  const pendingToSchedule = useMemo(() => {
    return routes.filter(
      (route) =>
        route.status === "accepted" &&
        route.scheduleStatus === "pending"
    );
  }, [routes]);

  const dayItems = useMemo(() => {
    return appointments
      .filter((a) => a.date === selectedDate)
      .slice()
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    for (const a of appointments) {
      marks[a.date] = {
        ...(marks[a.date] ?? {}),
        marked: true,
        dotColor: "#2563EB",
      };
    }

    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: "#2563EB",
    };

    return marks;
  }, [appointments, selectedDate]);

  const renderHeader = (date: Date) => {
    const label = new Intl.DateTimeFormat(languageTag, {
      month: "long",
      year: "numeric",
    }).format(date);

    const title = label.charAt(0).toUpperCase() + label.slice(1);

    return (
      <View style={styles.calendarHeaderWrap}>
        <Text style={styles.calendarHeaderText}>{title}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Carregando agenda…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      {pendingToSchedule.length > 0 && (
        <View style={styles.pendingCard}>
          <View style={styles.pendingIcon}>
            <Ionicons name="time-outline" size={18} color="#92400E" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.pendingTitle}>Pendentes de agendamento</Text>
            <Text style={styles.pendingText}>
              Você tem {pendingToSchedule.length} rota(s) aceita(s) aguardando agenda.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.calendarCard}>
        <Calendar
          markedDates={markedDates}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          renderHeader={renderHeader}
          theme={{
            todayTextColor: "#2563EB",
            arrowColor: "#111827",
            textDayFontWeight: "600",
            textMonthFontWeight: "800",
            textDayHeaderFontWeight: "700",
          }}
        />
      </View>

      <Text style={styles.sectionTitle}>
        Agenda em {formatDisplayDate(selectedDate)}
      </Text>

      <FlatList
        data={dayItems}
        keyExtractor={(item) => item.id}
        style={{ marginTop: 8 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Sem rotas agendadas nesse dia.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card}>
            <Text style={styles.cardClient}>{item.client}</Text>
            <Text style={styles.cardService}>{item.service}</Text>

            <View style={styles.timePill}>
              <Ionicons name="time-outline" size={14} color="#374151" />
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
          </Pressable>
        )}
      />

      <TouchableOpacity
        onPress={() => setShowAddOptions(true)}
        style={styles.fab}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal transparent visible={showAddOptions} animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAddOptions(false)}
        >
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Ionicons name="add-circle-outline" size={22} color="#111827" />
              <Text style={styles.modalTitle}>Adicionar à agenda</Text>
            </View>

            <Text style={styles.modalText}>
              Escolha como você quer adicionar um item na agenda.
            </Text>

            <View style={{ marginTop: 14, gap: 10 }}>
              <TouchableOpacity
                style={styles.optionBtn}
                onPress={() => {
                  setShowAddOptions(false);
                  router.push('/agenda/schedule-route');
                }}
                activeOpacity={0.9}
              >
                <Ionicons name="map-outline" size={18} color="#111827" />
                <Text style={styles.optionText}>Agendar rota</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionBtn}
                onPress={() => {
                  setShowAddOptions(false);
                  router.push("/agenda/new-event");
                }}
                activeOpacity={0.9}
              >
                <Ionicons name="calendar-outline" size={18} color="#111827" />
                <Text style={styles.optionText}>Novo compromisso</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionBtn, { justifyContent: "center" }]}
                onPress={() => setShowAddOptions(false)}
                activeOpacity={0.9}
              >
                <Text style={[styles.optionText, { color: "#374151" }]}>
                  Cancelar
                </Text>
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

  pendingCard: {
    marginBottom: 12,
    marginTop: 4,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  pendingIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },

  pendingTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#92400E",
  },

  pendingText: {
    marginTop: 2,
    color: "#92400E",
    fontWeight: "600",
  },

  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  calendarHeaderWrap: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  calendarHeaderText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  sectionTitle: {
    fontWeight: "800",
    fontSize: 16,
    color: "#111827",
  },

  emptyWrap: {
    marginTop: 8,
  },

  emptyText: {
    marginTop: 8,
    opacity: 0.7,
    color: "#6B7280",
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  cardClient: {
    fontWeight: "800",
    fontSize: 15,
    color: "#111827",
  },

  cardService: {
    marginTop: 4,
    color: "#374151",
    fontWeight: "600",
  },

  timePill: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  timeText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 12,
  },

  fab: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },

  modalBox: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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

  modalText: {
    marginTop: 10,
    color: "#6B7280",
    fontWeight: "600",
  },

  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
  },

  optionText: {
    fontWeight: "900",
    color: "#111827",
  },
});