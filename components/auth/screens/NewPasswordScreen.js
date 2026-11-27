"use client";

import { useRef, useState } from "react";
import { LuCircleCheck, LuLink2Off } from "react-icons/lu";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useBrowserSession } from "@/components/auth/useSession";
import {
  Alert,
  AuthCard,
  AuthLoading,
  ButtonLink,
  Field,
  PasswordInput,
  PasswordRules,
  StatusView,
  SubmitButton,
  authStyles as s
} from "@/components/auth/ui";
import { clearRecoveryContext, readRecoveryContext } from "@/components/auth/recovery-context";
import { clearServerSession } from "@/lib/client/supabase-browser";
import { describeAuthError, logAuthIssue } from "@/lib/auth/messages";
import { isPasswordValid } from "@/lib/auth/password";

export default function NewPasswordScreen() {
  const { getSupabase } = useAuthContext();
  const session = useBrowserSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const submitting = useRef(false);

  if (session.status === "loading") return <AuthLoading label="Validando el enlace…" />;

  if (done) {
    return (
      <AuthCard>
        <StatusView
          icon={LuCircleCheck}
          tone="success"
          title="Contraseña actualizada"
          actions={<ButtonLink href="/login?motivo=contrasena-actualizada">Iniciar sesión</ButtonLink>}
        >
          Tu contraseña se actualizó correctamente. Por seguridad cerramos tus sesiones abiertas: iniciá sesión con la contraseña
          nueva.
        </StatusView>
      </AuthCard>
    );
  }

  const validContext = session.status === "active" && readRecoveryContext(session.user?.id);
  if (!validContext || error?.key === "sessionMissing") {
    return (
      <AuthCard>
        <StatusView
          icon={LuLink2Off}
          tone="error"
          title="Necesitamos un enlace nuevo"
          actions={
            <>
              <ButtonLink href="/recuperar-contrasena?motivo=vencido">Pedir un enlace nuevo</ButtonLink>
              <ButtonLink href="/login" variant="ghost">
                Volver a iniciar sesión
              </ButtonLink>
            </>
          }
        >
          Para crear una contraseña nueva tenés que abrir el enlace de recuperación que te enviamos por correo. El enlace vence en
          poco tiempo y se puede usar una sola vez.
        </StatusView>
      </AuthCard>
    );
  }

  const errors = {
    password: isPasswordValid(password) ? "" : "La contraseña no cumple los requisitos.",
    confirm: !confirm ? "Repetí la contraseña." : confirm !== password ? "Las contraseñas no coinciden." : ""
  };

  async function onSubmit(ev) {
    ev.preventDefault();
    if (submitting.current) return;
    setTouched({ password: true, confirm: true });
    setError(null);
    if (errors.password || errors.confirm) return;
    submitting.current = true;
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        logAuthIssue("update_password", updateError);
        setError(describeAuthError(updateError));
        return;
      }
      clearRecoveryContext();
      // Cierra la sesión en todos los dispositivos (incluida esta).
      await supabase.auth.signOut({ scope: "global" }).catch(() => supabase.auth.signOut({ scope: "local" }));
      await clearServerSession();
      setDone(true);
    } catch (err) {
      logAuthIssue("update_password", err);
      setError(describeAuthError(err));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Creá una contraseña nueva" subtitle="Elegí una contraseña que no uses en otros sitios.">
      <form className={s.form} onSubmit={onSubmit} noValidate>
        {error ? <Alert variant="error">{error.message}</Alert> : null}
        {session.user?.email ? (
          <p className={s.hint} style={{ margin: 0 }}>
            Cuenta: <strong>{session.user.email}</strong>
          </p>
        ) : null}
        <input type="email" name="username" autoComplete="username" value={session.user?.email || ""} readOnly hidden />
        <Field label="Contraseña nueva" id="np-password" error={touched.password ? errors.password : ""}>
          <PasswordInput
            id="np-password"
            autoComplete="new-password"
            placeholder="Contraseña nueva"
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={touched.password ? errors.password : ""}
            required
          />
          <PasswordRules value={password} id="np-rules" />
        </Field>
        <Field label="Confirmar contraseña nueva" id="np-confirm" error={touched.confirm ? errors.confirm : ""}>
          <PasswordInput
            id="np-confirm"
            autoComplete="new-password"
            placeholder="Repetí la contraseña"
            maxLength={72}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
            error={touched.confirm ? errors.confirm : ""}
            required
          />
        </Field>
        <div className={s.actions}>
          <SubmitButton loading={loading} loadingText="Guardando…">
            Guardar contraseña
          </SubmitButton>
        </div>
      </form>
    </AuthCard>
  );
}
