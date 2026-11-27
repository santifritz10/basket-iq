"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LuMailCheck } from "react-icons/lu";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { Alert, AuthCard, ButtonLink, Field, StatusView, SubmitButton, TextInput, authStyles as s } from "@/components/auth/ui";
import { useCountdown } from "@/components/auth/useCountdown";
import { markResendCooldown, remainingCooldown } from "@/components/auth/resend-cooldown";
import { describeAuthError, logAuthIssue } from "@/lib/auth/messages";
import { isValidEmail, normalizeEmail } from "@/lib/auth/password";

/**
 * "Revisá tu correo" después del registro, y también la pantalla para
 * reenviar la confirmación (cuando se llega sin correo en la URL).
 */
export default function VerifyEmailScreen() {
  const params = useSearchParams();
  const { getSupabase, redirectUrl, configured } = useAuthContext();
  const initialEmail = normalizeEmail(params.get("email"));
  const justSent = params.get("enviado") === "1";

  const [email, setEmail] = useState(isValidEmail(initialEmail) ? initialEmail : "");
  const [editing, setEditing] = useState(!isValidEmail(initialEmail));
  const [draft, setDraft] = useState(initialEmail);
  const [draftError, setDraftError] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useCountdown(0);
  const sending = useRef(false);

  useEffect(() => {
    if (email) setSeconds(remainingCooldown(email));
  }, [email, setSeconds]);

  async function resend(target) {
    if (sending.current || !target) return;
    const wait = remainingCooldown(target);
    if (wait > 0) {
      setSeconds(wait);
      return;
    }
    sending.current = true;
    setLoading(true);
    setResult(null);
    try {
      const { error } = await getSupabase().auth.resend({
        type: "signup",
        email: target,
        options: { emailRedirectTo: redirectUrl("/auth/confirm", "/bienvenida") }
      });
      if (error) {
        logAuthIssue("resend_signup", error);
        setResult({ variant: "error", text: describeAuthError(error).message });
        if (error.status === 429) {
          markResendCooldown(target);
          setSeconds(remainingCooldown(target));
        }
        return;
      }
      markResendCooldown(target);
      setSeconds(remainingCooldown(target));
      setResult({
        variant: "success",
        text: "Pedimos un nuevo envío. Puede tardar unos minutos en llegar. Si la cuenta ya estaba confirmada, no vas a recibir otro correo: iniciá sesión directamente."
      });
    } catch (err) {
      logAuthIssue("resend_signup", err);
      setResult({ variant: "error", text: describeAuthError(err).message });
    } finally {
      sending.current = false;
      setLoading(false);
    }
  }

  function onSubmitEmail(ev) {
    ev.preventDefault();
    const value = normalizeEmail(draft);
    if (!isValidEmail(value)) {
      setDraftError("Ingresá un correo electrónico válido.");
      return;
    }
    setDraftError("");
    setEmail(value);
    setEditing(false);
    resend(value);
  }

  if (editing) {
    return (
      <AuthCard
        title="Reenviar confirmación"
        subtitle="Ingresá el correo con el que creaste tu cuenta y te mandamos un nuevo enlace de confirmación."
      >
        <form className={s.form} onSubmit={onSubmitEmail} noValidate>
          {result ? <Alert variant={result.variant}>{result.text}</Alert> : null}
          <Field label="Correo electrónico" id="verify-email" error={draftError}>
            <TextInput
              id="verify-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              placeholder="tu@correo.com"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              error={draftError}
              required
            />
          </Field>
          <div className={s.actions}>
            <SubmitButton loading={loading} loadingText="Enviando…" disabled={!configured}>
              Enviar enlace de confirmación
            </SubmitButton>
            <ButtonLink href="/login" variant="ghost">
              Volver a iniciar sesión
            </ButtonLink>
          </div>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <StatusView
        icon={LuMailCheck}
        title="Revisá tu correo"
        actions={
          <>
            <SubmitButton type="button" variant="secondary" onClick={() => resend(email)} loading={loading} loadingText="Enviando…" disabled={seconds > 0 || !configured}>
              {seconds > 0 ? `Reenviar correo (${seconds} s)` : "Reenviar correo"}
            </SubmitButton>
            <ButtonLink href="/login">Ir a iniciar sesión</ButtonLink>
          </>
        }
      >
        <p style={{ margin: "0 0 14px" }}>
          {justSent ? "Recibimos tu registro. " : ""}Para activar tu cuenta, abrí el enlace que te enviamos a:
        </p>
        <span className={s.emailChip}>{email}</span>
        <ol className={s.steps}>
          <li>
            <b>1</b>Abrí el correo de <strong>Basket Lab</strong> y tocá «Confirmar mi cuenta».
          </li>
          <li>
            <b>2</b>Si no lo ves en unos minutos, revisá las carpetas de spam, promociones o correo no deseado.
          </li>
          <li>
            <b>3</b>Después de confirmar, vas a poder entrar con tu correo y contraseña.
          </li>
        </ol>
        {result ? <Alert variant={result.variant}>{result.text}</Alert> : null}
        <p className={s.hint} style={{ marginTop: 14 }}>
          ¿Escribiste mal el correo?{" "}
          <a className={s.link} href={`/registro?email=${encodeURIComponent(email)}`}>
            Registrate de nuevo con el correo correcto
          </a>{" "}
          o{" "}
          <button
            type="button"
            className={s.link}
            style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }}
            onClick={() => {
              setDraft(email);
              setResult(null);
              setEditing(true);
            }}
          >
            reenviá a otra dirección
          </button>
          .
        </p>
      </StatusView>
    </AuthCard>
  );
}
