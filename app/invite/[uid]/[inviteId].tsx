import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  TextStyle,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/src/firebaseConfig";
import { Video, Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";

type BlockType = "title" | "text" | "description" | "image" | "video" | "audio";
type Align = "left" | "center" | "right" | "justify";

type Block = {
  id: string;
  type?: BlockType;
  content: string;
  format?: {
    align?: Align;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    size?: "sm" | "md" | "lg";
  };
};

type InviteStatus = "pending" | "accepted" | "declined";
type RouteStatus = "draft" | "shared" | "accepted" | "scheduled" | "completed";
type ScheduleStatus = "none" | "pending" | "done";

type InviteData = {
  status?: InviteStatus;
  routeId?: string;
  routeSnapshot?: {
    title?: string;
    clientName?: string;
    blocks?: Block[];
  };
};

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

    try {
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
    } finally {
      setIsLoadingAudio(false);
    }
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

  useEffect(() => {
    unloadSound();
    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  useEffect(() => {
    return () => {
      unloadSound();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ratio = Math.min(1, Math.max(0, positionMillis / (durationMillis || 1)));

  return (
    <View style={styles.audioPlayer}>
      <TouchableOpacity
        style={styles.audioPlayBtn}
        onPress={togglePlay}
        disabled={isLoadingAudio}
      >
        <Ionicons name={isPlaying ? "pause" : "play"} size={20} color="#111827" />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Slider
          value={ratio}
          onSlidingComplete={seekTo}
          minimumValue={0}
          maximumValue={1}
        />
        <View style={styles.audioTimes}>
          <Text style={styles.audioTimeText}>{fmtTime(positionMillis)}</Text>
          <Text style={styles.audioTimeText}>{fmtTime(durationMillis)}</Text>
        </View>
      </View>

      <Ionicons name="mic-outline" size={18} color="#111827" />
    </View>
  );
}

export default function InvitePage() {
  const { uid, inviteId } = useLocalSearchParams<{
    uid: string;
    inviteId: string;
  }>();

  const uidStr = useMemo(() => (Array.isArray(uid) ? uid[0] : uid), [uid]);
  const inviteIdStr = useMemo(
    () => (Array.isArray(inviteId) ? inviteId[0] : inviteId),
    [inviteId]
  );

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        if (!uidStr || !inviteIdStr) {
          setLoading(false);
          return;
        }

        const ref = doc(db, "users", uidStr, "route_invites", inviteIdStr);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setInvite(null);
          setLoading(false);
          return;
        }

        setInvite(snap.data() as InviteData);
      } catch (error) {
        console.log("Erro ao carregar convite:", error);
        setInvite(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [uidStr, inviteIdStr]);

 async function respond(status: "accepted" | "declined") {
    try {
      if (!uidStr || !inviteIdStr || submitting) return;

      setSubmitting(true);

      const inviteRef = doc(db, "users", uidStr, "route_invites", inviteIdStr);

      await updateDoc(inviteRef, {
        status,
        respondedAt: serverTimestamp(),
      });

      setInvite((prev) => (prev ? { ...prev, status } : prev));
    } catch (error) {
      console.log("Erro ao responder convite:", error);
    } finally {
      setSubmitting(false);
    }
  }

  function styleFromFormat(item: Block): TextStyle {
    const f = item.format;
    const fontSize = f?.size === "sm" ? 14 : f?.size === "lg" ? 20 : undefined;
    const rawAlign = (f?.align ?? "left") as any;
    const align: Align = rawAlign === "start" ? "left" : rawAlign;

    return {
      textAlign: align,
      fontWeight: f?.bold ? "700" : undefined,
      fontStyle: f?.italic ? "italic" : undefined,
      textDecorationLine: f?.underline ? "underline" : undefined,
      fontSize,
    };
  }

  function isHttpUrl(value: string) {
    return value.startsWith("http://") || value.startsWith("https://");
  }

  function inferType(item: Block): BlockType {
    const explicit = item.type;
    const uri = String(item.content || "").trim().toLowerCase();

    if (explicit === "image" || explicit === "video" || explicit === "audio") {
      return explicit;
    }

    if (explicit === "title" || explicit === "description") {
      return explicit;
    }

    if (!uri) return "text";

    if (uri.includes("/image/upload/")) return "image";

    if (uri.includes("/video/upload/")) {
      if (
        uri.includes(".mp3") ||
        uri.includes(".wav") ||
        uri.includes(".ogg") ||
        uri.includes(".m4a") ||
        uri.includes(".aac")
      ) {
        return "audio";
      }
      return "video";
    }

    if (uri.includes("/raw/upload/")) return "audio";

    if (
      uri.includes(".jpg") ||
      uri.includes(".jpeg") ||
      uri.includes(".png") ||
      uri.includes(".webp") ||
      uri.includes(".gif") ||
      uri.includes(".bmp") ||
      uri.includes(".svg")
    ) {
      return "image";
    }

    if (
      uri.includes(".mp4") ||
      uri.includes(".mov") ||
      uri.includes(".webm") ||
      uri.includes(".m4v")
    ) {
      return "video";
    }

    if (
      uri.includes(".mp3") ||
      uri.includes(".wav") ||
      uri.includes(".ogg") ||
      uri.includes(".m4a") ||
      uri.includes(".aac")
    ) {
      return "audio";
    }

    return "text";
  }

  function renderWebImage(uri: string, key: string) {
    return (
      <View key={key} style={styles.mediaWrap}>
        {React.createElement("img" as any, {
          src: uri,
          style: {
            width: "100%",
            height: 400,
            objectFit: "cover",
            display: "block",
          },
        })}
      </View>
    );
  }

  function renderWebVideo(uri: string, key: string) {
    return (
      <View key={key} style={styles.mediaWrap}>
        {React.createElement("video" as any, {
          src: uri,
          controls: true,
          playsInline: true,
          style: {
            width: "100%",
            height: 220,
            backgroundColor: "#000",
            display: "block",
          },
        })}
      </View>
    );
  }

  function renderWebAudio(uri: string, key: string) {
    return (
      <View key={key} style={styles.audioWebWrap}>
        {React.createElement("audio" as any, {
          src: uri,
          controls: true,
          style: {
            width: "100%",
            display: "block",
          },
        })}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!invite) {
    return (
      <View style={styles.center}>
        <Text style={styles.invalidTitle}>Link inválido</Text>
        <Text style={styles.invalidSubtitle}>Esse convite não foi encontrado.</Text>
      </View>
    );
  }

  const route = invite.routeSnapshot || {};
  const blocks = (route.blocks || []).filter(
    (b) => (b.content || "").toString().trim().length > 0
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.paper}>
        <Text style={styles.title}>{route.title || "Rota"}</Text>

        {!!route.clientName && <Text style={styles.subtitle}>{route.clientName}</Text>}

        <View style={styles.divider} />

        {blocks.length > 0 ? (
          blocks.map((item) => {
            const actualType = inferType(item);
            const uri = (item.content || "").trim();

            if (actualType === "image") {
              if (!isHttpUrl(uri)) {
                return (
                  <View key={item.id} style={styles.invalidBox}>
                    <Text style={styles.invalidText}>Imagem inválida</Text>
                  </View>
                );
              }

              if (Platform.OS === "web") {
                return renderWebImage(uri, item.id);
              }

              return (
                <View key={item.id} style={styles.mediaWrap}>
                  <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                </View>
              );
            }

            if (actualType === "video") {
              if (!isHttpUrl(uri)) {
                return (
                  <View key={item.id} style={styles.invalidBox}>
                    <Text style={styles.invalidText}>Vídeo inválido</Text>
                  </View>
                );
              }

              if (Platform.OS === "web") {
                return renderWebVideo(uri, item.id);
              }

              return (
                <View key={item.id} style={styles.mediaWrap}>
                  <Video
                    source={{ uri }}
                    style={styles.video}
                    useNativeControls
                    resizeMode={"contain" as any}
                  />
                </View>
              );
            }

            if (actualType === "audio") {
              if (!isHttpUrl(uri)) {
                return (
                  <View key={item.id} style={styles.invalidBox}>
                    <Text style={styles.invalidText}>Áudio inválido</Text>
                  </View>
                );
              }

              if (Platform.OS === "web") {
                return renderWebAudio(uri, item.id);
              }

              return (
                <View key={item.id}>
                  <AudioPlayer uri={uri} />
                </View>
              );
            }

            const inline = styleFromFormat(item);

            if (actualType === "title") {
              return (
                <View key={item.id} style={styles.textBlock}>
                  <Text style={[styles.readTitle, inline]}>{item.content}</Text>
                </View>
              );
            }

            if (actualType === "description") {
              return (
                <View key={item.id} style={styles.textBlock}>
                  <Text style={[styles.readDescription, inline]}>{item.content}</Text>
                </View>
              );
            }

            return (
              <View key={item.id} style={styles.textBlock}>
                <Text style={[styles.readText, inline]}>{item.content}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>Nenhum conteúdo disponível.</Text>
        )}
      </View>

      {invite.status === "pending" ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.accept, submitting && styles.btnDisabled]}
            onPress={() => respond("accepted")}
            disabled={submitting}
          >
            <Text style={styles.btnText}>{submitting ? "Enviando..." : "Aceitar"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.decline, submitting && styles.btnDisabled]}
            onPress={() => respond("declined")}
            disabled={submitting}
          >
            <Text style={styles.btnText}>{submitting ? "Enviando..." : "Recusar"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.status}>
          {invite.status === "accepted" ? "Rota aceita ✅" : "Rota recusada ❌"}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  content: {
    padding: 16,
    paddingBottom: 32,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 24,
  },

  paper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 14,
  },

  textBlock: {
    marginBottom: 12,
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

  mediaWrap: {
    marginBottom: 14,
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
    backgroundColor: "#000",
  },

  invalidBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },

  invalidText: {
    color: "#6B7280",
    fontWeight: "700",
  },

  invalidTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  invalidSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    fontStyle: "italic",
  },

  audioPlayer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
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

  audioWebWrap: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  btnDisabled: {
    opacity: 0.7,
  },

  accept: {
    backgroundColor: "#16A34A",
  },

  decline: {
    backgroundColor: "#DC2626",
  },

  btnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  status: {
    marginTop: 16,
    textAlign: "center",
    fontWeight: "800",
    color: "#111827",
  },
});