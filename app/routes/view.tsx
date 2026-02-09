// app/routes/view.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Pressable,
  TextStyle,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/src/firebaseConfig";

type Block = {
  id: string;
  type: "title" | "text" | "description";
  content: string;
  format?: {
    align?: "left" | "center" | "right";
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    size?: "sm" | "md" | "lg";
  };
};

type RouteType = {
  id: string;
  title?: string;
  clientName?: string;
  blocks: Block[];
  createdAt?: any;
  updatedAt?: any;
};

export default function RouteView() {
  const router = useRouter();

  const { routeId } = useLocalSearchParams<{ routeId: string }>();

  const routeIdStr = useMemo(() => {
    return Array.isArray(routeId) ? routeId[0] : routeId;
  }, [routeId]);

  const [route, setRoute] = useState<RouteType | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ aplica o format do Firestore (item.format)
  function styleFromFormat(item: Block): TextStyle {
    const f = item.format;

    const fontSize =
      f?.size === "sm" ? 14 : f?.size === "lg" ? 20 : undefined; // md => deixa padrão do style base

    return {
      textAlign: f?.align ?? "left",
      fontWeight: f?.bold ? "900" : undefined,
      fontStyle: f?.italic ? "italic" : undefined,
      textDecorationLine: f?.underline ? "underline" : undefined,
      fontSize,
    };
  }

  function getBestTitle(r: RouteType) {
    const t = r.title?.trim();
    if (t) return t;

    const fromBlocks = r.blocks?.find((b) => b.type === "title")?.content?.trim();
    return fromBlocks || "Rota sem título";
  }

  const blocks = useMemo(() => {
    const list = route?.blocks || [];
    return list.filter((b) => (b.content || "").trim().length > 0);
  }, [route]);

  useEffect(() => {
    const user = getAuth().currentUser;

    if (!user || !routeIdStr) {
      setLoading(false);
      setRoute(null);
      return;
    }

    const ref = doc(db, "users", user.uid, "routes", routeIdStr);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRoute(null);
          setLoading(false);
          return;
        }

        setRoute({ id: snap.id, ...(snap.data() as Omit<RouteType, "id">) });
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [routeIdStr]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Carregando…</Text>
      </View>
    );
  }

  if (!route) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={26} color="#111827" />
        <Text style={styles.emptyTitle}>Rota não encontrada</Text>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.9}
        >
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pageTitle = getBestTitle(route);
  const client = route.clientName?.trim() || "";

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.9}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Visualização
        </Text>

        {/* ✅ botão editar */}
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/routes/edit",
              params: { routeId: route.id },
            })
          }
          style={styles.iconBtn}
          activeOpacity={0.9}
        >
          <Ionicons name="create-outline" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Conteúdo em modo leitura */}
      <View style={styles.paper}>
        <Text style={styles.pageTitle}>{pageTitle}</Text>
        {!!client && <Text style={styles.pageSubtitle}>{client}</Text>}

        <View style={styles.divider} />

        <FlatList
          data={blocks}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: 14 }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          renderItem={({ item }) => {
            const inline = styleFromFormat(item);

            if (item.type === "title") {
              return <Text style={[styles.readTitle, inline]}>{item.content}</Text>;
            }

            if (item.type === "description") {
              return <Text style={[styles.readDescription, inline]}>{item.content}</Text>;
            }

            return <Text style={[styles.readText, inline]}>{item.content}</Text>;
          }}
        />
      </View>

      <Pressable style={styles.hintRow} onPress={() => {}}>
        <Ionicons name="lock-closed-outline" size={14} color="#6B7280" />
        <Text style={styles.hintText}>Modo leitura — sem edição</Text>
      </Pressable>
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

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 18 },
  loadingText: { marginTop: 10, color: "#6B7280", fontWeight: "700" },
  emptyTitle: { marginTop: 8, fontSize: 16, fontWeight: "900", color: "#111827" },
  backBtn: {
    marginTop: 14,
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  backText: { color: "#fff", fontWeight: "900" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
  },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "900", color: "#111827" },
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

  paper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },

  pageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    lineHeight: 30,
  },
  pageSubtitle: {
    marginTop: 6,
    color: "#6B7280",
    fontWeight: "700",
    lineHeight: 20,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 14,
    marginBottom: 14,
  },

  readTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    lineHeight: 28,
  },

  readDescription: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    lineHeight: 22,
  },

  readText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 24,
  },

  hintRow: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingBottom: 10,
  },
  hintText: { color: "#6B7280", fontWeight: "700", fontSize: 12 },
});
