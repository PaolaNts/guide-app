import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/src/firebaseConfig";
import * as Clipboard from "expo-clipboard";

export async function shareRoute(route: any) {
  const user = getAuth().currentUser;
  if (!user) return;

  const invitesRef = collection(db, "users", user.uid, "route_invites");

  const q = query(invitesRef, where("routeId", "==", route.id));
  const oldInvites = await getDocs(q);

  for (const invite of oldInvites.docs) {
    await deleteDoc(doc(invitesRef, invite.id));
  }

  const expires = new Date();
  expires.setDate(expires.getDate() + 3);

  const normalizedBlocks = (route?.blocks || []).map((block: any, index: number) => ({
    id: String(block?.id ?? index),
    type: block?.type ?? "text",
    content: String(block?.content ?? ""),
    format: block?.format
      ? {
          align: block.format.align ?? "left",
          bold: !!block.format.bold,
          italic: !!block.format.italic,
          underline: !!block.format.underline,
          size: block.format.size ?? "md",
        }
      : undefined,
  }));

  const docRef = await addDoc(invitesRef, {
    ownerUid: user.uid,
    routeId: route.id,
    status: "pending",
    createdAt: serverTimestamp(),
    expiresAt: expires,
    routeSnapshot: {
      title: route.title ?? "",
      clientName: route.clientName ?? "",
      blocks: normalizedBlocks,
    },
  });

  const link = `https://guia-projeto-vinho.web.app/invite/${user.uid}/${docRef.id}`;

  await Clipboard.setStringAsync(link);
}