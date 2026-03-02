import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Video, Audio } from "expo-av";
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";

export type BlockType = "title" | "text" | "description" | "image" | "video" | "audio";
export type Align = "left" | "center" | "right" | "justify";
export type FontSize = "sm" | "md" | "lg";

export type Block = {
  id: string;
  type: BlockType;
  content: string;
  format?: {
    align?: Align; // se vier "start", normalizamos abaixo
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
  const isTextual = block.type === "title" || block.type === "text" || block.type === "description";
  const [settingsOpen, setSettingsOpen] = useState(false);

  const placeholder =
    block.type === "title" ? "Título" : block.type === "description" ? "Descrição" : "Texto";

  // ========
  // FORMAT
  // ========
  const rawAlign = (block.format?.align ?? "left") as any;
  const align: Align = rawAlign === "start" ? "left" : rawAlign;

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

  const inputStyle = useMemo(
    () => [
      styles.input,
      block.type === "title" && styles.titleInput,
      block.type === "description" && styles.descriptionInput,
      sizeStyle,
      {
        textAlign: align,
        fontWeight: bold ? ("700" as const) : ("400" as const),
        fontStyle: italic ? ("italic" as const) : ("normal" as const),
        textDecorationLine: underline ? ("underline" as const) : ("none" as const),
        lineHeight: block.type === "text" ? 22 : undefined,
      },
    ],
    [align, bold, italic, underline, sizeStyle, block.type]
  );

  // =========================
  // ACTIONS (FORMAT)
  // =========================
  const setAlign = (value: Align) => onUpdateFormat(block.id, { align: value });
  const setSize = (value: FontSize) => onUpdateFormat(block.id, { size: value });

  const toggleBold = () => onUpdateFormat(block.id, { bold: !bold });
  const toggleItalic = () => onUpdateFormat(block.id, { italic: !italic });
  const toggleUnderline = () => onUpdateFormat(block.id, { underline: !underline });

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

  useEffect(() => {
    if (block.type !== "audio") return;
    unloadSound();
    setIsPlaying(false);
    setPositionMillis(0);
    setDurationMillis(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUri]);

  useEffect(() => {
    return () => {
      unloadSound();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // SETTINGS SHEET (MODAL)
  // =========================
  const SettingsSheet = () => (
    <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
      {/* backdrop */}
      <Pressable style={styles.backdrop} onPress={() => setSettingsOpen(false)} />

      {/* sheet */}
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Configurações do bloco</Text>
          <TouchableOpacity onPress={() => setSettingsOpen(false)} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* TEXT OPTIONS */}
        {isTextual && (
          <>
            <Text style={styles.sectionTitle}>Texto</Text>

            <View style={styles.row}>
              <OptionChip
                label="Negrito"
                active={bold}
                icon={<MaterialCommunityIcons name="format-bold" size={16} color="#111827" />}
                onPress={toggleBold}
              />
              <OptionChip
                label="Itálico"
                active={italic}
                icon={<MaterialCommunityIcons name="format-italic" size={16} color="#111827" />}
                onPress={toggleItalic}
              />
              <OptionChip
                label="Sublinhar"
                active={underline}
                icon={<MaterialCommunityIcons name="format-underline" size={16} color="#111827" />}
                onPress={toggleUnderline}
              />
            </View>

            <Text style={styles.subTitle}>Alinhamento</Text>
            <View style={styles.row}>
              <OptionChip
                label="Esq."
                active={align === "left"}
                icon={<MaterialCommunityIcons name="format-align-left" size={16} color="#111827" />}
                onPress={() => setAlign("left")}
              />
              <OptionChip
                label="Centro"
                active={align === "center"}
                icon={<MaterialCommunityIcons name="format-align-center" size={16} color="#111827" />}
                onPress={() => setAlign("center")}
              />
              <OptionChip
                label="Dir."
                active={align === "right"}
                icon={<MaterialCommunityIcons name="format-align-right" size={16} color="#111827" />}
                onPress={() => setAlign("right")}
              />
              <OptionChip
                label="Just."
                active={align === "justify"}
                icon={<MaterialCommunityIcons name="format-align-justify" size={16} color="#111827" />}
                onPress={() => setAlign("justify")}
              />
            </View>

            <Text style={styles.subTitle}>Tamanho</Text>
            <View style={styles.row}>
              <OptionChip label="P" active={size === "sm"} onPress={() => setSize("sm")} />
              <OptionChip label="M" active={size === "md"} onPress={() => setSize("md")} />
              <OptionChip label="G" active={size === "lg"} onPress={() => setSize("lg")} />
            </View>
          </>
        )}

        {/* GENERAL OPTIONS */}
        <Text style={styles.sectionTitle}>Ações</Text>
        <View style={styles.row}>
          <OptionChip
            label="Excluir bloco"
            danger
            icon={<Ionicons name="trash-outline" size={16} color="#EF4444" />}
            onPress={() => {
              setSettingsOpen(false);
              onRemove(block.id);
            }}
          />
        </View>

        <View style={{ height: 6 }} />
      </View>
    </Modal>
  );

  // =========================
  // HEADER (clean)
  // =========================
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

      <View style={styles.headerRight}>
       

        <TouchableOpacity style={styles.gearBtn} onPress={() => setSettingsOpen(true)}>
          <Ionicons name="settings-outline" size={20} color="#111827" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // =========================
  // CONTENT
  // =========================
  const renderContent = () => {
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
          <Video source={{ uri }} style={styles.video} useNativeControls resizeMode={"contain" as any} />
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
      <SettingsSheet />
    </View>
  );
}

// =========================
// REUSABLE CHIP
// =========================
function OptionChip({
  label,
  active,
  icon,
  danger,
  onPress,
}: {
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        active && styles.chipActive,
        danger && styles.chipDanger,
        danger && active && styles.chipDangerActive,
      ]}
    >
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
      <Text
        style={[
          styles.chipText,
          active && styles.chipTextActive,
          danger && styles.chipTextDanger,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  // HEADER
  blockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
    gap: 10,
  },
  moveButtons: { flexDirection: "row", gap: 10 },

  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
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

  summaryPills: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  pill: {
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  pillText: { fontSize: 11, fontWeight: "800", color: "#111827" },

  // TEXT
  input: {
    fontSize: 16,
    color: "#121213",
    padding: 0,
    margin: 0,
  },
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
  image: { width: "100%", height: 400 },
  video: { width: "100%", height: 220 },

  invalidBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  invalidText: { color: "#6B7280", fontWeight: "600" },

  // AUDIO
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
  audioTimes: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  audioTimeText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },

  // MODAL / SHEET
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  subTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  // CHIPS
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: {
    borderColor: "#111827",
    backgroundColor: "#FFFFFF",
  },
  chipDanger: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
  },
  chipDangerActive: {
    borderColor: "#EF4444",
    backgroundColor: "#FFFFFF",
  },
  chipText: { fontSize: 13, fontWeight: "700", color: "#111827" },
  chipTextActive: { color: "#111827" },
  chipTextDanger: { color: "#EF4444" },
});