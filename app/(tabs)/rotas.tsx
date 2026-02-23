import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/src/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

type Block = {
  id: string;
  type: "title" | "text" | "description";
  content: string;
};

type Route = {
  id: string;
  title?: string;
  clientName?: string;
  blocks: Block[];
  createdAt?: any;
  updatedAt?: any;
};

export default function Routes() {
  const router = useRouter();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [actionRoute, setActionRoute] = useState<Route | null>(null);
  const [cloning, setCloning] = useState(false);

  function openActions(route: Route) {
    setActionRoute(route);
  }

  function getBestTitle(route: Route) {
    const t = route.title?.trim();
    if (t) return t;

    const fromBlocks = route.blocks?.find((b) => b.type === "title")?.content?.trim();
    return fromBlocks || "Rota sem título";
  }

  function formatDateTime(ts: any) {
    try {
      const d: Date =
        ts?.toDate?.() instanceof Date ? ts.toDate() :
        ts instanceof Date ? ts :
        new Date();

      const date = d.toLocaleDateString("pt-BR");
      const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      return { date, time };
    } catch {
      return { date: "—", time: "—" };
    }
  }

  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "routes"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          ...(d.data() as Omit<Route, "id">),
          id: d.id, // ✅ garante o id do doc
        }));
        setRoutes(data);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, []);

  // ✅ EDITAR -> agora passa { id } (o create.tsx vai ler id)
  function handleEdit(id: string) {
    router.push({ pathname: "/routes/create", params: { id } });
  }

  function handleView(id: string) {
    setActionRoute(null);
    router.push({ pathname: "/routes/view", params: { routeId: id } }); // mantém como está (se seu view usa routeId)
  }

  async function handleClone(route: Route) {
    const user = getAuth().currentUser;
    if (!user) return;

    try {
      setActionRoute(null);
      setCloning(true);

      const { id: _oldId, ...rest } = route;
      const title = getBestTitle(route);

      const cloned: Omit<Route, "id"> = {
        ...rest,
        title: `${title} (cópia)`,
        blocks: Array.isArray(route.blocks) ? route.blocks : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db, "users", user.uid, "routes"), cloned);

      // ✅ depois de clonar abre o MESMO create.tsx em modo edição
      router.push({ pathname: "/routes/create", params: { id: ref.id } });
    } finally {
      setCloning(false);
    }
  }

  async function confirmDelete() {
    const user = getAuth().currentUser;
    if (!user || !deleteId) return;

    await deleteDoc(doc(db, "users", user.uid, "routes", deleteId));
    setDeleteId(null);
  }

  const headerTitle = useMemo(() => {
    if (loading) return "Rotas";
    return `Rotas (${routes.length})`;
  }, [loading, routes.length]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Carregando rotas…</Text>
      </View>
    );
  }

  if (routes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="map-outline" size={26} color="#111827" />
        </View>

        <Text style={styles.emptyTitle}>Nenhuma rota ainda</Text>
        <Text style={styles.emptyText}>
          Crie sua primeira rota e ela vai aparecer aqui no histórico.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("../routes/create")}
          activeOpacity={0.9}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Criar nova rota</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <Text style={styles.headerSubtitle}>Seu histórico de rotas criadas</Text>
        </View>
      </View>

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 110 }}
        renderItem={({ item }) => {
          const { date, time } = formatDateTime(item.createdAt);
          const title = getBestTitle(item);
          const client = item.clientName?.trim() || "Cliente não informado";

          return (
            <TouchableOpacity
              onPress={() => handleEdit(item.id)}
              style={styles.card}
              activeOpacity={0.9}
            >
              {/* ESQUERDA */}
              <View style={styles.cardLeft}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {title}
                </Text>

                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {client}
                </Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name="calendar-outline" size={14} color="#374151" />
                    <Text style={styles.metaText}>{date}</Text>
                  </View>

                  <View style={styles.metaPill}>
                    <Ionicons name="time-outline" size={14} color="#374151" />
                    <Text style={styles.metaText}>{time}</Text>
                  </View>
                </View>
              </View>

              {/* DIREITA */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => handleEdit(item.id)}
                  style={styles.actionBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={20} color="#2563eb" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDeleteId(item.id)}
                  style={styles.actionBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={(e: any) => {
                    e?.stopPropagation?.();
                    openActions(item);
                  }}
                  style={styles.actionBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push("../routes/create")}
        style={styles.fab}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Confirm delete modal */}
      <Modal transparent visible={!!deleteId} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteId(null)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning-outline" size={22} color="#111827" />
              <Text style={styles.modalTitle}>Excluir rota?</Text>
            </View>

            <Text style={styles.modalText}>Essa ação não pode ser desfeita.</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleteId(null)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete}>
                <Text style={styles.deleteText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Action modal (chevron) */}
      <Modal transparent visible={!!actionRoute} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setActionRoute(null)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
              <Text style={styles.modalTitle}>Opções</Text>
            </View>

            <Text style={styles.modalText}>
              {actionRoute ? getBestTitle(actionRoute) : ""}
            </Text>

            <View style={{ marginTop: 14, gap: 10 }}>
              <TouchableOpacity
                style={styles.optionBtn}
                onPress={() => actionRoute && handleView(actionRoute.id)}
                activeOpacity={0.9}
              >
                <Ionicons name="eye-outline" size={18} color="#111827" />
                <Text style={styles.optionText}>Visualizar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionBtn}
                onPress={() => actionRoute && handleClone(actionRoute)}
                activeOpacity={0.9}
                disabled={cloning}
              >
                {cloning ? (
                  <ActivityIndicator />
                ) : (
                  <Ionicons name="copy-outline" size={18} color="#111827" />
                )}
                <Text style={styles.optionText}>Clonar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionBtn, { justifyContent: "center" }]}
                onPress={() => setActionRoute(null)}
                activeOpacity={0.9}
              >
                <Text style={[styles.optionText, { color: "#374151" }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  headerSubtitle: { marginTop: 3, color: "#6B7280", fontWeight: "600" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, color: "#6B7280", fontWeight: "600" },

  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  emptyText: { marginTop: 8, color: "#6B7280", textAlign: "center", fontWeight: "600" },

  primaryButton: {
    marginTop: 16,
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryButtonText: { color: "#FFF", fontSize: 16, fontWeight: "800" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  cardLeft: {
    flex: 1,
    paddingRight: 8,
    minWidth: 0,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  cardSubtitle: { marginTop: 4, color: "#6B7280", fontWeight: "600" },

  metaRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  metaText: { color: "#374151", fontWeight: "700", fontSize: 12 },

  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  modalText: { marginTop: 10, color: "#6B7280", fontWeight: "600" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 18 },

  cancelButton: { paddingVertical: 10, paddingHorizontal: 12 },
  cancelText: { fontWeight: "800", color: "#374151" },

  deleteButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  deleteText: { color: "#fff", fontWeight: "900" },

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