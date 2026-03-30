import { db } from "@/src/firebaseConfig";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BlockEditorItem, { Align, Block, BlockType } from "../../components/BlockEditorItem";

import { uploadMediaCloudinary } from "@/src/services/uploadMediaCloudinary";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnline } from "@/hooks/useOnline";
import { globalStyles } from "@/mystyles/global";
import Slider from "@react-native-community/slider";

function makeId() {
  // @ts-ignore
  return global?.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

type RouteStatus = "draft" | "shared" | "accepted" | "scheduled" | "completed";
type ScheduleStatus = "none" | "pending" | "done";

type RouteDoc = {
  title?: string;
  clientName?: string;
  preview?: string;
  blocks?: Block[];
  status?: RouteStatus;
  scheduleStatus?: ScheduleStatus;
  acceptedAt?: any;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

type CarouselImage = {
  id: string;
  url: string;
  publicId: string | null;
};

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 28;

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export default function CreateRoute() {
  const router = useRouter();
  const isOnline = useOnline();

  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [routeTitle, setRouteTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [metaOpen, setMetaOpen] = useState(false);

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [settingsBlockId, setSettingsBlockId] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);

  const MAX_CAROUSEL_IMAGES = 6;

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const insets = useSafeAreaInsets();
  const BOTTOM_BAR_HEIGHT = 72;

  async function ensureLogged() {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setMsg("Você precisa estar logado.");
      return null;
    }
    return user;
  }

  useEffect(() => {
    if (!isEdit || !isOnline) return;

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
          publicId: b.publicId,
          format: {
            align: b.format?.align ?? "left",
            bold: !!b.format?.bold,
            italic: !!b.format?.italic,
            underline: !!b.format?.underline,
            size: b.format?.size ?? 16,
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
  }, [id, isEdit, isOnline]);

  function addBlock(type: BlockType) {
    setMsg(null);
    setBlocks((prev) => [
      ...prev,
      {
        id: makeId(),
        type,
        content: "",
        format: { align: "left", bold: false, italic: false, underline: false, size: 16 },
      },
    ]);
    setShowOptions(false);
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

  function updateBlockFormat(
    id: string,
    patch: Partial<NonNullable<Block["format"]>>
  ) {
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
                size: 16,
                ...b.format,
                ...patch,
              },
            }
          : b
      )
    );
  }

  const normalizedBlocks = useMemo(() => {
    return blocks
      .map((b) => ({
        ...b,
        content: typeof b.content === "string" ? b.content.trim() : "",
        format: {
          align: b.format?.align ?? "left",
          bold: !!b.format?.bold,
          italic: !!b.format?.italic,
          underline: !!b.format?.underline,
          size: b.format?.size ?? 16,
        },
      }))
      .filter((b) => {
        if (b.type === "image" || b.type === "video" || b.type === "audio" || b.type === "carousel") {
          return !!b.content;
        }
        return b.content.length > 0;
      });
  }, [blocks]);

  const canSave = useMemo(() => {
    return normalizedBlocks.length > 0 && !isSaving && !isUploading && !isLoadingRoute;
  }, [normalizedBlocks.length, isSaving, isUploading, isLoadingRoute]);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === settingsBlockId) ?? null,
    [blocks, settingsBlockId]
  );

  const selectedAlign: Align = selectedBlock?.format?.align ?? "left";
  const selectedBold = !!selectedBlock?.format?.bold;
  const selectedItalic = !!selectedBlock?.format?.italic;
  const selectedUnderline = !!selectedBlock?.format?.underline;

  const selectedDefaultFontSize =
    selectedBlock?.type === "title"
      ? 20
      : selectedBlock?.type === "description"
      ? 15
      : 16;

  const selectedFontSize = clamp(
    selectedBlock?.format?.size ?? selectedDefaultFontSize,
    MIN_FONT_SIZE,
    MAX_FONT_SIZE
  );

  const selectedIsTextual =
    selectedBlock?.type === "title" ||
    selectedBlock?.type === "text" ||
    selectedBlock?.type === "description";

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
          status: "draft",
          scheduleStatus: "none",
          acceptedAt: null,
          scheduledDate: null,
          scheduledTime: null,
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

  function pushMediaBlock(type: "image" | "video" | "audio", url: string, publicId?: string) {
    setBlocks((prev) => [
      ...prev,
      {
        id: makeId(),
        type,
        content: url,
        publicId,
        format: { align: "left", bold: false, italic: false, underline: false, size: 16 },
      },
    ]);
  }

  async function addCarouselBlock() {
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
        allowsMultipleSelection: true,
        selectionLimit: MAX_CAROUSEL_IMAGES,
        quality: 0.8,
        orderedSelection: true,
      });

      const assets = result.assets ?? [];

      if (assets.length === 0) {
        setMsg("Nenhuma imagem selecionada.");
        return;
      }

      if (assets.length > MAX_CAROUSEL_IMAGES) {
        setMsg(`Selecione no máximo ${MAX_CAROUSEL_IMAGES} imagens por carrossel.`);
        return;
      }

      setIsUploading(true);

      const uploadedImages: CarouselImage[] = [];

      for (const asset of assets) {
        const uri = asset.uri;

        const { url, publicId } = await uploadMediaCloudinary({
          uri,
          kind: "photos",
        });

        uploadedImages.push({
          id: makeId(),
          url,
          publicId: publicId ?? null,
        });
      }

      setBlocks((prev) => [
        ...prev,
        {
          id: makeId(),
          type: "carousel",
          content: JSON.stringify(uploadedImages),
          format: {
            align: "left",
            bold: false,
            italic: false,
            underline: false,
            size: 16,
          },
        },
      ]);

      setShowOptions(false);
    } catch (e: any) {
      console.log("Erro upload carrossel:", e);
      setMsg(e?.message ? String(e.message) : "Erro ao enviar imagens do carrossel.");
    } finally {
      setIsUploading(false);
    }
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

      const { url, publicId } = await uploadMediaCloudinary({
        uri,
        kind: "photos",
      });

      pushMediaBlock("image", url, publicId);
      setShowOptions(false);
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

  const isBusy = isSaving || isUploading || isLoadingRoute;

  if (!isOnline) {
    return (
      <View style={globalStyles.center}>
        <Ionicons name="wifi-outline" size={26} color="#111827" />
        <Text style={globalStyles.emptyTitle}>Sem conexão</Text>
        <Text style={[globalStyles.loadingText, { textAlign: "center" }]}>
          Conecte-se à internet para carregar a rota.
        </Text>

        <TouchableOpacity
          style={globalStyles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.9}
        >
          <Text style={globalStyles.backText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#87a2eb9f", "#c581c960"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={[styles.topBar, { paddingTop: insets.top > 0 ? 0 : 8 }]}>
            <TouchableOpacity
              style={styles.topIconBtn}
              onPress={() => router.back()}
              disabled={isBusy}
              activeOpacity={0.8}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={22} />
            </TouchableOpacity>

            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={styles.header}>{isEdit ? "Editar" : "Criar"}</Text>
            </View>

            <TouchableOpacity
              style={[styles.topIconBtn, !canSave && styles.topIconBtnDisabled]}
              onPress={() => {
                setMsg(null);
                setMetaOpen(true);
              }}
              disabled={!canSave}
              activeOpacity={0.8}
              hitSlop={10}
            >
              {isSaving || isUploading ? (
                <ActivityIndicator />
              ) : (
                <Ionicons name="save-outline" size={20} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.container2}>
            {msg && <Text style={styles.msg}>{msg}</Text>}

            {isLoadingRoute ? (
              <View style={{ marginTop: 14 }}>
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={blocks}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingBottom: BOTTOM_BAR_HEIGHT + insets.bottom + 18,
                }}
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
                    onUpdateFormat={updateBlockFormat}
                    onOpenSettings={(id) => setSettingsBlockId(id)}
                  />
                )}
              />
            )}

            <View
              style={[
                styles.bottomDock,
                {
                  left: 12,
                  right: 12,
                  bottom: insets.bottom + 12,
                },
              ]}
              pointerEvents="box-none"
            >
              <View style={styles.actionBar}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setShowOptions(true)}
                  disabled={isBusy}
                  activeOpacity={0.85}
                  hitSlop={10}
                >
                  <Ionicons name="add-circle-outline" size={24} />
                  <Text style={styles.actionLabel}>Mais</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Modal transparent visible={metaOpen} animationType="slide">
              <Pressable style={styles.sheetOverlay} onPress={() => setMetaOpen(false)}>
                <Pressable
                  style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
                  onPress={() => {}}
                >
                  <View style={styles.sheetHandle} />
                  <Text style={styles.sheetTitle}>{isEdit ? "Dados da rota" : "Antes de salvar"}</Text>

                  <Text style={styles.label}>Título da rota</Text>
                  <TextInput
                    value={routeTitle}
                    onChangeText={setRouteTitle}
                    placeholder="Ex.: Centro histórico + museus"
                    style={styles.routeTitleInput}
                    returnKeyType="next"
                    autoFocus
                  />

                  <Text style={styles.label}>Cliente</Text>
                  <TextInput
                    value={clientName}
                    onChangeText={setClientName}
                    placeholder="Ex.: Agência XPTO / Maria Silva"
                    style={styles.routeTitleInput}
                    returnKeyType="done"
                  />

                  <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
                    <TouchableOpacity
                      style={[styles.confirmBtn, styles.confirmCancel]}
                      onPress={() => setMetaOpen(false)}
                      disabled={isBusy}
                    >
                      <Text style={styles.confirmCancelText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.confirmBtn, styles.confirmDelete]}
                      onPress={async () => {
                        if (routeTitle.trim().length < 3) {
                          setMsg("Escolha um título para a rota (mín. 3 caracteres).");
                          return;
                        }
                        setMetaOpen(false);
                        await saveRoute();
                      }}
                      disabled={isBusy}
                    >
                      <Text style={styles.confirmDeleteText}>Salvar</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>

            <Modal
              transparent
              visible={!!selectedBlock}
              animationType="slide"
              onRequestClose={() => setSettingsBlockId(null)}
            >
              <Pressable style={styles.sheetOverlay} onPress={() => setSettingsBlockId(null)}>
                <Pressable
                  style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
                  onPress={() => {}}
                >
                  <View style={styles.sheetHandle} />
                  <Text style={styles.sheetTitle}>Configurações do bloco</Text>

                  {selectedBlock && selectedIsTextual && (
                    <>
                      <Text style={styles.sectionTitle}>Texto</Text>

                      <View style={styles.row}>
                        <OptionChip
                          label="Negrito"
                          active={selectedBold}
                          icon={<MaterialCommunityIcons name="format-bold" size={16} color="#111827" />}
                          onPress={() =>
                            updateBlockFormat(selectedBlock.id, { bold: !selectedBold })
                          }
                        />
                        <OptionChip
                          label="Itálico"
                          active={selectedItalic}
                          icon={<MaterialCommunityIcons name="format-italic" size={16} color="#111827" />}
                          onPress={() =>
                            updateBlockFormat(selectedBlock.id, { italic: !selectedItalic })
                          }
                        />
                        <OptionChip
                          label="Sublinhar"
                          active={selectedUnderline}
                          icon={<MaterialCommunityIcons name="format-underline" size={16} color="#111827" />}
                          onPress={() =>
                            updateBlockFormat(selectedBlock.id, { underline: !selectedUnderline })
                          }
                        />
                      </View>

                      <Text style={styles.subTitle}>Alinhamento</Text>
                      <View style={styles.row}>
                        <OptionChip
                          label="Esq."
                          active={selectedAlign === "left"}
                          icon={<MaterialCommunityIcons name="format-align-left" size={16} color="#111827" />}
                          onPress={() => updateBlockFormat(selectedBlock.id, { align: "left" })}
                        />
                        <OptionChip
                          label="Centro"
                          active={selectedAlign === "center"}
                          icon={<MaterialCommunityIcons name="format-align-center" size={16} color="#111827" />}
                          onPress={() => updateBlockFormat(selectedBlock.id, { align: "center" })}
                        />
                        <OptionChip
                          label="Dir."
                          active={selectedAlign === "right"}
                          icon={<MaterialCommunityIcons name="format-align-right" size={16} color="#111827" />}
                          onPress={() => updateBlockFormat(selectedBlock.id, { align: "right" })}
                        />
                        <OptionChip
                          label="Just."
                          active={selectedAlign === "justify"}
                          icon={<MaterialCommunityIcons name="format-align-justify" size={16} color="#111827" />}
                          onPress={() => updateBlockFormat(selectedBlock.id, { align: "justify" })}
                        />
                      </View>

                      <Text style={styles.subTitle}>Tamanho da fonte</Text>
                      <View style={styles.fontSizeBox}>
                        <View style={styles.fontSizeHeader}>
                          <Text style={styles.fontSizeLabel}>Ajuste o tamanho</Text>
                          <Text style={styles.fontSizeValue}>{selectedFontSize}px</Text>
                        </View>

                        <Slider
                          value={selectedFontSize}
                          minimumValue={MIN_FONT_SIZE}
                          maximumValue={MAX_FONT_SIZE}
                          step={1}
                          onSlidingComplete={(value) =>
                            updateBlockFormat(selectedBlock.id, {
                              size: clamp(Math.round(value), MIN_FONT_SIZE, MAX_FONT_SIZE),
                            })
                          }
                        />

                        <View style={styles.fontSizeLimits}>
                          <Text style={styles.fontSizeLimitText}>{MIN_FONT_SIZE}px</Text>
                          <Text style={styles.fontSizeLimitText}>{MAX_FONT_SIZE}px</Text>
                        </View>
                      </View>
                    </>
                  )}

                  <Text style={styles.sectionTitle}>Ações</Text>
                  {selectedBlock && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        removeBlock(selectedBlock.id);
                        setSettingsBlockId(null);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                      <Text style={styles.deleteButtonText}>Excluir bloco</Text>
                    </TouchableOpacity>
                  )}
                </Pressable>
              </Pressable>
            </Modal>

            <Modal transparent visible={showOptions} animationType="slide">
              <Pressable style={styles.sheetOverlay} onPress={() => setShowOptions(false)}>
                <Pressable
                  style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
                  onPress={() => {}}
                >
                  <View style={styles.sheetHandle} />
                  <Text style={styles.sheetTitle}>Mais opções</Text>

                  <TouchableOpacity style={styles.sheetItem} onPress={() => addBlock("title")}>
                    <Ionicons name="text-outline" size={22} />
                    <Text style={styles.sheetItemText}>Título</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.sheetItem} onPress={() => addBlock("text")}>
                    <Ionicons name="document-text-outline" size={22} />
                    <Text style={styles.sheetItemText}>Texto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.sheetItem} onPress={() => addBlock("description")}>
                    <Ionicons name="reader-outline" size={22} />
                    <Text style={styles.sheetItemText}>Descrição</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.sheetItem} onPress={addImageBlock}>
                    <Ionicons name="image-outline" size={22} />
                    <Text style={styles.sheetItemText}>Imagem</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.sheetItem} onPress={addCarouselBlock}>
                    <Ionicons name="images-outline" size={22} />
                    <Text style={styles.sheetItemText}>Carrossel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sheetItem}
                    onPress={() => {
                      setMsg("Opção de mapa (em breve).");
                      setShowOptions(false);
                    }}
                  >
                    <Ionicons name="map-outline" size={22} />
                    <Text style={styles.sheetItemText}>Mapa</Text>
                  </TouchableOpacity>

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
          </View>
        </SafeAreaView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function OptionChip({
  label,
  active,
  icon,
  onPress,
}: {
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon ? <View style={{ marginRight: 8 }}>{icon}</View> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  container2: {
    flex: 1,
    paddingHorizontal: 10,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 50,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff00",
  },

  topIconBtn: {
    height: 40,
    width: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff99",
    margin: 5,
    marginTop: 5,
  },

  topIconBtnDisabled: {
    opacity: 0.55,
  },

  header: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Inter",
  },

  label: {
    marginBottom: 6,
    fontWeight: "500",
    fontSize: 16,
    fontFamily: "Inter",
  },

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

  msg: {
    color: "#B00020",
    marginBottom: 8,
  },

  empty: {
    color: "#6B7280",
    marginTop: 16,
    fontSize: 14,
  },

  bottomDock: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
  },

  actionBar: {
    flexDirection: "row",
    justifyContent: "center",
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    elevation: 4,
  },

  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

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

  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },

  sheetItemText: {
    fontSize: 15,
    fontWeight: "600",
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

  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

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

  chipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },

  chipTextActive: {
    color: "#111827",
  },

  fontSizeBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },

  fontSizeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  fontSizeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  fontSizeValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },

  fontSizeLimits: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },

  fontSizeLimitText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  deleteButton: {
    marginTop: 4,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  deleteButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "800",
  },
});