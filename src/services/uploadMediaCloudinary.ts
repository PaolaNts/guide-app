// src/services/uploadMediaCloudinary.ts
import { Platform } from "react-native";

type UploadArgs = {
  uri: string;
  kind: "photos" | "videos" | "audios";
};

function guessMime(uri: string, kind: UploadArgs["kind"]) {
  const clean = uri.split("?")[0];
  const ext = (clean.split(".").pop() || "").toLowerCase();

  if (kind === "photos") {
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    return "image/jpeg";
  }
  if (kind === "videos") return "video/mp4";
  if (kind === "audios") return "audio/mpeg";
  return "application/octet-stream";
}

function guessName(uri: string, kind: UploadArgs["kind"]) {
  const clean = uri.split("?")[0];
  const ext = (clean.split(".").pop() || "").toLowerCase();
  const safeExt =
    ext || (kind === "photos" ? "jpg" : kind === "videos" ? "mp4" : "mp3");
  return `upload-${Date.now()}.${safeExt}`;
}

export async function uploadMediaCloudinary({ uri, kind }: UploadArgs) {
  const cloudName = "dmpynvo8c";
  const uploadPreset = "app_upload"; // precisa existir no Cloudinary (unsigned)
  const folder = kind; // opcional

  const form = new FormData();

  // ✅ WEB: precisa mandar Blob
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    const blob = await res.blob();
    form.append("file", blob, guessName(uri, kind));
  } else {
    // ✅ ANDROID/IOS: pode mandar { uri, type, name }
    form.append("file", {
      uri,
      type: guessMime(uri, kind),
      name: guessName(uri, kind),
    } as any);
  }

  form.append("upload_preset", uploadPreset);
  form.append("folder", folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const r = await fetch(endpoint, {
    method: "POST",
    body: form,
  });

  const data = await r.json();

  if (!r.ok) {
    console.log("Cloudinary error payload:", data);
    throw new Error(data?.error?.message || "Falha no upload (Cloudinary).");
  }

  // ✅ URL final (string)
  return { url: data.secure_url as string };
}
