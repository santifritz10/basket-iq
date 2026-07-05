import "server-only";
import { createSupabaseServiceServerClient } from "@/lib/server/supabase";
import { playerDomainFlags } from "@/lib/server/player-domain-flags";

const SYNC_TYPES = new Set(["players_tracking", "shooting_heatmap"]);

export async function getUserDataByType(userId, dataType) {
  if (playerDomainFlags.read && SYNC_TYPES.has(dataType)) {
    return null;
  }
  const service = createSupabaseServiceServerClient();
  const result = await service
    .from("user_app_data")
    .select("payload")
    .eq("user_id", userId)
    .eq("data_type", dataType)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data?.payload ?? null;
}

export async function saveUserDataByType(userId, dataType, payload) {
  if (playerDomainFlags.write && SYNC_TYPES.has(dataType)) {
    const err = new Error(`Legacy blob write disabled for ${dataType}. Use player domain API.`);
    err.status = 410;
    throw err;
  }

  const service = createSupabaseServiceServerClient();
  const upsert = await service.from("user_app_data").upsert(
    { user_id: userId, data_type: dataType, payload },
    { onConflict: "user_id,data_type" }
  );
  if (upsert.error) throw upsert.error;
}
