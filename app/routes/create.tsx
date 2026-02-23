import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/src/firebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import BlockEditorItem, { Block, BlockType } from "../../components/BlockEditorItem";

import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { uploadMediaCloudinary } from "@/src/services/uploadMediaCloudinary";

function makeId() {
  // @ts-ignore
  return global?.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

type RouteDoc = {
  title?: string;
  clientName?: string;
  preview?: string;
  blocks?: Block[];
  createdAt?: any;
  updatedAt?: any;
};

export default function CreateRoute() {
  const router = useRouter();

  // ✅ se vier id, é edição
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [routeTitle, setRouteTitle] = useState("");
  const [clientName, setClientName] = useState("");

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showOptions, setShowOptions] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);

  // ✅ separa os carregamentos
  const [isSaving, setIsSaving] = useState(false); // salvar (Firestore)
  const [isUploading, setIsUploading] = useState(false); // upload mídia
  const [isLoadingRoute, setIsLoadingRoute] = useState(false); // carregar rota p/ editar

  // ✅ modal excluir
 

  async function ensureLogged() {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setMsg("Você precisa estar logada.");
      return null;
    }
    return user;
  }

  // ✅ se for editar, carrega do Firestore
  useEffect(() => {
    if (!isEdit) return;

    const run = async () => {
      setMsg(null);
      const user = await ensureLogged();
      if (!user) return;

      try {
        setIsLoadingRoute(true);

        const ref = doc(db, "users", user.uid, "routes", String(id));
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setMsg("Rota não encontrada.");
          return;
        }

        const data = snap.data() as RouteDoc;

        setRouteTitle(data.title ?? "");
        setClientName(data.clientName ?? "");

        const safeBlocks = (data.blocks ?? []).map((b) => ({
          id: b.id ?? makeId(),
          type: b.type,
          content: b.content ?? "",
          format: {
            align: b.format?.align ?? "left",
            bold: !!b.format?.bold,
            italic: !!b.format?.italic,
            underline: !!b.format?.underline,
            size: b.format?.size ?? "md",
          },
        }));

        setBlocks(safeBlocks);
      } catch (e) {
        console.log("Erro ao carregar rota:", e);
        setMsg("Não foi possível carregar a rota agora.");
      } finally {
        setIsLoadingRoute(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function addBlock(type: BlockType) {
    setMsg(null);
    setBlocks((prev) => [
      ...prev,
      {
        id: makeId(),
        type,
        content: "",
        format: { align: "left", bold: false, italic: false, underline: false, size: "md" },
      },
    ]);
  }

  function updateBlock(id: string, value: string) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content: value } : b)));
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function moveBlock(index: number, direction: "up" | "down") {
    setBlocks((prev) => {
      const newBlocks = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newBlocks.length) return prev;

      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
      return newBlocks;
    });
  }

  const normalizedBlocks = useMemo(() => {
    return blocks
      .map((b) => ({
        ...b,
        content: (b.content ?? "").trim(),
        format: {
          align: b.format?.align ?? "left",
          bold: !!b.format?.bold,
          italic: !!b.format?.italic,
          underline: !!b.format?.underline,
          size: b.format?.size ?? "md",
        },
      }))
      .filter((b) => b.content.length > 0);
  }, [blocks]);

  const canSave = useMemo(() => {
    return (
      routeTitle.trim().length >= 3 &&
      normalizedBlocks.length > 0 &&
      !isSaving &&
      !isUploading &&
      !isLoadingRoute
    );
  }, [routeTitle, normalizedBlocks.length, isSaving, isUploading, isLoadingRoute]);

  async function saveRoute() {
    setMsg(null);

    const user = await ensureLogged();
    if (!user) return;

    if (routeTitle.trim().length < 3) {
      setMsg("Escolha um título para a rota (mín. 3 caracteres).");
      return;
    }

    if (normalizedBlocks.length === 0) {
      setMsg("Adicione pelo menos um bloco preenchido.");
      return;
    }

    try {
      setIsSaving(true);

      const firstTitle = normalizedBlocks.find((b) => b.type === "title")?.content;
      const preview = firstTitle ?? normalizedBlocks[0]?.content.slice(0, 80) ?? "";

      if (!isEdit) {
        await addDoc(collection(db, "users", user.uid, "routes"), {
          title: routeTitle.trim(),
          clientName: clientName.trim(),
          preview,
          blocks: normalizedBlocks,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const ref = doc(db, "users", user.uid, "routes", String(id));
        await updateDoc(ref, {
          title: routeTitle.trim(),
          clientName: clientName.trim(),
          preview,
          blocks: normalizedBlocks,
          updatedAt: serverTimestamp(),
        });
      }

      router.back();
    } catch (error) {
      console.log("Erro ao salvar rota:", error);
      setMsg("Não foi possível salvar agora. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }



 

  function pushMediaBlock(type: "image" | "video" | "audio", url: string) {
    setBlocks((prev) => [
      ...prev,
      {
        id: makeId(),
        type,
        content: url,
        format: { align: "left", bold: false, italic: false, underline: false, size: "md" },
      },
    ]);
  }

  async function addImageBlock() {
    setMsg(null);
    const user = await ensureLogged();
    if (!user) return;

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setMsg("Permissão de galeria negada.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;

      setIsUploading(true);

      const { url } = await uploadMediaCloudinary({
        uri,
        kind: "photos",
      });

      pushMediaBlock("image", url);
    } catch (e: any) {
      console.log("Erro upload imagem:", e);
      setMsg(e?.message ? String(e.message) : "Erro ao enviar imagem.");
    } finally {
      setIsUploading(false);
    }
  }

  async function addVideoBlock() {
    setMsg(null);
    const user = await ensureLogged();
    if (!user) return;

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setMsg("Permissão de galeria negada.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;

      setIsUploading(true);

      const { url } = await uploadMediaCloudinary({
        uri,
        kind: "videos",
      });

      pushMediaBlock("video", url);
      setShowOptions(false);
    } catch (e) {
      console.log("Erro upload video:", e);
      setMsg("Erro ao enviar vídeo.");
    } finally {
      setIsUploading(false);
    }
  }

  async function addAudioBlock() {
    setMsg(null);
    const user = await ensureLogged();
    if (!user) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;

      setIsUploading(true);

      const { url } = await uploadMediaCloudinary({
        uri,
        kind: "audios",
      });

      pushMediaBlock("audio", url);
      setShowOptions(false);
    } catch (e) {
      console.log("Erro upload audio:", e);
      setMsg("Erro ao enviar áudio.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <LinearGradient
          colors={["#87a2eb9f", "#c581c960"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.container2}
        >
          <View style={{ alignItems: "center", width: "95%" }}>
            <Text style={styles.header}>{isEdit ? "EDITAR ROTA" : "NOVA ROTA"}</Text>
          </View>

          {msg && <Text style={styles.msg}>{msg}</Text>}

          {isLoadingRoute ? (
            <View style={{ marginTop: 14 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <Text style={styles.label}>Título da rota</Text>
              <TextInput
                value={routeTitle}
                onChangeText={setRouteTitle}
                placeholder="Ex.: Centro histórico + museus"
                style={styles.routeTitleInput}
                returnKeyType="done"
              />

              <Text style={styles.label}>Cliente</Text>
              <TextInput
                value={clientName}
                onChangeText={setClientName}
                placeholder="Ex.: Agência XPTO / Maria Silva"
                style={styles.routeTitleInput}
              />

              <FlatList
                data={blocks}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 260 }}
                ListEmptyComponent={
                  <View style={{ alignItems: "center" }}>
                    <Text style={styles.empty}>Adicione blocos para montar sua rota</Text>
                  </View>
                }
                renderItem={({ item, index }) => (
                  <BlockEditorItem
                    block={item}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === blocks.length - 1}
                    onChangeContent={updateBlock}
                    onRemove={removeBlock}
                    onMove={moveBlock}
                    onUpdateFormat={(id, patch) =>
                      setBlocks((prev) =>
                        prev.map((b) =>
                          b.id === id
                            ? {
                                ...b,
                                format: {
                                  align: "left",
                                  bold: false,
                                  italic: false,
                                  underline: false,
                                  size: "md",
                                  ...b.format,
                                  ...patch,
                                },
                              }
                            : b
                        )
                      )
                    }
                  />
                )}
              />
            </>
          )}

          {/* Action bar fixa */}
          <View style={styles.bottomDock}>
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => addBlock("title")}>
                <Ionicons name="text-outline" size={22} />
                <Text style={styles.actionLabel}>Título</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => addBlock("text")}>
                <Ionicons name="document-text-outline" size={22} />
                <Text style={styles.actionLabel}>Texto</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => addBlock("description")}>
                <Ionicons name="reader-outline" size={22} />
                <Text style={styles.actionLabel}>Descrição</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={addImageBlock}>
                <Ionicons name="image-outline" size={22} />
                <Text style={styles.actionLabel}>Imagem</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => setMsg("Opção de mapa (em breve).")}>
                <Ionicons name="map-outline" size={22} />
                <Text style={styles.actionLabel}>Mapa</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => setShowOptions(true)}>
                <Ionicons name="add-circle-outline" size={24} />
                <Text style={styles.actionLabel}>Mais</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.save, !canSave && styles.saveDisabled]}
              onPress={saveRoute}
              disabled={!canSave}
              activeOpacity={0.9}
            >
              {isSaving || isUploading ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.saveText}>{isEdit ? "Salvar alterações" : "Salvar rota"}</Text>
              )}
            </TouchableOpacity>

            

            <TouchableOpacity style={styles.back} onPress={() => router.back()}>
              <Text style={{ opacity: isSaving || isUploading ? 0.6 : 1 }}>Voltar</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom sheet "Mais" */}
          <Modal transparent visible={showOptions} animationType="slide">
            <Pressable style={styles.sheetOverlay} onPress={() => setShowOptions(false)}>
              <Pressable style={styles.sheet} onPress={() => {}}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Mais opções</Text>

                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => {
                    setMsg("Inserir lista (em breve).");
                    setShowOptions(false);
                  }}
                >
                  <Ionicons name="list-outline" size={20} />
                  <Text style={styles.sheetItemText}>Inserir lista</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => {
                    setMsg("Adicionar ponto no mapa (em breve).");
                    setShowOptions(false);
                  }}
                >
                  <Ionicons name="pin-outline" size={20} />
                  <Text style={styles.sheetItemText}>Adicionar ponto no mapa</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sheetItem} onPress={addAudioBlock}>
                  <Ionicons name="mic-outline" size={20} />
                  <Text style={styles.sheetItemText}>Áudio</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sheetItem} onPress={addVideoBlock}>
                  <Ionicons name="videocam-outline" size={20} />
                  <Text style={styles.sheetItemText}>Vídeo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sheetItem, { justifyContent: "center" }]}
                  onPress={() => setShowOptions(false)}
                >
                  <Text style={{ fontWeight: "700", color: "#6B7280" }}>Fechar</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

         
        </LinearGradient>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  container2: { flex: 1, padding: 10 },
  header: { fontSize: 22, fontWeight: "600", marginBottom: 10, fontFamily: "Inter" },

  label: { marginBottom: 6, fontWeight: "500", fontSize: 16, fontFamily: "Inter" },
  routeTitleInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 8,
    backgroundColor: "#fffffff1",
    color: "#1a1919",
  },

  msg: { color: "#B00020", marginBottom: 8 },
  empty: { color: "#6B7280", marginTop: 16 },

  bottomDock: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 12,
  },

  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  actionLabel: { marginTop: 4, fontSize: 12, fontWeight: "600", color: "#111827" },

  save: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 10,
    marginTop: 6,
    alignItems: "center",
  },
  saveDisabled: { opacity: 0.55 },
  saveText: { color: "#111111a6", textAlign: "center", fontWeight: "600" },

  deleteBtn: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  deleteText: { color: "#B00020", fontWeight: "800" },

  back: { marginTop: 10, alignItems: "center" },

  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "white",
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10 },
  sheetItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 14,
  },
  sheetItemText: { fontSize: 15, fontWeight: "600" },

  // ✅ confirmação excluir
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  confirmCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
    color: "#111827",
  },
  confirmText: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 14,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  confirmBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: 110,
    alignItems: "center",
  },
  confirmCancel: {
    backgroundColor: "#F3F4F6",
  },
  confirmDelete: {
    backgroundColor: "#111827",
  },
  confirmCancelText: {
    fontWeight: "800",
    color: "#111827",
  },
  confirmDeleteText: {
    fontWeight: "800",
    color: "#fff",
  },
});