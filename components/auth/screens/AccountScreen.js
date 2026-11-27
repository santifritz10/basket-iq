"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useRequiredSession } from "@/components/auth/useRequiredSession";
import ProfileFields from "@/components/auth/ProfileFields";
import {
  Alert,
  AuthCard,
  AuthLoading,
  ButtonLink,
  Field,
  PasswordInput,
  PasswordRules,
  SubmitButton,
  authStyles as s
} from "@/components/auth/ui";
import { loadOwnProfile, saveOwnProfile } from "@/lib/client/profile-api";
import { sanitizeProfileInput, validateProfileInput } from "@/lib/auth/profile";
import { describeAuthError, logAuthIssue } from "@/lib/auth/messages";
import { isPasswordValid } from "@/lib/auth/password";
import { syncServerSession } from "@/lib/client/supabase-browser";

function PasswordChange({ user }) {
  const { getSupabase } = useAuthContext();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  async function onSubmit(ev) {
    ev.preventDefault();
    if (busy.current) return;
    setResult(null);
    if (!current) return setResult({ variant: "error", text: "Ingresá tu contraseña actual." });
    if (!isPasswordValid(password)) return setResult({ variant: "error", text: "La contraseña nueva no cumple los requisitos." });
    if (password !== confirm) return setResult({ variant: "error", text: "Las contraseñas no coinciden." });
    busy.current = true;
    setLoading(true);
    try {
      const supabase = getSupabase();
      // Confirmamos que quien cambia la contraseña conoce la actual.
      const check = await supabase.auth.signInWithPassword({ email: user.email, password: current });
      if (check.error) {
        logAuthIssue("reauth", check.error);
        setResult({ variant: "error", text: check.error.code === "invalid_credentials" ? "La contraseña actual no es correcta." : describeAuthError(check.error).message });
        return;
      }
      await syncServerSession(check.data.session);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        logAuthIssue("change_password", error);
        setResult({ variant: "error", text: describeAuthError(error).message });
        return;
      }
      await supabase.auth.signOut({ scope: "others" }).catch(() => {});
      setCurrent("");
      setPassword("");
      setConfirm("");
      setResult({ variant: "success", text: "Tu contraseña se actualizó correctamente. Cerramos las sesiones abiertas en otros dispositivos." });
    } catch (err) {
      logAuthIssue("change_password", err);
      setResult({ variant: "error", text: describeAuthError(err).message });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <form className={`${s.form} ${s.section}`} onSubmit={onSubmit} noValidate>
      <h2 className={s.sectionTitle}>Cambiar contraseña</h2>
      {result ? <Alert variant={result.variant}>{result.text}</Alert> : null}
      <input type="email" name="username" autoComplete="username" value={user.email || ""} readOnly hidden />
      <Field label="Contraseña actual" id="acc-current">
        <PasswordInput id="acc-current" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field label="Contraseña nueva" id="acc-new">
        <PasswordInput id="acc-new" autoComplete="new-password" maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordRules value={password} id="acc-rules" />
      </Field>
      <Field label="Confirmar contraseña nueva" id="acc-confirm">
        <PasswordInput id="acc-confirm" autoComplete="new-password" maxLength={72} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <div className={s.actions}>
        <SubmitButton variant="secondary" loading={loading} loadingText="Actualizando…">
          Actualizar contraseña
        </SubmitButton>
      </div>
    </form>
  );
}

export default function AccountScreen() {
  const { getSupabase } = useAuthContext();
  const session = useRequiredSession("/cuenta");
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (session.status !== "active") return;
    loadOwnProfile(getSupabase(), session.user)
      .then((p) => setValues({ full_name: p.full_name, sport_role: p.sport_role, club: p.club || "", categories: p.categories || [] }))
      .catch(() => setValues({ full_name: session.user?.user_metadata?.full_name || "", sport_role: null, club: "", categories: [] }));
  }, [session.status, session.user, getSupabase]);

  if (session.status !== "active" || !values) return <AuthLoading label="Cargando tu cuenta…" />;

  async function onSubmit(ev) {
    ev.preventDefault();
    if (busy.current) return;
    const clean = sanitizeProfileInput(values);
    const errs = validateProfileInput(clean);
    setErrors(errs);
    setResult(null);
    if (Object.keys(errs).length) return;
    busy.current = true;
    setLoading(true);
    try {
      await saveOwnProfile(getSupabase(), session.user, clean);
      setResult({ variant: "success", text: "Guardamos tus datos." });
    } catch (err) {
      logAuthIssue("profile_save", err);
      setResult({ variant: "error", text: describeAuthError(err).message });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <AuthCard wide title="Mi cuenta" subtitle={session.user?.email ? `Sesión iniciada como ${session.user.email}` : undefined}>
      <form className={s.form} onSubmit={onSubmit} noValidate>
        {result ? <Alert variant={result.variant}>{result.text}</Alert> : null}
        <ProfileFields values={values} onChange={setValues} errors={errors} />
        <div className={s.actions}>
          <SubmitButton loading={loading} loadingText="Guardando…">
            Guardar cambios
          </SubmitButton>
        </div>
      </form>
      {session.user?.email ? <PasswordChange user={session.user} /> : null}
      <div className={`${s.actions} ${s.section}`}>
        <ButtonLink href="/" variant="secondary">
          Volver a Basket Lab
        </ButtonLink>
        <ButtonLink href="/cerrar-sesion" variant="ghost">
          Cerrar sesión
        </ButtonLink>
      </div>
    </AuthCard>
  );
}
