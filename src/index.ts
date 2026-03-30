/*import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { v2 as cloudinary } from "cloudinary";

const CLOUDINARY_CLOUD_NAME = defineSecret("CLOUDINARY_CLOUD_NAME");
const CLOUDINARY_API_KEY = defineSecret("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = defineSecret("CLOUDINARY_API_SECRET");

export const deleteCloudinaryAsset = onCall(
  {
    secrets: [
      CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET,
    ],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    }

    const publicId = request.data?.publicId as string | undefined;
    const resourceType =
      (request.data?.resourceType as "image" | "video" | "raw" | undefined) || "image";

    if (!publicId || typeof publicId !== "string") {
      throw new HttpsError("invalid-argument", "publicId inválido.");
    }

    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME.value(),
      api_key: CLOUDINARY_API_KEY.value(),
      api_secret: CLOUDINARY_API_SECRET.value(),
    });

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      return {
        ok: true,
        result,
      };
    } catch (error: any) {
      throw new HttpsError(
        "internal",
        error?.message || "Erro ao excluir arquivo no Cloudinary."
      );
    }
  }
);*/