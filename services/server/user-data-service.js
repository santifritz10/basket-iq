import "server-only";
import { createSupabaseServiceServerClient } from "@/lib/server/supabase";

export async function getUserDataByType(userId, dataType) {
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
  const service = createSupabaseServiceServerClient();
  const upsert = await service.from("user_app_data").upsert(
    { user_id: userId, data_type: dataType, payload },
    { onConflict: "user_id,data_type" }
  );
  if (upsert.error) throw upsert.error;
}
