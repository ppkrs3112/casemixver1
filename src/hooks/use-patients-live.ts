import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Refreshes the patient list whenever anyone on the team changes data. */
export function usePatientsLive() {
  const qc = useQueryClient();
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`patients-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => {
        clearTimeout(t);
        t = setTimeout(() => qc.invalidateQueries({ queryKey: ["patients"] }), 400);
      })
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
