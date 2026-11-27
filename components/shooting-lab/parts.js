"use client";

import { PROVENANCE, legacyZonesToMap, pctLabel, summarizeEntries, summarizeZoneMap } from "@/lib/shooting/model";
import { STATUS_LABEL, formatDate } from "./api";
import styles from "./lab.module.css";

export function cx(...names) {
  return names.filter(Boolean).join(" ");
}

/** Totales de una sesión con lo que el usuario puede ver (y nada más). */
export function sessionTotals(session, entriesOfSession, playerId = null) {
  if (session.recording_mode === "entries") {
    const s = summarizeEntries(entriesOfSession || [], playerId ? { playerId } : {});
    return { fg: s.fg, ft: s.ft };
  }
  const s = summarizeZoneMap(legacyZonesToMap(session.legacy_zones));
  return { fg: s.fg, ft: s.ft };
}

export function groupEntriesBySession(entries) {
  const out = {};
  (entries || []).forEach((e) => {
    if (e.voided_at) return;
    (out[e.session_id] = out[e.session_id] || []).push(e);
  });
  return out;
}

export function StatusBadge({ status }) {
  const cls = status === "in_progress" ? styles.badgeLive : status === "draft" ? styles.badgeDraft : "";
  return <span className={cx(styles.badge, cls)}>{STATUS_LABEL[status] || status}</span>;
}

export function ProvenanceBadge({ provenance }) {
  if (provenance === "entries") return null;
  return (
    <span className={cx(styles.badge, styles.badgeLegacy)} title={PROVENANCE[provenance]?.label}>
      {PROVENANCE[provenance]?.short || "Histórico"}
    </span>
  );
}

export function playerNames(ids, playersById, max = 3) {
  const names = (ids || []).map((id) => playersById[id]?.display_name || "Jugador");
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max}`;
}

/**
 * playerId: si se está viendo un jugador, muestra solo sus números.
 * En una sesión grupal histórica el número es del grupo y se aclara.
 */
export function SessionItem({ session, entries, playersById, onOpen, playerId = null }) {
  const t = sessionTotals(session, entries, playerId);
  const groupOnly = session.provenance === "legacy_group";
  const whose = groupOnly ? " del grupo" : playerId && session.recording_mode === "entries" ? ` de ${playersById[playerId]?.display_name?.split(" ")[0] || "jugador"}` : "";
  return (
    <li className={styles.sessionItem}>
      <button type="button" className={styles.sessionItemBtn} onClick={() => onOpen(session.id)}>
        <div className={styles.sessionName}>{session.nombre}</div>
        <div className={styles.sessionMeta}>
          <span>{formatDate(session.fecha)}</span>
          <StatusBadge status={session.status} />
          <ProvenanceBadge provenance={session.provenance} />
          <span>{playerNames(session.player_ids, playersById)}</span>
          {session.hidden_participants ? <span>+{session.hidden_participants} sin acceso</span> : null}
        </div>
      </button>
      <div className={styles.sessionStat}>
        {t.fg.attempts ? (
          <>
            <strong>{pctLabel(t.fg.made, t.fg.attempts)}</strong>
            {t.fg.made}/{t.fg.attempts} campo{whose}
          </>
        ) : (
          <span>Sin tiros de campo</span>
        )}
        {t.ft.attempts ? (
          <div>
            TL {t.ft.made}/{t.ft.attempts}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function Kpi({ label, made, attempts, sub, value }) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value ?? (attempts ? pctLabel(made, attempts) : "—")}</div>
      <div className={styles.kpiSub}>{sub ?? (attempts ? `${made}/${attempts}` : "Sin intentos")}</div>
    </div>
  );
}

export function Notice({ kind = "info", children }) {
  const cls = kind === "warn" ? styles.noticeWarn : kind === "error" ? styles.noticeError : styles.noticeInfo;
  return (
    <div className={cx(styles.notice, cls)} role={kind === "error" ? "alert" : "status"}>
      <div>{children}</div>
    </div>
  );
}

export function Segment({ options, value, onChange, label }) {
  return (
    <div className={styles.segment} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={cx(styles.segmentBtn, value === o.id && styles.segmentBtnActive)}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
