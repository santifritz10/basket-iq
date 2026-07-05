"use client";

import { useState } from "react";
import { acceptInvitation } from "@/lib/client/player-api";

export default function AcceptInvitationPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    setStatus("");
    try {
      await acceptInvitation(token.trim());
      setStatus("Invitación aceptada. Ya podés ver el perfil del jugador en Seguimiento de Jugadores.");
    } catch (err) {
      setStatus("Error: " + (err.message || "No se pudo aceptar"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="manual-section players-view">
      <h1 style={{ marginTop: 0 }}>Aceptar invitación</h1>
      <p>Ingresá el token que recibiste para vincular tu cuenta al perfil de un jugador.</p>
      <form onSubmit={submit} className="player-tab-card" style={{ maxWidth: 520 }}>
        <div className="form-row">
          <label>Token de invitación</label>
          <input value={token} onChange={(e) => setToken(e.target.value)} required />
        </div>
        <div className="form-actions">
          <button type="submit" className="toolbar-button toolbar-button-accent" disabled={loading}>
            {loading ? "Procesando…" : "Aceptar invitación"}
          </button>
        </div>
        {status ? <p>{status}</p> : null}
      </form>
    </section>
  );
}
