import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useMaintenance() {
  const [enabled, setEnabled] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["maintenance_mode", "maintenance_reason"]);
      if (cancelled) return;
      const map = new Map((data ?? []).map((r) => [r.key, r.value]));
      setEnabled(map.get("maintenance_mode") === true);
      const r = map.get("maintenance_reason");
      setReason(typeof r === "string" ? r : "");
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel("app_settings_maintenance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { enabled, reason, loading };
}