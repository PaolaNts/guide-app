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

  // 🔴 buscar convites antigos dessa rota
  const q = query(invitesRef, where("routeId", "==", route.id));
  const oldInvites = await getDocs(q);

  // 🔴 apagar convites antigos
  for (const invite of oldInvites.docs) {
    await deleteDoc(doc(invitesRef, invite.id));
  }

  // criar novo convite
  const expires = new Date();
  expires.setDate(expires.getDate() + 3);

  const docRef = await addDoc(invitesRef, {
    ownerUid: user.uid,
    routeId: route.id,
    status: "pending",
    createdAt: serverTimestamp(),
    expiresAt: expires,
    routeSnapshot: {
      title: route.title,
      clientName: route.clientName,
      blocks: route.blocks,
    },
  });

  const link = `https://guia-projeto-vinho.web.app/invite/${user.uid}/${docRef.id}`;

  await Clipboard.setStringAsync(link);
}