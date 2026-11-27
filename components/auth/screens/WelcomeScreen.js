"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthContext, goTo } from "@/components/auth/AuthProvider";
import { useRequiredSession } from "@/components/auth/useRequiredSession";
import ProfileFields from "@/components/auth/ProfileFields";
import { Alert, AuthCard, AuthLoading, SubmitButton, authStyles as s } from "@/components/auth/ui";
import { loadOwnProfile, saveOwnProfile } from "@/lib/client/profile-api";
import { sanitizeProfileInput, validateProfileInput } from "@/lib/auth/profile";
import { describeAuthError, logAuthIssue } from "@/lib/auth/messages";

/** Bienvenida y configuración inicial (todo opcional salvo el nombre). */
export default function WelcomeScreen() {
  const { getSupabase } = useAuthContext();
  const session = useRequiredSession("/bienvenida");
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (session.status !== "active") return;
    loadOwnProfile(getSupabase(), session.user)
      .then((p) => setValues({ full_name: p.full_name, sport_role: p.sport_role, club: p.club || "", categories: p.categories || [] }))
      .catch(() => setValues({ full_name: session.user?.user_metadata?.full_name || "", sport_role: null, club: "", categories: [] }));
  }, [session.status, session.user, getSupabase]);

  if (session.status !== "active" || !values) return <AuthLoading label="Preparando tu cuenta…" />;

  async function onSubmit(ev) {
    ev.preventDefault();
    if (submitting.current) return;
    const clean = sanitizeProfileInput(values);
    const errs = validateProfileInput(clean);
    setErrors(errs);
    setError("");
    if (Object.keys(errs).length) return;
    submitting.current = true;
    setLoading(true);
    try {
      await saveOwnProfile(getSupabase(), session.user, clean, { completeOnboarding: true });
      goTo("/");
    } catch (err) {
      logAuthIssue("onboarding_save", err);
      setError(describeAuthError(err).message);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  const firstName = (values.full_name || "").split(" ")[0];

  return (
    <AuthCard
      wide
      title={firstName ? `¡Bienvenido/a, ${firstName}!` : "¡Bienvenido/a a Basket Lab!"}
      subtitle="Tu cuenta ya está activa. Contanos un poco sobre tu trabajo para personalizar tu experiencia. Podés completarlo ahora o más tarde."
    >
      <form className={s.form} onSubmit={onSubmit} noValidate>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <ProfileFields values={values} onChange={setValues} errors={errors} />
        <div className={s.actions}>
          <SubmitButton loading={loading} loadingText="Guardando…">
            Guardar y empezar
          </SubmitButton>
          <a className={`${s.button} ${s.buttonGhost}`} href="/">
            Omitir por ahora
          </a>
        </div>
      </form>
    </AuthCard>
  );
}
