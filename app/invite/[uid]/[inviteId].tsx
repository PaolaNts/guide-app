import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/src/firebaseConfig";

export default function InvitePage() {
  const { uid, inviteId } = useLocalSearchParams<{
    uid: string;
    inviteId: string;
  }>();

  const uidStr = useMemo(() => (Array.isArray(uid) ? uid[0] : uid), [uid]);
  const inviteIdStr = useMemo(() => (Array.isArray(inviteId) ? inviteId[0] : inviteId), [inviteId]);

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!uidStr || !inviteIdStr) return;

      const ref = doc(db, "users", uidStr, "route_invites", inviteIdStr);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setInvite(null);
        setLoading(false);
        return;
      }

      setInvite(snap.data());
      setLoading(false);
    }

    load();
  }, [uidStr, inviteIdStr]);

  async function respond(status: "accepted" | "declined") {
    if (!uidStr || !inviteIdStr) return;

    const ref = doc(db, "users", uidStr, "route_invites", inviteIdStr);

    await updateDoc(ref, {
      status,
      respondedAt: serverTimestamp(),
    });

    setInvite((prev: any) => ({ ...prev, status }));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!invite) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Link inválido</Text>
      </View>
    );
  }

  const route = invite.routeSnapshot || {};

  return (
    <View style={styles.screen}>
      <View style={styles.paper}>
        <Text style={styles.title}>{route.title || "Rota"}</Text>
        {!!route.clientName && (
          <Text style={styles.subtitle}>{route.clientName}</Text>
        )}

        <View style={styles.divider} />

        {(route.blocks || []).map((b: any) => (
          <Text key={b.id} style={styles.text}>
            {b.content}
          </Text>
        ))}
      </View>

      {invite.status === "pending" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.accept]}
            onPress={() => respond("accepted")}
          >
            <Text style={styles.btnText}>Aceitar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.decline]}
            onPress={() => respond("declined")}
          >
            <Text style={styles.btnText}>Recusar</Text>
          </TouchableOpacity>
        </View>
      )}

      {invite.status !== "pending" && (
        <Text style={styles.status}>
          {invite.status === "accepted"
            ? "Rota aceita ✅"
            : "Rota recusada ❌"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: "#F8FAFC" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  paper: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: { fontSize: 22, fontWeight: "900", color: "#111827" },
  subtitle: { marginTop: 4, color: "#6B7280", fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  text: { fontSize: 16, marginBottom: 8, color: "#111827" },

  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: { flex: 1, padding: 12, borderRadius: 12, alignItems: "center" },
  accept: { backgroundColor: "#16A34A" },
  decline: { backgroundColor: "#DC2626" },
  btnText: { color: "#fff", fontWeight: "900" },

  status: {
    marginTop: 16,
    textAlign: "center",
    fontWeight: "800",
    color: "#111827",
  },
});
