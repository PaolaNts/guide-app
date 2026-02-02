// src/components/BlockEditorItem.tsx
import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal, Pressable } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export type BlockType = "title" | "text" | "description";
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
    // ícones do MaterialCommunityIcons
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
      textAlign: align === "justify" ? "left" : align, // RN não justifica perfeito
      fontWeight: bold ? "800" : "400",
      fontStyle: italic ? "italic" : "normal",
      textDecorationLine: underline ? "underline" : "none",
      lineHeight: block.type === "text" ? 22 : undefined,
    } as any,
  ];

  return (
    <View style={styles.block}>
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
          <TouchableOpacity style={styles.toolBtn} onPress={() => setShowAlign(true)} activeOpacity={0.85}>
            <MaterialCommunityIcons name={alignIcon as any} size={18} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolBtn} onPress={() => setShowStyle(true)} activeOpacity={0.85}>
            <MaterialCommunityIcons name="format-text" size={18} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onRemove(block.id)} activeOpacity={0.85}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        placeholder={placeholder}
        value={block.content}
        onChangeText={(text) => onChangeContent(block.id, text)}
        style={inputStyle}
        multiline
      />

      {/* MENU: Alinhamento */}
      <Modal transparent visible={showAlign} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAlign(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>Alinhamento</Text>

            <View style={styles.modalGrid}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  onUpdateFormat(block.id, { align: "left" });
                  setShowAlign(false);
                }}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons name="format-align-left" size={20} color="#111827" />
                <Text style={styles.modalBtnText}>Esquerda</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  onUpdateFormat(block.id, { align: "center" });
                  setShowAlign(false);
                }}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons name="format-align-center" size={20} color="#111827" />
                <Text style={styles.modalBtnText}>Centro</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  onUpdateFormat(block.id, { align: "right" });
                  setShowAlign(false);
                }}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons name="format-align-right" size={20} color="#111827" />
                <Text style={styles.modalBtnText}>Direita</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  onUpdateFormat(block.id, { align: "justify" });
                  setShowAlign(false);
                }}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons name="format-align-justify" size={20} color="#111827" />
                <Text style={styles.modalBtnText}>Justificar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalBtn, { justifyContent: "center", marginTop: 12 }]}
              onPress={() => setShowAlign(false)}
              activeOpacity={0.9}
            >
              <Text style={[styles.modalBtnText, { color: "#374151" }]}>Fechar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MENU: Estilo */}
      <Modal transparent visible={showStyle} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowStyle(false)}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>Estilo</Text>

            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => onUpdateFormat(block.id, { bold: !bold })}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons name="format-bold" size={20} color="#111827" />
                <Text style={styles.toggleText}>Negrito</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => onUpdateFormat(block.id, { italic: !italic })}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons name="format-italic" size={20} color="#111827" />
                <Text style={styles.toggleText}>Itálico</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => onUpdateFormat(block.id, { underline: !underline })}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons name="format-underline" size={20} color="#111827" />
                <Text style={styles.toggleText}>Subl.</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Tamanho</Text>
            <View style={styles.sizeRow}>
              <TouchableOpacity
                style={styles.sizeBtn}
                onPress={() => onUpdateFormat(block.id, { size: "sm" })}
                activeOpacity={0.9}
              >
                <Text style={[styles.sizeBtnText, { fontSize: 12 }]}>Peq.</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sizeBtn}
                onPress={() => onUpdateFormat(block.id, { size: "md" })}
                activeOpacity={0.9}
              >
                <Text style={[styles.sizeBtnText, { fontSize: 14 }]}>Méd.</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sizeBtn}
                onPress={() => onUpdateFormat(block.id, { size: "lg" })}
                activeOpacity={0.9}
              >
                <Text style={[styles.sizeBtnText, { fontSize: 16 }]}>Grd.</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalBtn, { justifyContent: "center", marginTop: 12 }]}
              onPress={() => setShowStyle(false)}
              activeOpacity={0.9}
            >
              <Text style={[styles.modalBtnText, { color: "#374151" }]}>Fechar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    marginBottom: 6,
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

  input: { fontSize: 16, color: "#121213" },
  titleInput: { fontSize: 20, fontWeight: "600", color: "#000000" },
  descriptionInput: { color: "#6B7280" },

  sizeSm: { fontSize: 13 },
  sizeMd: { fontSize: 16 },
  sizeLg: { fontSize: 18 },

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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },

  modalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexGrow: 1,
  },
  modalBtnText: { fontWeight: "900", color: "#111827" },

  toggleRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 12,
    borderRadius: 14,
  },
  toggleText: { fontWeight: "900", color: "#111827" },

  sectionLabel: { marginTop: 12, marginBottom: 8, color: "#6B7280", fontWeight: "800" },
  sizeRow: { flexDirection: "row", gap: 10 },
  sizeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sizeBtnText: { fontWeight: "900", color: "#111827" },
});
