"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthContext, goTo } from "@/components/auth/AuthProvider";
import { useBrowserSession } from "@/components/auth/useSession";
import GoogleButton from "@/components/auth/GoogleButton";
import {
  Alert,
  AuthCard,
  AuthLoading,
  Field,
  PasswordInput,
  PasswordRules,
  SubmitButton,
  TextInput,
  authStyles as s
} from "@/components/auth/ui";
import { syncServerSession } from "@/lib/client/supabase-browser";
import { describeAuthError, logAuthIssue } from "@/lib/auth/messages";
import { isPasswordValid, isValidEmail, normalizeEmail } from "@/lib/auth/password";
import { markResendCooldown } from "@/components/auth/resend-cooldown";

export default function RegisterScreen() {
  const params = useSearchParams();
  const { getSupabase, redirectUrl, safeNext, configured } = useAuthContext();
  const next = safeNext(params.get("next"), "/bienvenida");
  const session = useBrowserSession();

  const [form, setForm] = useState({ name: "", email: params.get("email") || "", password: "", confirm: "" });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (session.status === "active" && session.synced) goTo("/");
  }, [session.status, session.synced]);

  if (session.status === "loading" || (session.status === "active" && session.synced)) {
    return <AuthLoading label="Verificando tu sesión…" />;
  }

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function validate(values) {
    const errs = {};
    if (values.name.trim().length < 2) errs.name = "Ingresá tu nombre (al menos 2 caracteres).";
    if (values.name.trim().length > 80) errs.name = "El nombre puede tener hasta 80 caracteres.";
    if (!isValidEmail(values.email)) errs.email = "Ingresá un correo electrónico válido.";
    if (!isPasswordValid(values.password)) errs.password = "La contraseña no cumple los requisitos.";
    if (!values.confirm) errs.confirm = "Repetí la contraseña.";
    else if (values.confirm !== values.password) errs.confirm = "Las contraseñas no coinciden.";
    return errs;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    if (submitting.current) return;
    const errs = validate(form);
    setTouched({ name: true, email: true, password: true, confirm: true });
    setError("");
    if (Object.keys(errs).length) return;

    submitting.current = true;
    setLoading(true);
    const email = normalizeEmail(form.email);
    try {
      const supabase = getSupabase();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: redirectUrl("/auth/confirm", next),
          data: { full_name: form.name.trim().replace(/\s+/g, " ") }
        }
      });
      if (signUpError) {
        logAuthIssue("sign_up", signUpError);
        setError(describeAuthError(signUpError).message);
        return;
      }
      if (data?.session) {
        // Solo pasa si la confirmación de correo está desactivada en Supabase.
        await syncServerSession(data.session);
        goTo(next);
        return;
      }
      // Supabase aceptó la solicitud. Por seguridad responde igual aunque el
      // correo ya tenga cuenta, así que no afirmamos nada más que eso.
      markResendCooldown(email);
      goTo(`/verificar-correo?email=${encodeURIComponent(email)}&enviado=1`);
    } catch (err) {
      logAuthIssue("sign_up", err);
      setError(describeAuthError(err).message);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  // Los errores aparecen recién cuando el usuario sale del campo o envía.
  const liveErrors = validate(form);
  const show = (field) => (touched[field] ? liveErrors[field] || "" : "");
  const blur = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  return (
    <AuthCard title="Creá tu cuenta" subtitle="Empezá a planificar, aprender y organizar tus equipos en Basket Lab.">
      <form className={s.form} onSubmit={onSubmit} noValidate>
        {error ? <Alert variant="error">{error}</Alert> : null}

        <Field label="Nombre" id="reg-name" error={show("name")}>
          <TextInput
            id="reg-name"
            name="name"
            autoComplete="name"
            placeholder="Cómo querés que te llamemos"
            maxLength={80}
            value={form.name}
            onChange={update("name")}
            onBlur={blur("name")}
            error={show("name")}
            required
          />
        </Field>

        <Field label="Correo electrónico" id="reg-email" error={show("email")}>
          <TextInput
            id="reg-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="tu@correo.com"
            value={form.email}
            onChange={update("email")}
            onBlur={blur("email")}
            error={show("email")}
            required
          />
        </Field>

        <Field label="Contraseña" id="reg-password" error={show("password")}>
          <PasswordInput
            id="reg-password"
            name="password"
            autoComplete="new-password"
            placeholder="Creá una contraseña"
            maxLength={72}
            value={form.password}
            onChange={update("password")}
            onBlur={blur("password")}
            error={show("password")}
            aria-describedby="reg-password-rules"
            required
          />
          <PasswordRules value={form.password} id="reg-password-rules" />
        </Field>

        <Field label="Confirmar contraseña" id="reg-confirm" error={show("confirm")}>
          <PasswordInput
            id="reg-confirm"
            name="confirm"
            autoComplete="new-password"
            placeholder="Repetí la contraseña"
            maxLength={72}
            value={form.confirm}
            onChange={update("confirm")}
            onBlur={blur("confirm")}
            error={show("confirm")}
            required
          />
        </Field>

        <div className={s.actions}>
          <SubmitButton loading={loading} loadingText="Creando tu cuenta…" disabled={!configured}>
            Crear cuenta
          </SubmitButton>
          <GoogleButton next={next} />
        </div>
      </form>
      <p className={s.footer}>
        ¿Ya tenés cuenta?{" "}
        <a className={s.link} href="/login">
          Iniciá sesión
        </a>
      </p>
    </AuthCard>
  );
}
