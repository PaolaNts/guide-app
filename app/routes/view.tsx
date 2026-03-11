// app/routes/view.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Pressable,
  TextStyle,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/src/firebaseConfig";
import { shareRoute } from "../compartilhar/shareRoute";
import { Video, Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import { useOnline } from "@/hooks/useOnline";

type BlockType = "title" | "text" | "description" | "image" | "video" | "audio";
type Align = "left" | "center" | "right" | "justify";

type Block = {
  id: string;
  type: BlockType;
  content: string;
  format?: {
    align?: Align; // se vier "start", vamos normalizar pra "left"
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

// =========================
// AudioPlayer (reutilizável)
// =========================
function AudioPlayer({ uri }: { uri: string }) {
  const soundRef = useRef<Audio.Sound | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(1);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const fmtTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  async function unloadSound() {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch {}
  }

  async function ensureSoundLoaded() {
    if (soundRef.current) return;
    if (!uri) return;

    setIsLoadingAudio(true);

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false, progressUpdateIntervalMillis: 250 }
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;

      setIsPlaying(status.isPlaying);
      setPositionMillis(status.positionMillis ?? 0);
      setDurationMillis(status.durationMillis ?? 1);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPositionMillis(0);
      }
    });

    soundRef.current = sound;
    setIsLoadingAudio(false);
  }

  async function togglePlay() {
    await ensureSoundLoaded();
    const s = soundRef.current;
    if (!s) return;

    const status = await s.getStatusAsync();
    if (!status.isLoaded) return;

    if (status.isPlaying) await s.pauseAsync();
    else await s.playAsync();
  }

  async function seekTo(ratio: number) {
    const s = soundRef.current;
    if (!s) return;
    const newPos = Math.floor(ratio * (durationMillis || 1));
    await s.setPositionAsync(newPos);
  }

  // Se trocar a uri, descarrega o anterior
  useEffect(() => {
    unloadSound();
    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      unloadSound();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ratio = Math.min(1, Math.max(0, positionMillis / (durationMillis || 1)));

  return (
    <View style={styles.audioPlayer}>
      <TouchableOpacity style={styles.audioPlayBtn} onPress={togglePlay} disabled={isLoadingAudio}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#111827" />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Slider value={ratio} onSlidingComplete={seekTo} minimumValue={0} maximumValue={1} />
        <View style={styles.audioTimes}>
          <Text style={styles.audioTimeText}>{fmtTime(positionMillis)}</Text>
          <Text style={styles.audioTimeText}>{fmtTime(durationMillis)}</Text>
        </View>
      </View>

      <Ionicons name="mic-outline" size={18} color="#111827" />
    </View>
  );
}

export default function RouteView() {
  const router = useRouter();
  const { routeId } = useLocalSearchParams<{ routeId: string }>();

  const routeIdStr = useMemo(() => {
    return Array.isArray(routeId) ? routeId[0] : routeId;
  }, [routeId]);

  const [route, setRoute] = useState<RouteType | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const isOnline = useOnline();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  async function handleShare() {
    if (!route) return;

    await shareRoute(route);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ✅ aplica o format do Firestore (item.format)
  function styleFromFormat(item: Block): TextStyle {
    const f = item.format;

    const fontSize = f?.size === "sm" ? 14 : f?.size === "lg" ? 20 : undefined;

    const rawAlign = (f?.align ?? "left") as any;
    const align: Align = rawAlign === "start" ? "left" : rawAlign;

    return {
      textAlign: align,
      // 900 costuma falhar em algumas fontes. 700 é mais confiável.
      fontWeight: f?.bold ? "700" : undefined,
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
    return list.filter((b) => (b.content || "").toString().trim().length > 0);
  }, [route]);

  useEffect(() => {
    const user = getAuth().currentUser;
     setErrorMsg(null);

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
      (err) => {
        setLoading(false);
        setErrorMsg(err?.message ?? "Erro ao carregar a rota.");
      }
    );

    return () => unsub();
  }, [routeIdStr]);
  if (!isOnline) {
    return (
      <View style={styles.center}>
        <Ionicons name="wifi-outline" size={26} color="#111827" />
        <Text style={styles.emptyTitle}>Sem conexão</Text>
        <Text style={[styles.loadingText, { textAlign: "center" }]}>
          Conecte-se à internet para carregar a rota.
        </Text>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.9}>
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Carregando…</Text>
      </View>
    );
  }
  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={26} color="#111827" />
        <Text style={styles.emptyTitle}>Não deu pra carregar</Text>
        <Text style={[styles.loadingText, { textAlign: "center" }]}>{errorMsg}</Text>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.9}>
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!route) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={26} color="#111827" />
        <Text style={styles.emptyTitle}>Rota não encontrada</Text>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.9}>
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
        <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconBtn} activeOpacity={0.9}>
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

        <TouchableOpacity onPress={handleShare} style={styles.iconBtn} activeOpacity={0.9}>
          <Ionicons name="share-outline" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      {copied && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Link copiado</Text>
        </View>
      )}

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
            // IMAGE
            if (item.type === "image") {
              const uri = item.content || "";
              const ok = uri.startsWith("http") || uri.startsWith("file:");
              return ok ? (
                <View style={styles.mediaWrap}>
                  <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                </View>
              ) : (
                <View style={styles.invalidBox}>
                  <Text style={styles.invalidText}>Imagem inválida</Text>
                </View>
              );
            }

            // VIDEO
            if (item.type === "video") {
              const uri = item.content || "";
              const ok = uri.startsWith("http") || uri.startsWith("file:");
              return ok ? (
                <View style={styles.mediaWrap}>
                  <Video
                    source={{ uri }}
                    style={styles.video}
                    useNativeControls
                    resizeMode={"contain" as any}
                  />
                </View>
              ) : (
                <View style={styles.invalidBox}>
                  <Text style={styles.invalidText}>Vídeo inválido</Text>
                </View>
              );
            }

            // AUDIO
            if (item.type === "audio") {
              const uri = item.content || "";
              const ok = uri.startsWith("http") || uri.startsWith("file:");
              return ok ? (
                <AudioPlayer uri={uri} />
              ) : (
                <View style={styles.invalidBox}>
                  <Text style={styles.invalidText}>Áudio inválido</Text>
                </View>
              );
            }

            // TEXT
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

  // MEDIA
  mediaWrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  image: {
    width: "100%",
    height: 400,
  },
  video: {
    width: "100%",
    height: 220,
  },

  invalidBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  invalidText: { color: "#6B7280", fontWeight: "700" },

  // AUDIO PLAYER
  audioPlayer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  audioPlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  audioTimes: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  audioTimeText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
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

  toast: {
    margin: 10,
    bottom: 10,
    backgroundColor: "#1118273b",
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  toastText: {
    color: "#fff",
    fontWeight: "800",
  },
});