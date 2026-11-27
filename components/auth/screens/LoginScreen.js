"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthContext, goTo } from "@/components/auth/AuthProvider";
import { useBrowserSession } from "@/components/auth/useSession";
import GoogleButton from "@/components/auth/GoogleButton";
import { Alert, AuthCard, AuthLoading, Field, PasswordInput, SubmitButton, TextInput, authStyles as s } from "@/components/auth/ui";
import { syncServerSession } from "@/lib/client/supabase-browser";
import { describeAuthError, logAuthIssue, AUTH_MESSAGES } from "@/lib/auth/messages";
import { isValidEmail, normalizeEmail } from "@/lib/auth/password";

const NOTICES = {
  "sesion-cerrada": { variant: "success", text: "Cerraste sesión correctamente." },
  expirada: { variant: "info", text: AUTH_MESSAGES.sessionMissing },
  "contrasena-actualizada": { variant: "success", text: "Tu contraseña se actualizó correctamente. Iniciá sesión con la nueva contraseña." },
  "correo-confirmado": { variant: "success", text: "Tu correo está confirmado. Ya podés iniciar sesión." },
  servicio: { variant: "error", text: "No pudimos conectar con el servicio de inicio de sesión. Probá de nuevo en unos minutos." }
};

export default function LoginScreen() {
  const params = useSearchParams();
  const { getSupabase, safeNext, configured } = useAuthContext();
  const next = safeNext(params.get("next"));
  const notice = NOTICES[params.get("motivo") || ""];
  const session = useBrowserSession();

  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  // Usuario que ya tiene sesión: directo a la app (sin mostrar el formulario).
  useEffect(() => {
    if (session.status === "active" && session.synced) goTo(next);
  }, [session.status, session.synced, next]);

  if (session.status === "loading" || (session.status === "active" && session.synced)) {
    return <AuthLoading label="Verificando tu sesión…" />;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (submitting.current) return;
    const errs = {};
    const cleanEmail = normalizeEmail(email);
    if (!isValidEmail(cleanEmail)) errs.email = "Ingresá un correo electrónico válido.";
    if (!password) errs.password = "Ingresá tu contraseña.";
    setFieldErrors(errs);
    setError(null);
    if (Object.keys(errs).length) return;

    submitting.current = true;
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (signInError || !data?.session) {
        const code = logAuthIssue("sign_in", signInError);
        setError({ ...describeAuthError(signInError), code, email: cleanEmail });
        return;
      }
      const synced = await syncServerSession(data.session);
      if (!synced) {
        setError({ key: "generic", message: AUTH_MESSAGES.generic });
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        return;
      }
      goTo(next);
    } catch (err) {
      logAuthIssue("sign_in", err);
      setError(describeAuthError(err));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  const emailId = "login-email";
  const passwordId = "login-password";

  return (
    <AuthCard title="Iniciar sesión" subtitle="Bienvenido de nuevo. Ingresá para seguir trabajando con tus equipos.">
      <form className={s.form} onSubmit={onSubmit} noValidate>
        {!configured ? <Alert variant="error">{NOTICES.servicio.text}</Alert> : null}
        {session.unavailable ? <Alert variant="error">{AUTH_MESSAGES.network}</Alert> : null}
        {session.expired ? <Alert variant="info">{AUTH_MESSAGES.sessionMissing}</Alert> : null}
        {session.status === "active" && !session.synced ? (
          <Alert variant="error">No pudimos validar tu sesión. Volvé a iniciar sesión.</Alert>
        ) : null}
        {notice && !error ? <Alert variant={notice.variant}>{notice.text}</Alert> : null}
        {error ? (
          <Alert variant="error">
            {error.message}
            {error.key === "emailNotConfirmed" ? (
              <>
                {" "}
                <a href={`/verificar-correo?email=${encodeURIComponent(error.email || "")}`}>Reenviar el correo de confirmación</a>
              </>
            ) : null}
          </Alert>
        ) : null}

        <Field label="Correo electrónico" id={emailId} error={fieldErrors.email}>
          <TextInput
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            required
          />
        </Field>

        <Field
          label="Contraseña"
          id={passwordId}
          error={fieldErrors.password}
          aside={
            <a className={`${s.link} ${s.smallLink}`} href="/recuperar-contrasena">
              ¿Olvidaste tu contraseña?
            </a>
          }
        >
          <PasswordInput
            id={passwordId}
            name="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
          />
        </Field>

        <div className={s.actions}>
          <SubmitButton loading={loading} loadingText="Ingresando…" disabled={!configured}>
            Iniciar sesión
          </SubmitButton>
          <GoogleButton next={next} />
        </div>
      </form>
      <p className={s.footer}>
        ¿Todavía no tenés cuenta?{" "}
        <a className={s.link} href={next !== "/" ? `/registro?next=${encodeURIComponent(next)}` : "/registro"}>
          Creá tu cuenta
        </a>
      </p>
    </AuthCard>
  );
}
