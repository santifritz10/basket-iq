"use client";

import { useState } from "react";
import { inviteMember } from "@/lib/client/player-api";
import { ACCESS_LEVELS, RELATIONSHIP_TYPES } from "@/lib/player-domain/membership-rules";

export default function InviteMemberForm({ playerId, onInvited }) {
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("coach");
  const [access, setAccess] = useState("viewer");
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
        relationship_type: relationship,
        access_level: access
      });
      setStatus("Invitación creada.");
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
      <p className="text-muted">
        El rol describe el vínculo con el jugador; el permiso define qué puede hacer. Elegir un rol no da permisos.
      </p>
      <div className="form-row">
        <label>Rol</label>
        <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
          {RELATIONSHIP_TYPES.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label>Permiso</label>
        <select value={access} onChange={(e) => setAccess(e.target.value)}>
          {ACCESS_LEVELS.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </div>
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
