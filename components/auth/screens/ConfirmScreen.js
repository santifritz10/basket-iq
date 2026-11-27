"use client";

import { useEffect, useState } from "react";
import { LuCircleCheck, LuLink2Off, LuTriangleAlert } from "react-icons/lu";
import { useAuthContext, goTo } from "@/components/auth/AuthProvider";
import { AuthCard, AuthLoading, ButtonLink, StatusView } from "@/components/auth/ui";
import { syncServerSession } from "@/lib/client/supabase-browser";
import { authErrorCode, logAuthIssue } from "@/lib/auth/messages";
import { markRecoveryContext } from "@/components/auth/recovery-context";

const OTP_TYPES = new Set(["email", "signup", "recovery", "email_change", "invite", "magiclink"]);
const EXPIRED_CODES = new Set(["otp_expired", "flow_state_expired", "access_denied"]);

/** Una sola ejecución por carga (React StrictMode monta dos veces en dev). */
let pending = null;

function readCallback() {
  const url = new URL(window.location.href);
  const q = url.searchParams;
  const h = new URLSearchParams(url.hash.replace(/^#/, ""));
  return {
    tokenHash: q.get("token_hash") || "",
    type: (q.get("type") || h.get("type") || "").toLowerCase(),
    next: q.get("next") || "",
    hasHashSession: Boolean(h.get("access_token")),
    errorCode: (q.get("error_code") || h.get("error_code") || q.get("error") || h.get("error") || "").toLowerCase()
  };
}

async function runConfirmation(getSupabase) {
  const cb = readCallback();
  const supabase = getSupabase();
  // Crear el cliente procesa un posible #access_token (plantillas por defecto
  // de Supabase). getSession espera a que termine.
  const initial = await supabase.auth.getSession();
  // Sacamos los tokens de la barra de direcciones y del historial.
  window.history.replaceState(null, "", "/auth/confirm");

  if (cb.errorCode) {
    return { ok: false, type: cb.type, reason: EXPIRED_CODES.has(cb.errorCode) ? "expired" : "invalid", code: cb.errorCode };
  }

  let session = null;
  let user = null;
  if (cb.tokenHash) {
    if (!OTP_TYPES.has(cb.type)) return { ok: false, type: cb.type, reason: "invalid", code: "bad_type" };
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: cb.tokenHash, type: cb.type });
    if (error) {
      const code = logAuthIssue("verify_otp", error);
      const reason = code === "otp_expired" || /expired|invalid/i.test(error.message || "") ? "expired" : "error";
      return { ok: false, type: cb.type, reason, code };
    }
    session = data?.session || null;
    user = data?.user || null;
    if (!session && cb.type === "email_change") return { ok: true, type: cb.type, partial: true };
  } else if (cb.hasHashSession) {
    session = initial.data?.session || null;
    if (!session) {
      logAuthIssue("hash_session", initial.error);
      return { ok: false, type: cb.type, reason: "expired", code: authErrorCode(initial.error) };
    }
    user = session.user;
  } else {
    return { ok: false, type: cb.type, reason: "invalid", code: "missing_token" };
  }

  if (!session) return { ok: false, type: cb.type, reason: "error", code: "no_session" };
  await syncServerSession(session);
  return { ok: true, type: cb.type, next: cb.next, user: user || session.user, oauth: !cb.type };
}

export default function ConfirmScreen() {
  const { getSupabase, safeNext, configured } = useAuthContext();
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    if (!configured) {
      setState({ status: "done", result: { ok: false, reason: "error", code: "not_configured" } });
      return;
    }
    if (!pending) pending = runConfirmation(getSupabase).catch((err) => {
      logAuthIssue("confirm", err);
      return { ok: false, reason: "error", code: authErrorCode(err) };
    });
    let cancelled = false;
    pending.then((result) => {
      if (cancelled) return;
      if (result.ok && !result.partial) {
        if (result.type === "recovery") {
          markRecoveryContext(result.user?.id);
          goTo("/nueva-contrasena");
          return;
        }
        if (result.type === "email_change") {
          setState({ status: "done", result });
          return;
        }
        const isNewUser = result.user?.created_at && Date.now() - Date.parse(result.user.created_at) < 15 * 60 * 1000;
        const fallback = result.oauth ? (isNewUser ? "/bienvenida" : "/") : "/bienvenida";
        goTo(safeNext(result.next, fallback));
        return;
      }
      setState({ status: "done", result });
    });
    return () => {
      cancelled = true;
    };
  }, [configured, getSupabase, safeNext]);

  if (state.status === "loading") return <AuthLoading label="Validando el enlace…" />;

  const { result } = state;
  if (result.ok && result.type === "email_change") {
    return (
      <AuthCard>
        <StatusView
          icon={LuCircleCheck}
          tone="success"
          title={result.partial ? "Falta un paso" : "Tu correo se actualizó"}
          actions={<ButtonLink href="/">Ir a Basket Lab</ButtonLink>}
        >
          {result.partial
            ? "Registramos esta confirmación. Abrí también el enlace que enviamos a la otra dirección para completar el cambio."
            : "A partir de ahora usá tu nuevo correo para iniciar sesión."}
        </StatusView>
      </AuthCard>
    );
  }

  const isRecovery = result.type === "recovery";
  const isSignup = ["signup", "email", "invite", ""].includes(result.type || "");
  const expired = result.reason === "expired";

  return (
    <AuthCard>
      <StatusView
        icon={expired ? LuLink2Off : LuTriangleAlert}
        tone="error"
        title={expired ? "Este enlace venció" : result.reason === "invalid" ? "Enlace no válido" : "No pudimos validar el enlace"}
        actions={
          isRecovery ? (
            <>
              <ButtonLink href={`/recuperar-contrasena?motivo=${expired ? "vencido" : "invalido"}`}>Pedir un enlace nuevo</ButtonLink>
              <ButtonLink href="/login" variant="ghost">
                Volver a iniciar sesión
              </ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink href="/login">Iniciar sesión</ButtonLink>
              {isSignup ? (
                <ButtonLink href="/verificar-correo" variant="secondary">
                  Reenviar correo de confirmación
                </ButtonLink>
              ) : null}
            </>
          )
        }
      >
        {expired
          ? isRecovery
            ? "Los enlaces para cambiar la contraseña duran poco tiempo y se pueden usar una sola vez. Pedí uno nuevo para continuar."
            : "Los enlaces de confirmación se pueden usar una sola vez y vencen. Si ya confirmaste tu cuenta, iniciá sesión. Si no, pedí un correo nuevo."
          : result.reason === "invalid"
            ? "El enlace está incompleto o no corresponde a Basket Lab. Abrilo directamente desde el último correo que recibiste."
            : "No pudimos procesar la solicitud. Intentá nuevamente más tarde."}
        {result.code ? (
          <span style={{ display: "block", marginTop: 12, fontSize: "0.75rem", opacity: 0.6 }}>Código de referencia: {result.code}</span>
        ) : null}
      </StatusView>
    </AuthCard>
  );
}
