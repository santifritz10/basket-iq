"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCard() {
  const [tab, setTab] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onLogin(ev) {
    ev.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(ev.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(fd.get("email") || "").trim(),
        password: String(fd.get("password") || "")
      })
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      setError(data.error || "No se pudo iniciar sesión.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function onRegister(ev) {
    ev.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(ev.currentTarget);
    const password = String(fd.get("password") || "");
    const password2 = String(fd.get("password2") || "");
    if (password !== password2) {
      setLoading(false);
      setError("Las contraseñas no coinciden.");
      return;
    }
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: String(fd.get("username") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        name: String(fd.get("name") || "").trim(),
        password
      })
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) {
      setError(data.error || "No se pudo registrar.");
      return;
    }
    if (data.pendingEmailConfirmation) {
      setTab("login");
      setError("Registro creado. Confirmá tu correo y luego iniciá sesión.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <section
      style={{
        width: "100%",
        maxWidth: 420,
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: 16,
        padding: 20,
        background: "rgba(255,255,255,.03)"
      }}
    >
      <h1 style={{ marginTop: 0 }}>Basket IQ</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button className="player-tab-btn" onClick={() => setTab("login")} style={{ opacity: tab === "login" ? 1 : 0.7 }}>
          Login
        </button>
        <button className="player-tab-btn" onClick={() => setTab("register")} style={{ opacity: tab === "register" ? 1 : 0.7 }}>
          Registro
        </button>
      </div>

      {tab === "login" ? (
        <form onSubmit={onLogin}>
          <div className="form-row">
            <label>Email</label>
            <input name="email" type="email" required />
          </div>
          <div className="form-row">
            <label>Contraseña</label>
            <input name="password" type="password" required />
          </div>
          <div className="form-actions">
            <button className="toolbar-button toolbar-button-accent" type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={onRegister}>
          <div className="form-row">
            <label>Usuario</label>
            <input name="username" required />
          </div>
          <div className="form-row">
            <label>Nombre</label>
            <input name="name" />
          </div>
          <div className="form-row">
            <label>Email</label>
            <input name="email" type="email" required />
          </div>
          <div className="form-row">
            <label>Contraseña</label>
            <input name="password" type="password" required />
          </div>
          <div className="form-row">
            <label>Repetir contraseña</label>
            <input name="password2" type="password" required />
          </div>
          <div className="form-actions">
            <button className="toolbar-button toolbar-button-accent" type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear cuenta"}
            </button>
          </div>
        </form>
      )}
      {error ? <p style={{ color: "#ffb4a9", marginBottom: 0 }}>{error}</p> : null}
    </section>
  );
}
