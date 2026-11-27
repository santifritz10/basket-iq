"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LuMailCheck } from "react-icons/lu";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { Alert, AuthCard, ButtonLink, Field, StatusView, SubmitButton, TextInput, authStyles as s } from "@/components/auth/ui";
import { useCountdown } from "@/components/auth/useCountdown";
import { markResendCooldown, remainingCooldown } from "@/components/auth/resend-cooldown";
import { describeAuthError, logAuthIssue } from "@/lib/auth/messages";
import { isValidEmail, normalizeEmail } from "@/lib/auth/password";

const LINK_NOTICES = {
  vencido: "El enlace que usaste venció o ya se usó. Pedí uno nuevo.",
  invalido: "El enlace que usaste no es válido. Pedí uno nuevo."
};

export default function RecoverScreen() {
  const params = useSearchParams();
  const { getSupabase, redirectUrl, configured } = useAuthContext();
  const [email, setEmail] = useState(normalizeEmail(params.get("email")));
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useCountdown(0);
  const sending = useRef(false);
  const linkNotice = LINK_NOTICES[params.get("motivo") || ""];

  async function send(target) {
    if (sending.current) return;
    const wait = remainingCooldown(target, "recovery");
    if (wait > 0) {
      setSeconds(wait);
      setSentTo(target);
      return;
    }
    sending.current = true;
    setLoading(true);
    setError("");
    try {
      const { error: recoverError } = await getSupabase().auth.resetPasswordForEmail(target, {
        redirectTo: redirectUrl("/auth/confirm", "/nueva-contrasena")
      });
      if (recoverError) {
        const code = logAuthIssue("recover", recoverError);
        // Límites y fallas del servicio se informan; cualquier otra respuesta
        // se trata igual que un envío para no revelar si el correo existe.
        if (code === "network" || code.startsWith("over_") || code === "server_error" || recoverError.status >= 500) {
          setError(describeAuthError(recoverError).message);
          return;
        }
      }
      markResendCooldown(target, "recovery");
      setSeconds(remainingCooldown(target, "recovery"));
      setSentTo(target);
    } catch (err) {
      logAuthIssue("recover", err);
      setError(describeAuthError(err).message);
    } finally {
      sending.current = false;
      setLoading(false);
    }
  }

  function onSubmit(ev) {
    ev.preventDefault();
    const value = normalizeEmail(email);
    if (!isValidEmail(value)) {
      setFieldError("Ingresá un correo electrónico válido.");
      return;
    }
    setFieldError("");
    send(value);
  }

  if (sentTo) {
    return (
      <AuthCard>
        <StatusView
          icon={LuMailCheck}
          title="Revisá tu correo"
          actions={
            <>
              <SubmitButton type="button" variant="secondary" onClick={() => send(sentTo)} loading={loading} loadingText="Enviando…" disabled={seconds > 0}>
                {seconds > 0 ? `Pedir otro enlace (${seconds} s)` : "Pedir otro enlace"}
              </SubmitButton>
              <ButtonLink href="/login">Volver a iniciar sesión</ButtonLink>
            </>
          }
        >
          <p style={{ margin: "0 0 14px" }}>Si hay una cuenta de Basket Lab asociada a</p>
          <span className={s.emailChip}>{sentTo}</span>
          <p style={{ margin: "0 0 14px" }}>
            vas a recibir un enlace para crear una contraseña nueva. El enlace vence en un rato y se puede usar una sola vez.
          </p>
          <p className={s.hint}>Si no lo ves en unos minutos, revisá spam o correo no deseado.</p>
          {error ? <Alert variant="error">{error}</Alert> : null}
          <p className={s.hint} style={{ marginTop: 12 }}>
            <button
              type="button"
              className={s.link}
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }}
              onClick={() => setSentTo("")}
            >
              Usar otro correo
            </button>
          </p>
        </StatusView>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Recuperar contraseña" subtitle="Ingresá el correo de tu cuenta y te enviamos un enlace para crear una contraseña nueva.">
      <form className={s.form} onSubmit={onSubmit} noValidate>
        {linkNotice ? <Alert variant="info">{linkNotice}</Alert> : null}
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Field label="Correo electrónico" id="recover-email" error={fieldError}>
          <TextInput
            id="recover-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldError}
            required
          />
        </Field>
        <div className={s.actions}>
          <SubmitButton loading={loading} loadingText="Enviando…" disabled={!configured}>
            Enviar enlace
          </SubmitButton>
          <ButtonLink href="/login" variant="ghost">
            Volver a iniciar sesión
          </ButtonLink>
        </div>
      </form>
    </AuthCard>
  );
}
