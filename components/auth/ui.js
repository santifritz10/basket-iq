"use client";

import { useId, useState } from "react";
import { LuEye, LuEyeOff, LuCircleAlert, LuCircleCheck, LuInfo, LuCheck, LuCircle } from "react-icons/lu";
import { checkPassword } from "@/lib/auth/password";
import { BrandLogo } from "@/components/auth/BrandLogo";
import s from "@/components/auth/auth.module.css";

export function AuthCard({ title, subtitle, children, wide = false }) {
  return (
    <div className={`${s.panel} ${wide ? s.panelWide : ""}`}>
      <div className={s.mobileBrand}>
        <BrandLogo size={92} />
      </div>
      <section className={s.card} aria-labelledby={title ? "auth-title" : undefined}>
        {title ? (
          <h1 id="auth-title" className={s.title}>
            {title}
          </h1>
        ) : null}
        {subtitle ? <p className={s.subtitle}>{subtitle}</p> : null}
        {children}
      </section>
      <p className={s.credit}>Basket Lab · By Coach Fritz</p>
    </div>
  );
}

export function Field({ label, optional, error, hint, children, id, aside }) {
  return (
    <div className={s.field}>
      <div className={s.labelRow}>
        <label className={s.label} htmlFor={id}>
          {label} {optional ? <span className={s.optional}>(opcional)</span> : null}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className={s.fieldError} id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={s.hint} id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ id, error, hint, className = "", ...props }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <input
      id={id}
      className={`${s.input} ${className}`}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={describedBy}
      {...props}
    />
  );
}

export function PasswordInput({ id, error, hint, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={s.inputWrap}>
      <TextInput
        id={id}
        error={error}
        hint={hint}
        type={visible ? "text" : "password"}
        className={s.inputWithToggle}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...props}
      />
      <button
        type="button"
        className={s.toggle}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        aria-controls={id}
      >
        {visible ? <LuEyeOff size={19} aria-hidden /> : <LuEye size={19} aria-hidden />}
      </button>
    </div>
  );
}

export function PasswordRules({ value, id }) {
  const rules = checkPassword(value);
  return (
    <ul className={s.rules} id={id} aria-label="Requisitos de la contraseña">
      {rules.map((rule) => (
        <li key={rule.id} className={rule.ok ? s.ruleOk : undefined}>
          {rule.ok ? <LuCheck size={14} aria-hidden /> : <LuCircle size={12} aria-hidden />}
          {rule.label}
          <span className={s.srOnly}>{rule.ok ? " (cumplido)" : " (pendiente)"}</span>
        </li>
      ))}
    </ul>
  );
}

export function SubmitButton({ loading, loadingText, children, disabled, variant, type = "submit", ...props }) {
  const variantClass = variant === "secondary" ? s.buttonSecondary : variant === "ghost" ? s.buttonGhost : "";
  return (
    <button
      type={type}
      className={`${s.button} ${variantClass}`}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      {...props}
    >
      {loading ? <span className={s.spinner} aria-hidden /> : null}
      {loading ? loadingText || children : children}
    </button>
  );
}

export function ButtonLink({ href, children, variant }) {
  const variantClass = variant === "secondary" ? s.buttonSecondary : variant === "ghost" ? s.buttonGhost : "";
  return (
    <a href={href} className={`${s.button} ${variantClass}`}>
      {children}
    </a>
  );
}

const ALERT_ICONS = { error: LuCircleAlert, success: LuCircleCheck, info: LuInfo };
const ALERT_CLASSES = { error: s.alertError, success: s.alertSuccess, info: s.alertInfo };

export function Alert({ variant = "info", children }) {
  if (!children) return null;
  const Icon = ALERT_ICONS[variant] || LuInfo;
  return (
    <div className={`${s.alert} ${ALERT_CLASSES[variant] || ""}`} role={variant === "error" ? "alert" : "status"}>
      <Icon size={18} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function StatusView({ icon: Icon, tone = "accent", title, children, actions }) {
  const toneClass = tone === "success" ? s.statusIconSuccess : tone === "error" ? s.statusIconError : "";
  return (
    <div className={s.status}>
      {Icon ? (
        <div className={`${s.statusIcon} ${toneClass}`} aria-hidden>
          <Icon size={30} />
        </div>
      ) : null}
      <h1 id="auth-title" className={s.title}>
        {title}
      </h1>
      <div className={s.subtitle}>{children}</div>
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </div>
  );
}

export function AuthLoading({ label = "Cargando…" }) {
  return (
    <div className={s.panel}>
      <div className={s.loading} role="status" aria-live="polite">
        <BrandLogo size={96} />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function useFieldId(name) {
  const base = useId();
  return `${name}-${base.replace(/:/g, "")}`;
}

export { s as authStyles };
