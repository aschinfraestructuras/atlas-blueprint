import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const TIMEOUT_MS = 30 * 60 * 1000;      // 30 minutes
const WARNING_MS = 25 * 60 * 1000;      // 25 minutes (warning at 5 min before)
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

export function useSessionTimeout() {
  const { user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const warningTimer = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimer = useRef<ReturnType<typeof setTimeout>>();

  const resetTimers = useCallback(() => {
    setShowWarning(false);
    clearTimeout(warningTimer.current);
    clearTimeout(logoutTimer.current);

    if (!user) return;

    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
    }, WARNING_MS);

    logoutTimer.current = setTimeout(async () => {
      // Write audit log before logout
      try {
        await supabase.from("audit_log").insert({
          user_id: user.id,
          entity: "session",
          action: "LOGOUT",
          description: "Auto-logout por inatividade",
        });
      } catch {
        // best-effort
      }
      await supabase.auth.signOut();
    }, TIMEOUT_MS);
  }, [user]);

  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!user) {
      clearTimeout(warningTimer.current);
      clearTimeout(logoutTimer.current);
      setShowWarning(false);
      return;
    }

    resetTimers();

    const handler = () => {
      if (!showWarning) {
        resetTimers();
      }
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handler, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handler);
      }
      clearTimeout(warningTimer.current);
      clearTimeout(logoutTimer.current);
    };
  }, [user, resetTimers, showWarning]);

  return { showWarning, extendSession };
}
