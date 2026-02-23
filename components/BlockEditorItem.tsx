import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Video, Audio } from "expo-av";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Slider from "@react-native-community/slider";

export type BlockType = "title" | "text" | "description" | "image" | "video" | "audio";
export type Align = "left" | "center" | "right" | "justify";
export type FontSize = "sm" | "md" | "lg";

export type Block = {
  id: string;
  type: BlockType;
  content: string;
  format?: {
    align?: Align;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    size?: FontSize;
  };
};

type Props = {
  block: Block;
  index: number;
  isFirst: boolean;
  isLast: boolean;

  onChangeContent: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: "up" | "down") => void;

  onUpdateFormat: (id: string, patch: Partial<NonNullable<Block["format"]>>) => void;
};

export default function BlockEditorItem({
  block,
  index,
  isFirst,
  isLast,
  onChangeContent,
  onRemove,
  onMove,
  onUpdateFormat,
}: Props) {
  const [showAlign, setShowAlign] = useState(false);
  const [showStyle, setShowStyle] = useState(false);

  const placeholder =
    block.type === "title" ? "Título" : block.type === "description" ? "Descrição" : "Texto";

  const align: Align = block.format?.align ?? "left";
  const bold = !!block.format?.bold;
  const italic = !!block.format?.italic;
  const underline = !!block.format?.underline;
  const size: FontSize = block.format?.size ?? "md";

  const alignIcon = useMemo(() => {
    switch (align) {
      case "center":
        return "format-align-center";
      case "right":
        return "format-align-right";
      case "justify":
        return "format-align-justify";
      default:
        return "format-align-left";
    }
  }, [align]);

  const sizeStyle = size === "sm" ? styles.sizeSm : size === "lg" ? styles.sizeLg : styles.sizeMd;

  const inputStyle = [
    styles.input,
    block.type === "title" && styles.titleInput,
    block.type === "description" && styles.descriptionInput,
    sizeStyle,
    {
      textAlign: align === "justify" ? "left" : align,
      fontWeight: bold ? "800" : "400",
      fontStyle: italic ? "italic" : "normal",
      textDecorationLine: underline ? "underline" : "none",
      lineHeight: block.type === "text" ? 22 : undefined,
    } as any,
  ];

  // =========================
  // AUDIO PLAYER (expo-av)
  // =========================
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(1);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const audioUri =
    block.type === "audio" ? (typeof block.content === "string" ? block.content : "") : "";

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
    if (!audioUri) return;

    setIsLoadingAudio(true);

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
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

  // Se trocar o áudio, descarrega o anterior
  useEffect(() => {
    if (block.type !== "audio") return;
    unloadSound();
    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUri]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      unloadSound();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========
  // Header padrão (setas + lixeira)
  // ==========
  const BlockHeader = () => (
    <View style={styles.blockHeader}>
      <View style={styles.moveButtons}>
        <TouchableOpacity
          onPress={() => onMove(index, "up")}
          disabled={isFirst}
          style={{ opacity: isFirst ? 0.35 : 1 }}
        >
          <Ionicons name="chevron-up" size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onMove(index, "down")}
          disabled={isLast}
          style={{ opacity: isLast ? 0.35 : 1 }}
        >
          <Ionicons name="chevron-down" size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.inlineToolbar}>
        {(block.type === "title" || block.type === "text" || block.type === "description") && (
          <>
            <TouchableOpacity style={styles.toolBtn} onPress={() => setShowAlign(true)}>
              <MaterialCommunityIcons name={alignIcon as any} size={18} color="#111827" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolBtn} onPress={() => setShowStyle(true)}>
              <MaterialCommunityIcons name="format-text" size={18} color="#111827" />
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => onRemove(block.id)}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ==========
  // Conteúdo do bloco (varia por tipo)
  // ==========
  const renderContent = () => {
    // IMAGE
    if (block.type === "image") {
      const uri = typeof block.content === "string" ? block.content : "";
      const ok = uri.startsWith("http");

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
    if (block.type === "video") {
      const uri = typeof block.content === "string" ? block.content : "";
      const ok = uri.startsWith("http");

      return ok ? (
        <View style={styles.mediaWrap}>
          <Video source={{ uri }} style={styles.video} useNativeControls resizeMode={"contain" as any} />
        </View>
      ) : (
        <View style={styles.invalidBox}>
          <Text style={styles.invalidText}>Vídeo inválido</Text>
        </View>
      );
    }

    // AUDIO (player completo)
    if (block.type === "audio") {
      const uri = audioUri;
      const ok = !!uri && (uri.startsWith("http") || uri.startsWith("file:"));

      if (!ok) {
        return (
          <View style={styles.invalidBox}>
            <Text style={styles.invalidText}>Áudio inválido</Text>
          </View>
        );
      }

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

    // TEXT BLOCKS
    return (
      <TextInput
        placeholder={placeholder}
        value={block.content}
        onChangeText={(text) => onChangeContent(block.id, text)}
        style={inputStyle}
        multiline
      />
    );
  };

  // ==========
  // Wrapper padrão
  // ==========
  return (
    <View style={styles.block}>
      <BlockHeader />
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
  },
  moveButtons: { flexDirection: "row", gap: 10 },
  inlineToolbar: { flexDirection: "row", alignItems: "center", gap: 10 },

  toolBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  // TEXT
  input: { fontSize: 16, color: "#121213" },
  titleInput: { fontSize: 20, fontWeight: "600", color: "#000000" },
  descriptionInput: { color: "#6B7280" },

  sizeSm: { fontSize: 13 },
  sizeMd: { fontSize: 16 },
  sizeLg: { fontSize: 18 },

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
  invalidText: { color: "#6B7280", fontWeight: "600" },

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
});
