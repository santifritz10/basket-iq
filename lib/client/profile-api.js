import { baseUsernameFromEmail, sanitizeProfileInput } from "@/lib/auth/profile";

const MISSING_COLUMN_CODES = new Set(["42703", "PGRST204"]);

function isMissingColumn(error) {
  return Boolean(error && (MISSING_COLUMN_CODES.has(error.code) || /column .* does not exist|schema cache/i.test(error.message || "")));
}

/**
 * Lee el perfil propio. Si todavía no se corrió la migración 010 (columnas
 * de onboarding), usa los datos guardados en la cuenta como respaldo.
 */
export async function loadOwnProfile(supabase, user) {
  const meta = user?.user_metadata || {};
  let res = await supabase
    .from("profiles")
    .select("username, full_name, sport_role, club, categories, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  let extended = true;
  if (res.error && isMissingColumn(res.error)) {
    extended = false;
    res = await supabase.from("profiles").select("username, full_name").eq("id", user.id).maybeSingle();
  }
  const row = res.data || {};
  return {
    extended,
    exists: Boolean(res.data),
    username: row.username || "",
    full_name: row.full_name || meta.full_name || "",
    sport_role: row.sport_role ?? meta.sport_role ?? null,
    club: row.club ?? meta.club ?? "",
    categories: row.categories ?? meta.categories ?? [],
    onboarding_completed_at: row.onboarding_completed_at ?? meta.onboarding_completed_at ?? null
  };
}

async function insertProfile(supabase, user, values) {
  const base = baseUsernameFromEmail(user.email);
  for (const username of [base, `${base}_${user.id.slice(0, 6)}`]) {
    const { error } = await supabase.from("profiles").insert({ id: user.id, username, ...values });
    if (!error) return null;
    if (error.code !== "23505") return error; // 23505 = nombre de usuario repetido
  }
  return { code: "23505", message: "username taken" };
}

/** Guarda solo campos de perfil propios (RLS limita la fila al usuario). */
export async function saveOwnProfile(supabase, user, input, { completeOnboarding = false } = {}) {
  const clean = sanitizeProfileInput(input);
  const extra = { sport_role: clean.sport_role, club: clean.club, categories: clean.categories };
  const now = new Date().toISOString();
  const full = { full_name: clean.full_name, ...extra, ...(completeOnboarding ? { onboarding_completed_at: now } : {}) };

  let res = await supabase.from("profiles").update(full).eq("id", user.id).select("id");
  let usedFallback = false;
  if (res.error && isMissingColumn(res.error)) {
    usedFallback = true;
    res = await supabase.from("profiles").update({ full_name: clean.full_name }).eq("id", user.id).select("id");
  }
  if (res.error) throw res.error;
  if (!res.data || res.data.length === 0) {
    const insertError = await insertProfile(supabase, user, usedFallback ? { full_name: clean.full_name } : full);
    if (insertError && isMissingColumn(insertError)) {
      usedFallback = true;
      const retry = await insertProfile(supabase, user, { full_name: clean.full_name });
      if (retry) throw retry;
    } else if (insertError) {
      throw insertError;
    }
  }

  // Copia en los datos de la cuenta: nombre para la app y respaldo de los
  // campos opcionales mientras falte la migración.
  const metaData = { full_name: clean.full_name };
  if (usedFallback) {
    Object.assign(metaData, extra);
    if (completeOnboarding) metaData.onboarding_completed_at = now;
  }
  const { error: metaError } = await supabase.auth.updateUser({ data: metaData });
  if (metaError) throw metaError;
  return { usedFallback };
}
