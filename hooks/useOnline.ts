// src/hooks/useOnline.ts
import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export function useOnline() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const ok = Boolean(state.isConnected) && Boolean(state.isInternetReachable ?? true);
      setIsOnline(ok);
    });
    return () => unsub();
  }, []);

  return isOnline;
}