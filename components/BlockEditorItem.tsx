import { Ionicons } from "@expo/vector-icons";
import { Video, Audio } from "expo-av";
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import CarouselBlock from "./CarouselBlock";

export type BlockType =
  | "title"
  | "text"
  | "description"
  | "image"
  | "video"
  | "audio"
  | "carousel";

export type Align = "left" | "center" | "right" | "justify";

export type Block = {
  id: string;
  type: BlockType;
  content: string;
  publicId?: string;
  format?: {
    align?: Align;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    size?: number;
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

  onOpenSettings: (id: string) => void;
};

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 28;

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export default function BlockEditorItem({
  block,
  index,
  isFirst,
  isLast,
  onChangeContent,
  onMove,
  onOpenSettings,
}: Props) {
  const placeholder =
    block.type === "title"
      ? "Título"
      : block.type === "description"
      ? "Descrição"
      : "Texto";

  const rawAlign = (block.format?.align ?? "left") as any;
  const align: Align = rawAlign === "start" ? "left" : rawAlign;

  const bold = !!block.format?.bold;
  const italic = !!block.format?.italic;
  const underline = !!block.format?.underline;

  const defaultFontSize =
    block.type === "title" ? 20 : block.type === "description" ? 15 : 16;

  const fontSize = clamp(block.format?.size ?? defaultFontSize, MIN_FONT_SIZE, MAX_FONT_SIZE);

  const fontWeight = bold
    ? ("700" as const)
    : block.type === "title"
    ? ("600" as const)
    : ("400" as const);

  const inputStyle = useMemo(
    () => [
      styles.input,
      block.type === "title" && styles.titleInput,
      block.type === "description" && styles.descriptionInput,
      {
        textAlign: align,
        fontWeight,
        fontStyle: italic ? ("italic" as const) : ("normal" as const),
        textDecorationLine: underline ? ("underline" as const) : ("none" as const),
        fontSize,
        lineHeight: Math.round(fontSize * 1.4),
      },
    ],
    [align, fontWeight, italic, underline, fontSize, block.type]
  );

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

  useEffect(() => {
    if (block.type !== "audio") return;
    unloadSound();
    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(1);
  }, [audioUri, block.type]);

  useEffect(() => {
    return () => {
      unloadSound();
    };
  }, []);

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

      <TouchableOpacity style={styles.gearBtn} onPress={() => onOpenSettings(block.id)}>
        <Ionicons name="ellipsis-horizontal" size={20} color="#111827" />
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (block.type === "carousel") {
      let images: string[] = [];

      try {
        const parsed = JSON.parse(block.content || "[]");
        images = Array.isArray(parsed)
          ? parsed.map((item: any) => (typeof item === "string" ? item : item?.url)).filter(Boolean)
          : [];
      } catch {
        images = [];
      }

      return <CarouselBlock images={images} />;
    }

    if (block.type === "image") {
      const uri = typeof block.content === "string" ? block.content : "";
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

    if (block.type === "video") {
      const uri = typeof block.content === "string" ? block.content : "";
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

    return (
      <TextInput
        placeholder={placeholder}
        value={block.content}
        onChangeText={(text) => onChangeContent(block.id, text)}
        style={inputStyle}
        multiline
        textAlignVertical="top"
      />
    );
  };

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
    gap: 10,
  },

  moveButtons: {
    flexDirection: "row",
    gap: 10,
  },

  gearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    color: "#121213",
    padding: 0,
    margin: 0,
  },

  titleInput: {
    color: "#000000",
  },

  descriptionInput: {
    color: "#6B7280",
  },

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

  invalidText: {
    color: "#6B7280",
    fontWeight: "600",
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