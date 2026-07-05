"use client";

import { useState } from "react";
import { inviteMember } from "@/lib/client/player-api";

export default function InviteMemberForm({ playerId, onInvited }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setStatus("");
    setToken("");
    try {
      const result = await inviteMember(playerId, {
        email: email.trim().toLowerCase(),
        relationship_type: "coach",
        access_level: "editor"
      });
      setStatus("Invitación enviada.");
      if (result.token) setToken(result.token);
      setEmail("");
      onInvited?.();
    } catch (err) {
      setStatus("Error: " + (err.message || "No se pudo invitar"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="player-tab-card" onSubmit={submit} style={{ marginTop: 12 }}>
      <h4>Invitar colaborador</h4>
      <p className="text-muted">Invitá a un entrenador u otro usuario para trabajar sobre este perfil.</p>
      <div className="form-row">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          required
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="toolbar-button toolbar-button-accent" disabled={loading}>
          {loading ? "Enviando…" : "Enviar invitación"}
        </button>
      </div>
      {status ? <p>{status}</p> : null}
      {token ? (
        <p className="text-muted" style={{ wordBreak: "break-all" }}>
          Token de invitación (compartir con el invitado): <code>{token}</code>
        </p>
      ) : null}
    </form>
  );
}
