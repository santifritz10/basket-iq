"use client";

import { useEffect, useState } from "react";
import { Notice, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { RELATIONSHIP_TYPES } from "@/lib/player-domain/membership-rules";
import { ACCESS_LABEL, devApi } from "./api";

const relLabel = (id) => RELATIONSHIP_TYPES.find((r) => r.id === id)?.label || id;
const levelLabel = (id) => ACCESS_LABEL[id] || id;
const fmt = (iso) => new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });

/**
 * Invitaciones que recibí: aparecen arriba del plantel cuando entro con el email invitado.
 * Si llegué por un enlace (?invite=código), muestra además la tarjeta para aceptarlo.
 */
export default function MyInvitations({ inviteToken, onAccepted, onTokenDone }) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [linkError, setLinkError] = useState(null);

  const load = () => devApi.myInvitations().then((r) => setList(r.invitations || [])).catch(() => setList([]));
  useEffect(() => {
    load();
  }, []);

  async function accept(body) {
    setBusy(true);
    setError(null);
    setLinkError(null);
    try {
      const r = await devApi.acceptInvitation(body);
      if (body.token) onTokenDone?.();
      await load();
      await onAccepted?.(r.player_id);
    } catch (e) {
      (body.token ? setLinkError : setError)(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function decline(id) {
    setBusy(true);
    setError(null);
    try {
      await devApi.declineInvitation(id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!inviteToken && !list.length) return null;

  return (
    <section className={lab.card} style={{ marginBottom: 20 }}>
      <div className={lab.cardHead}>
        <div>
          <h2 className={lab.cardTitle}>Invitaciones para vos</h2>
          <p className={lab.cardHint}>Al aceptar, el jugador aparece en tu plantel con el permiso que te dieron.</p>
        </div>
      </div>
      {inviteToken ? (
        <div className={lab.stack} style={{ marginBottom: list.length ? 12 : 0 }}>
          <p className={lab.subtle} style={{ margin: 0 }}>Abriste un enlace de invitación.</p>
          {linkError ? <Notice kind="error">{linkError}</Notice> : null}
          <div className={lab.btnRow}>
            <button type="button" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} disabled={busy} onClick={() => accept({ token: inviteToken })}>Aceptar invitación</button>
            <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} disabled={busy} onClick={() => onTokenDone?.()}>Ahora no</button>
          </div>
        </div>
      ) : null}
      {list.length ? (
        <ul className={lab.list}>
          {list.map((inv) => (
            <li key={inv.id} className={lab.sessionItem}>
              <div>
                <div className={lab.sessionName}>{inv.player_name || "Jugador"}</div>
                <div className={lab.sessionMeta}>
                  <span>Como {relLabel(inv.relationship_type).toLowerCase()}</span>
                  <span>Permiso: {levelLabel(inv.access_level)}</span>
                  <span>Vence el {fmt(inv.expires_at)}</span>
                </div>
              </div>
              <div className={lab.btnRow}>
                <button type="button" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} disabled={busy} onClick={() => accept({ invitation_id: inv.id })}>Aceptar</button>
                <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} disabled={busy} onClick={() => decline(inv.id)}>Rechazar</button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
    </section>
  );
}

/** Invitaciones pendientes de un jugador, para quien invita: ver a quién y anular. */
export function PendingInvitations({ playerId, refreshKey }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const load = () => devApi.playerInvitations(playerId).then((r) => setList(r.invitations || [])).catch(() => setList([]));
  useEffect(() => {
    load();
  }, [playerId, refreshKey]);
  if (!list?.length) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <h3 className={lab.sessionName} style={{ margin: "0 0 6px" }}>Invitaciones sin aceptar</h3>
      <ul className={lab.list}>
        {list.map((inv) => (
          <li key={inv.id} className={lab.sessionItem}>
            <div>
              <div className={lab.sessionName} style={{ wordBreak: "break-all" }}>{inv.email}</div>
              <div className={lab.sessionMeta}>
                <span>{relLabel(inv.relationship_type)}</span>
                <span>{levelLabel(inv.access_level)}</span>
                <span>{inv.expired ? "Vencida" : `Vence el ${fmt(inv.expires_at)}`}</span>
              </div>
            </div>
              <button
                type="button"
                className={cx(lab.btn, lab.btnGhost, lab.btnSmall)}
                onClick={() =>
                  devApi
                    .cancelInvitation(playerId, inv.id)
                    .then(load)
                    .catch((e) => setError(e.message))
                }
              >
                Anular
              </button>
          </li>
        ))}
      </ul>
      {error ? <Notice kind="error">{error}</Notice> : null}
    </div>
  );
}
