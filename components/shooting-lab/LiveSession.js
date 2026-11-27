"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FIELD_ZONES,
  PROVENANCE,
  activeEntries,
  legacyZonesToMap,
  longestMadeStreak,
  pctLabel,
  summarizeSession,
  summarizeZoneMap,
  tagById,
  tagsForZone,
  toggleTag,
  validateEntryInput,
  zoneById
} from "@/lib/shooting/model";
import { backoffMs, enqueue, isRetryable, mergeEntries, nextSeq, readQueue, removeConfirmed, writeQueue } from "@/lib/shooting/offline-queue";
import { STATUS_LABEL, formatDate, labApi, newClientId, safeStorage } from "./api";
import { Notice, ProvenanceBadge, Segment, StatusBadge, cx } from "./parts";
import ShotChart, { ShotChartLegend } from "./ShotChart";
import styles from "./lab.module.css";

const COLLECTIVE = "__collective__";

function strip(entry) {
  const { pending, ...rest } = entry;
  return rest;
}

export default function LiveSession({ sessionId, playersById, allPlayers, settings, onBack, onChanged, onOpenSession, onDeleted }) {
  const [session, setSession] = useState(null);
  const [serverEntries, setServerEntries] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); // "edit" | "delete"
  const [pendingCount, setPendingCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await labApi.session(sessionId);
      setSession(res.session);
      setServerEntries(res.entries || []);
      setLoadError(null);
    } catch (e) {
      setLoadError(e);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(body) {
    if (body?.action === "finish" && pendingCount > 0) {
      setActionError(`Esperá a que se guarden los ${pendingCount} registro(s) pendientes antes de finalizar.`);
      return false;
    }
    setBusy(true);
    setActionError(null);
    try {
      const res = await labApi.update(sessionId, body);
      setSession(res.session);
      setServerEntries(res.entries || []);
      onChanged?.();
      return true;
    } catch (e) {
      setActionError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    setBusy(true);
    setActionError(null);
    try {
      const res = await labApi.duplicate(sessionId);
      await onChanged?.();
      onOpenSession(res.session.id);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <>
        <button type="button" className={styles.backLink} onClick={onBack}>← Historial</button>
        <Notice kind="error">
          {loadError.status === 404 ? "La sesión no existe o no tenés acceso." : loadError.message}{" "}
          <button type="button" className={cx(styles.btn, styles.btnSmall)} onClick={load}>Reintentar</button>
        </Notice>
      </>
    );
  }
  if (!session) {
    return (
      <div className={styles.stack} aria-busy="true">
        <span className={styles.srOnly}>Cargando sesión…</span>
        <div className={styles.skeleton} style={{ height: 34, width: "50%" }} />
        <div className={styles.skeleton} style={{ height: 360 }} />
      </div>
    );
  }

  const isLegacy = session.recording_mode !== "entries";
  const canRecord = !isLegacy && session.can_edit && (session.status === "draft" || session.status === "in_progress");

  return (
    <>
      <button type="button" className={styles.backLink} onClick={onBack}>← Historial</button>
      <div className={styles.pageHead}>
        <div style={{ minWidth: 0 }}>
          <h1 className={styles.h1}>{session.nombre}</h1>
          <div className={styles.sessionMeta} style={{ marginTop: 6 }}>
            <span>{formatDate(session.fecha)}</span>
            <StatusBadge status={session.status} />
            <ProvenanceBadge provenance={session.provenance} />
            {session.hidden_participants ? <span>{session.hidden_participants} participante(s) sin acceso para vos</span> : null}
          </div>
        </div>
        <SessionActions
          session={session}
          busy={busy}
          isLegacy={isLegacy}
          onAction={act}
          onDuplicate={duplicate}
          onEdit={() => setDialog("edit")}
          onDelete={() => setDialog("delete")}
        />
      </div>
      {actionError ? <Notice kind="error">{actionError}</Notice> : null}
      {session.notes ? (
        <details className={cx(styles.card, styles.details)} style={{ marginBottom: 16 }} open={session.status === "draft"}>
          <summary>Notas de la sesión</summary>
          <p style={{ whiteSpace: "pre-wrap", margin: "10px 0 0", fontSize: 14 }}>{session.notes}</p>
        </details>
      ) : null}

      {isLegacy ? (
        <LegacyView session={session} settings={settings} playersById={playersById} />
      ) : (
        <EntriesView
          key={session.id}
          session={session}
          setSession={setSession}
          serverEntries={serverEntries}
          setServerEntries={setServerEntries}
          playersById={playersById}
          settings={settings}
          canRecord={canRecord}
          onStart={() => act({ action: "start" })}
          onChanged={onChanged}
          onPendingCount={setPendingCount}
        />
      )}

      {dialog === "edit" ? (
        <EditDialog
          session={session}
          serverEntries={serverEntries}
          allPlayers={allPlayers}
          playersById={playersById}
          onClose={() => setDialog(null)}
          onSave={async (body) => {
            const ok = await act(body);
            if (ok) setDialog(null);
            return ok;
          }}
          error={actionError}
        />
      ) : null}
      {dialog === "delete" ? <DeleteDialog session={session} onClose={() => setDialog(null)} onDeleted={onDeleted} /> : null}
    </>
  );
}

// ---------------------------------------------------------------------------

function SessionActions({ session, busy, isLegacy, onAction, onDuplicate, onEdit, onDelete }) {
  const s = session.status;
  const b = (label, onClick, kind = "ghost") => (
    <button type="button" disabled={busy} className={cx(styles.btn, styles.btnSmall, kind === "primary" ? styles.btnPrimary : kind === "danger" ? styles.btnDanger : styles.btnGhost)} onClick={onClick}>
      {label}
    </button>
  );
  return (
    <div className={styles.btnRow}>
      {session.can_edit && !isLegacy && s === "draft" ? b("Comenzar", () => onAction({ action: "start" }), "primary") : null}
      {session.can_edit && !isLegacy && (s === "draft" || s === "in_progress") ? b("Finalizar", () => onAction({ action: "finish" }), s === "in_progress" ? "primary" : "ghost") : null}
      {session.can_edit && !isLegacy && s === "completed" ? b("Reanudar", () => onAction({ action: "resume" })) : null}
      {session.can_edit && !isLegacy ? b("Editar", onEdit) : null}
      {!isLegacy ? b("Duplicar", onDuplicate) : null}
      {session.can_edit && s !== "archived" ? b("Archivar", () => onAction({ action: "archive" })) : null}
      {session.can_edit && s === "archived" ? b("Desarchivar", () => onAction({ action: "unarchive" })) : null}
      {session.can_delete ? b("Eliminar", onDelete, "danger") : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function LegacyView({ session, settings, playersById }) {
  const byZone = legacyZonesToMap(session.legacy_zones);
  const t = summarizeZoneMap(byZone);
  const group = session.provenance === "legacy_group";
  return (
    <div className={cx(styles.grid, styles.gridMain)}>
      <section className={styles.card}>
        <Notice kind={group ? "warn" : "info"}>
          <strong>{PROVENANCE[session.provenance]?.label}.</strong>{" "}
          {group
            ? "Estos números son el total del grupo. No se reparten entre los jugadores porque no se sabe cuánto tiró cada uno."
            : "Sesión cargada con el módulo anterior. Se conserva sin cambios y no admite registros nuevos."}
        </Notice>
        <ShotChart byZone={byZone} thresholds={settings.thresholds} minSample={settings.minSample} title={`Mapa de ${session.nombre}`} showRim={false} />
        <ShotChartLegend mode="efficiency" thresholds={settings.thresholds} minSample={settings.minSample} />
      </section>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>{group ? "Total del grupo" : "Resultado"}</h2>
        </div>
        <ZoneTable byZone={byZone} minSample={settings.minSample} total={t.fg} skip={["rim", "ft"]} />
        <p className={styles.subtle}>Participantes: {session.player_ids.map((id) => playersById[id]?.display_name || "Jugador").join(", ") || "—"}</p>
      </section>
    </div>
  );
}

function ZoneTable({ byZone, minSample, total, skip = [] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Zona</th>
            <th className={styles.num}>Aciertos/Intentos</th>
            <th className={styles.num}>%</th>
          </tr>
        </thead>
        <tbody>
          {[...FIELD_ZONES, zoneById("ft")]
            .filter((z) => !skip.includes(z.id))
            .map((z) => {
              const l = byZone[z.id] || { attempts: 0, made: 0 };
              return (
                <tr key={z.id}>
                  <td>{z.label}</td>
                  <td className={styles.num}>{l.attempts ? `${l.made}/${l.attempts}` : "—"}</td>
                  <td className={styles.num}>
                    {l.attempts ? pctLabel(l.made, l.attempts) : "sin datos"}
                    {l.attempts && l.attempts < minSample ? "*" : ""}
                  </td>
                </tr>
              );
            })}
          {total ? (
            <tr className={styles.rowTotal}>
              <td>Total de campo</td>
              <td className={styles.num}>{total.attempts ? `${total.made}/${total.attempts}` : "—"}</td>
              <td className={styles.num}>{total.attempts ? pctLabel(total.made, total.attempts) : "sin datos"}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------

function EntriesView({ session, setSession, serverEntries, setServerEntries, playersById, settings, canRecord, onStart, onChanged, onPendingCount }) {
  const storage = useMemo(() => safeStorage(), []);
  const [pending, setPending] = useState([]);
  const pendingRef = useRef([]);
  const [rejected, setRejected] = useState([]);
  const [sync, setSync] = useState({ state: "idle" });
  const flushing = useRef(false);
  const attempt = useRef(0);
  const timer = useRef(null);
  const changedTimer = useRef(null);

  const participants = session.player_ids;
  const [who, setWho] = useState(participants[0] || COLLECTIVE);
  const [mode, setMode] = useState("shot");
  const [zone, setZone] = useState(null);
  const [coords, setCoords] = useState(null);
  const [precise, setPrecise] = useState(false);
  const [tags, setTags] = useState([]);
  const [seriesForm, setSeriesForm] = useState({ attempts: "", made: "" });
  const [formErrors, setFormErrors] = useState([]);
  const [viewPlayer, setViewPlayer] = useState("");
  const [undoBusy, setUndoBusy] = useState(false);
  const [note, setNote] = useState(null);

  const setQueue = useCallback(
    (list) => {
      pendingRef.current = list;
      setPending(list);
      writeQueue(storage, session.id, list);
    },
    [storage, session.id]
  );

  // Recupera lo que quedó sin enviar (por ejemplo, si se cerró la pestaña sin señal).
  useEffect(() => {
    const saved = readQueue(storage, session.id);
    if (saved.length) setQueue(saved);
  }, [storage, session.id, setQueue]);

  const notifyChanged = useCallback(() => {
    clearTimeout(changedTimer.current);
    changedTimer.current = setTimeout(() => onChanged?.(), 1500);
  }, [onChanged]);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    const batch = pendingRef.current.slice(0, 200);
    if (!batch.length) {
      setSync({ state: "idle" });
      return;
    }
    flushing.current = true;
    clearTimeout(timer.current);
    setSync({ state: "saving" });
    try {
      const res = await labApi.addEntries(session.id, batch.map(strip));
      const saved = res.entries || [];
      setServerEntries((prev) => {
        const known = new Set(prev.map((e) => e.client_entry_id));
        return [...prev, ...saved.filter((e) => !known.has(e.client_entry_id))];
      });
      // Todo lo enviado quedó guardado (o ya existía): se quita de la cola.
      setQueue(removeConfirmed(pendingRef.current, batch.map((e) => e.client_entry_id)));
      attempt.current = 0;
      setSession((s) => (s.status === "draft" ? { ...s, status: "in_progress" } : s));
      setSync({ state: pendingRef.current.length ? "saving" : "idle" });
      notifyChanged();
    } catch (e) {
      if (isRetryable(e.status)) {
        const wait = backoffMs(attempt.current);
        attempt.current += 1;
        setSync({ state: e.status ? "error" : "offline", retryAt: Date.now() + wait, message: e.message });
        timer.current = setTimeout(() => {
          flushing.current = false;
          flush();
        }, wait);
        flushing.current = false;
        return;
      }
      // Rechazo definitivo (validación, permisos o sesión cerrada): no se reintenta.
      setQueue(removeConfirmed(pendingRef.current, batch.map((e) => e.client_entry_id)));
      setRejected((cur) => [...cur, ...batch.map((b) => ({ ...b, error: e.message }))]);
      setSync({ state: "idle" });
    } finally {
      if (flushing.current) {
        flushing.current = false;
        if (pendingRef.current.length && attempt.current === 0) flush();
      }
    }
  }, [session.id, setQueue, setServerEntries, setSession, notifyChanged]);

  useEffect(() => {
    if (pending.length && !flushing.current && !timer.current) flush();
  }, [pending, flush]);

  useEffect(() => {
    const onOnline = () => {
      clearTimeout(timer.current);
      timer.current = null;
      attempt.current = 0;
      flush();
    };
    const onUnload = (ev) => {
      if (pendingRef.current.length) {
        ev.preventDefault();
        ev.returnValue = "";
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onUnload);
      clearTimeout(timer.current);
      clearTimeout(changedTimer.current);
    };
  }, [flush]);

  // Cuando un reintento programado se dispara, se limpia la referencia.
  useEffect(() => {
    if (sync.state === "saving" || sync.state === "idle") timer.current = null;
  }, [sync.state]);

  useEffect(() => {
    onPendingCount?.(pending.length);
  }, [pending.length, onPendingCount]);

  const all = useMemo(() => mergeEntries(serverEntries, pending), [serverEntries, pending]);
  const live = useMemo(() => activeEntries(all), [all]);
  const summary = useMemo(() => summarizeSession(live, participants), [live, participants]);

  const allowedTags = zone ? tagsForZone(zone) : [];

  function pickZone(id) {
    setZone(id);
    setCoords(null);
    setTags((cur) => cur.filter((t) => tagsForZone(id).some((x) => x.id === t)));
  }

  function baseEntry() {
    return {
      client_entry_id: newClientId(),
      scope: who === COLLECTIVE ? "collective" : "player",
      player_id: who === COLLECTIVE ? null : who,
      zone_id: zone,
      tags,
      x_m: coords && mode === "shot" ? coords.x : null,
      y_m: coords && mode === "shot" ? coords.y : null,
      recorded_at: new Date().toISOString(),
      session_id: session.id
    };
  }

  function record(made) {
    if (!zone) {
      setNote("Elegí una zona primero.");
      return;
    }
    const entry = { ...baseEntry(), entry_type: "shot", attempts: 1, made: made ? 1 : 0, seq: nextSeq(all) };
    const v = validateEntryInput(entry);
    if (!v.ok) {
      setNote(v.errors[0]);
      return;
    }
    setNote(null);
    setQueue(enqueue(pendingRef.current, entry));
    if (coords) setCoords(null);
    try {
      navigator.vibrate?.(made ? 18 : [10, 40, 10]);
    } catch {
      /* sin vibración */
    }
  }

  function addSeries(ev) {
    ev.preventDefault();
    const entry = {
      ...baseEntry(),
      entry_type: "series",
      attempts: seriesForm.attempts === "" ? NaN : Number(seriesForm.attempts),
      made: seriesForm.made === "" ? NaN : Number(seriesForm.made),
      seq: null,
      x_m: null,
      y_m: null
    };
    const v = validateEntryInput(entry);
    const errs = [...(zone ? [] : ["Elegí una zona."]), ...v.errors.filter((e) => !(zone ? false : e === "Elegí una zona."))];
    if (!v.ok || !zone) {
      setFormErrors([...new Set(errs)]);
      return;
    }
    setFormErrors([]);
    setQueue(enqueue(pendingRef.current, { ...entry, attempts: v.value.attempts, made: v.value.made }));
    setSeriesForm({ attempts: "", made: "" });
  }

  const lastEntry = useMemo(() => {
    const list = live.slice().sort((a, b) => String(a.recorded_at || a.created_at).localeCompare(String(b.recorded_at || b.created_at)));
    return list[list.length - 1] || null;
  }, [live]);

  async function undo() {
    if (!lastEntry) return;
    if (lastEntry.pending) {
      if (flushing.current) {
        setNote("Guardando… probá deshacer en un segundo.");
        return;
      }
      setQueue(pendingRef.current.filter((e) => e.client_entry_id !== lastEntry.client_entry_id));
      return;
    }
    setUndoBusy(true);
    try {
      const res = await labApi.voidEntry(session.id, lastEntry.id);
      setServerEntries((prev) => prev.map((e) => (e.id === res.entry.id ? res.entry : e)));
      setNote(null);
      notifyChanged();
    } catch (e) {
      setNote(e.status ? e.message : "Sin conexión: no se puede deshacer un tiro ya guardado hasta que vuelva la señal.");
    } finally {
      setUndoBusy(false);
    }
  }

  const nameOf = (e) => (e.player_id ? playersById[e.player_id]?.display_name || "Jugador" : "Grupo (sin atribuir)");
  const whoLabel = who === COLLECTIVE ? "Grupo (sin atribuir)" : playersById[who]?.display_name || "Jugador";
  const viewSummary = viewPlayer === "" ? summary.group : viewPlayer === COLLECTIVE ? summary.collective : summary.perPlayer[viewPlayer];
  const dots = live
    .filter((e) => e.x_m != null && e.y_m != null && (viewPlayer === "" || (viewPlayer === COLLECTIVE ? !e.player_id : e.player_id === viewPlayer)))
    .map((e) => ({ x: e.x_m, y: e.y_m, made: e.made === 1 }));
  const feed = live.slice(-15).reverse();
  const hasCollective = summary.collective.fg.attempts + summary.collective.ft.attempts > 0;

  const syncLine = (() => {
    if (sync.state === "offline") return { cls: styles.dotError, text: `Sin conexión · ${pending.length} pendiente(s) guardado(s) en este dispositivo` };
    if (sync.state === "error") return { cls: styles.dotWarn, text: `${pending.length} pendiente(s) · reintentando` };
    if (pending.length) return { cls: styles.dotWarn, text: `Guardando ${pending.length}…` };
    return { cls: "", text: "Todo guardado" };
  })();

  return (
    <>
      {session.status === "draft" && canRecord ? (
        <Notice kind="info">
          Sesión en borrador. Podés empezar a registrar directamente o tocar{" "}
          <button type="button" className={cx(styles.btn, styles.btnSmall)} onClick={onStart}>Comenzar</button>
        </Notice>
      ) : null}
      {!canRecord && (session.status === "completed" || session.status === "archived") && session.can_edit ? (
        <Notice kind="info">Sesión {STATUS_LABEL[session.status].toLowerCase()}. Para corregir o sumar tiros, reanudala.</Notice>
      ) : null}
      {!session.can_edit ? <Notice kind="info">Tenés acceso de lectura: podés ver los resultados pero no registrar.</Notice> : null}
      {rejected.length ? (
        <Notice kind="error">
          {rejected.length} registro(s) no se guardaron: {rejected[0].error}{" "}
          <button type="button" className={cx(styles.btn, styles.btnSmall)} onClick={() => setRejected([])}>Descartar</button>
        </Notice>
      ) : null}

      {canRecord ? (
        <div className={styles.recordGrid} style={{ marginBottom: 16 }}>
          <section className={styles.card} aria-labelledby="rec-title">
            <h2 id="rec-title" className={styles.srOnly}>Registrar lanzamientos</h2>
            <p className={styles.stepLabel}><span className={styles.stepNum}>1</span>Jugador</p>
            <div className={styles.chipsWrap}>
              {participants.map((pid) => {
                const s = summary.perPlayer[pid];
                return (
                  <button key={pid} type="button" className={cx(styles.chip, who === pid && styles.chipActive)} aria-pressed={who === pid} onClick={() => setWho(pid)}>
                    {playersById[pid]?.display_name || "Jugador"}
                    <span className={styles.chipCount}>{s.fg.attempts + s.ft.attempts}</span>
                  </button>
                );
              })}
              {session.hidden_participants === 0 ? (
                <button type="button" className={cx(styles.chip, who === COLLECTIVE && styles.chipActive)} aria-pressed={who === COLLECTIVE} onClick={() => setWho(COLLECTIVE)} title="Para cuando no se sabe quién tiró: cuenta solo en el total del grupo">
                  Grupo (sin atribuir)
                </button>
              ) : null}
            </div>

            <div className={styles.divider} style={{ margin: "14px 0" }} />
            <div className={styles.cardHead} style={{ marginBottom: 8 }}>
              <p className={styles.stepLabel} style={{ margin: 0 }}><span className={styles.stepNum}>2</span>Zona</p>
              <label className={styles.subtle} style={{ display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={precise} disabled={mode === "series"} onChange={(e) => { setPrecise(e.target.checked); setCoords(null); }} style={{ accentColor: "#ff8a1f" }} />
                Marcar el punto exacto
              </label>
            </div>
            <ShotChart
              mode="input"
              selectedZone={zone}
              onSelectZone={pickZone}
              onPickPoint={precise && mode === "shot" ? ({ x, y, zone: z }) => { pickZone(z); setCoords({ x, y }); } : undefined}
              dots={coords ? [{ x: coords.x, y: coords.y, made: true }] : []}
              title="Elegí la zona del lanzamiento"
            />
            <div className={styles.chipsWrap} style={{ marginTop: 10 }}>
              <button type="button" className={cx(styles.chip, zone === "ft" && styles.chipActive)} aria-pressed={zone === "ft"} onClick={() => pickZone("ft")}>
                Tiro libre
              </button>
              {FIELD_ZONES.map((z) => (
                <button key={z.id} type="button" className={cx(styles.chip, zone === z.id && styles.chipActive)} aria-pressed={zone === z.id} onClick={() => pickZone(z.id)}>
                  {z.short}
                </button>
              ))}
            </div>

            <div className={styles.divider} style={{ margin: "14px 0" }} />
            <p className={styles.stepLabel}><span className={styles.stepNum}>3</span>Características (opcional, se mantienen)</p>
            <div className={styles.chipsWrap}>
              {(zone ? allowedTags : tagsForZone("t3_front")).map((t) => (
                <button key={t.id} type="button" disabled={!zone} className={cx(styles.chip, tags.includes(t.id) && styles.chipActive)} aria-pressed={tags.includes(t.id)} onClick={() => setTags((cur) => toggleTag(cur, t.id))}>
                  {t.label}
                </button>
              ))}
            </div>

            <p className={styles.selectionLine} aria-live="polite">
              <strong>{whoLabel}</strong> · {zone ? zoneById(zone).label : "sin zona"}
              {coords ? ` · punto marcado` : ""}
              {tags.length ? ` · ${tags.map((t) => tagById(t)?.label).join(", ")}` : ""}
            </p>
          </section>

          <section className={styles.card} aria-labelledby="rec-mode-title">
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle} id="rec-mode-title">Registro</h2>
              <Segment label="Modo de registro" options={[{ id: "shot", label: "Tiro a tiro" }, { id: "series", label: "Serie" }]} value={mode} onChange={(m) => { setMode(m); setFormErrors([]); }} />
            </div>

            {mode === "series" ? (
              <form onSubmit={addSeries} noValidate>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span className={styles.label}>Intentos</span>
                    <input className={styles.input} type="number" inputMode="numeric" min={1} max={1000} step={1} value={seriesForm.attempts} onChange={(e) => setSeriesForm((f) => ({ ...f, attempts: e.target.value }))} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Convertidos</span>
                    <input className={styles.input} type="number" inputMode="numeric" min={0} max={1000} step={1} value={seriesForm.made} onChange={(e) => setSeriesForm((f) => ({ ...f, made: e.target.value }))} />
                  </label>
                </div>
                {formErrors.length ? (
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "#ff9a8e", fontSize: 13 }} role="alert">
                    {formErrors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                ) : null}
                <p className={styles.subtle}>Una serie guarda solo el total: no tiene orden de tiros ni rachas.</p>
                <button type="submit" className={cx(styles.btn, styles.btnPrimary)}>Agregar serie</button>
              </form>
            ) : (
              <p className={styles.subtle} style={{ marginTop: 0 }}>Elegí jugador y zona, y marcá cada tiro con los botones de abajo.</p>
            )}

            <div className={styles.syncLine} style={{ marginTop: 12 }} aria-live="polite">
              <span className={cx(styles.dot, syncLine.cls)} />
              {syncLine.text}
            </div>
            {note ? <p className={styles.subtle} style={{ color: "#f5c451" }} role="status">{note}</p> : null}

            <div className={styles.divider} style={{ margin: "12px 0" }} />
            <p className={styles.stepLabel}>Últimos registros</p>
            {feed.length ? (
              <ul className={styles.feed}>
                {feed.map((e) => (
                  <li key={e.client_entry_id} className={styles.feedItem}>
                    <span className={e.entry_type === "series" ? undefined : e.made ? styles.feedMade : styles.feedMiss} aria-label={e.entry_type === "series" ? "Serie" : e.made ? "Convertido" : "Fallado"}>
                      {e.entry_type === "series" ? `${e.made}/${e.attempts}` : e.made ? "✓" : "✗"}
                    </span>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {nameOf(e)} · {zoneById(e.zone_id)?.short}
                      {e.tags?.length ? ` · ${e.tags.map((t) => tagById(t)?.label).join(", ")}` : ""}
                    </span>
                    {e.pending ? <span className={styles.feedPending}>pendiente</span> : <span className={styles.subtle}>✓ guardado</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.subtle}>Todavía no hay registros.</p>
            )}
          </section>
        </div>
      ) : null}

      {canRecord && mode === "shot" ? (
        <div className={styles.recordBar}>
          <button type="button" className={cx(styles.bigBtn, styles.bigMade)} disabled={!zone} onClick={() => record(true)}>
            ✓ Convirtió
          </button>
          <button type="button" className={cx(styles.bigBtn, styles.bigMiss)} disabled={!zone} onClick={() => record(false)}>
            ✗ Falló
          </button>
          <button type="button" className={cx(styles.bigBtn, styles.bigUndo)} disabled={!lastEntry || undoBusy} onClick={undo} aria-label={lastEntry ? `Deshacer último: ${nameOf(lastEntry)}, ${zoneById(lastEntry.zone_id)?.short}` : "Deshacer"}>
            ↶ Deshacer
          </button>
        </div>
      ) : null}
      {canRecord && mode === "series" && lastEntry ? (
        <div className={styles.btnRow} style={{ marginBottom: 16 }}>
          <button type="button" className={cx(styles.btn, styles.btnGhost)} disabled={undoBusy} onClick={undo}>
            ↶ Deshacer último ({nameOf(lastEntry)} · {zoneById(lastEntry.zone_id)?.short})
          </button>
        </div>
      ) : null}

      <div className={cx(styles.grid, styles.gridMain)}>
        <section className={styles.card} aria-labelledby="res-map-title">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="res-map-title">Mapa de la sesión</h2>
            <select className={styles.select} value={viewPlayer} onChange={(e) => setViewPlayer(e.target.value)} aria-label="Ver mapa de">
              <option value="">Todo el grupo</option>
              {participants.map((pid) => (
                <option key={pid} value={pid}>{playersById[pid]?.display_name || "Jugador"}</option>
              ))}
              {hasCollective ? <option value={COLLECTIVE}>Sin atribuir</option> : null}
            </select>
          </div>
          <ShotChart byZone={viewSummary?.byZone || {}} thresholds={settings.thresholds} minSample={settings.minSample} dots={dots} title="Mapa de la sesión" />
          <ShotChartLegend mode="efficiency" thresholds={settings.thresholds} minSample={settings.minSample} />
          <p className={styles.subtle}>
            Tiros libres: {viewSummary?.ft.attempts ? `${viewSummary.ft.made}/${viewSummary.ft.attempts} · ${pctLabel(viewSummary.ft.made, viewSummary.ft.attempts)}` : "sin registros"}
            {dots.length ? " · Puntos: ● convertido, ✕ fallado" : ""}
          </p>
        </section>

        <section className={styles.card} aria-labelledby="res-table-title">
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle} id="res-table-title">Resultados por jugador</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Jugador</th>
                  <th className={styles.num}>Campo</th>
                  <th className={styles.num}>%</th>
                  <th className={styles.num}>Triples</th>
                  <th className={styles.num}>TL</th>
                  <th className={styles.num} title="Racha más larga de aciertos seguidos (solo tiro a tiro)">Racha</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((pid) => {
                  const s = summary.perPlayer[pid];
                  const streak = longestMadeStreak(live, pid);
                  return (
                    <tr key={pid} className={cx(styles.clickRow, viewPlayer === pid && styles.rowSelected)} onClick={() => setViewPlayer((v) => (v === pid ? "" : pid))}>
                      <td>{playersById[pid]?.display_name || "Jugador"}</td>
                      <td className={styles.num}>{s.fg.attempts ? `${s.fg.made}/${s.fg.attempts}` : "—"}</td>
                      <td className={styles.num}>{s.fg.attempts ? pctLabel(s.fg.made, s.fg.attempts) : "—"}</td>
                      <td className={styles.num}>{s.three.attempts ? `${s.three.made}/${s.three.attempts}` : "—"}</td>
                      <td className={styles.num}>{s.ft.attempts ? `${s.ft.made}/${s.ft.attempts}` : "—"}</td>
                      <td className={styles.num}>{streak == null ? "—" : streak}</td>
                    </tr>
                  );
                })}
                {hasCollective ? (
                  <tr>
                    <td>Sin atribuir</td>
                    <td className={styles.num}>{summary.collective.fg.attempts ? `${summary.collective.fg.made}/${summary.collective.fg.attempts}` : "—"}</td>
                    <td className={styles.num}>{summary.collective.fg.attempts ? pctLabel(summary.collective.fg.made, summary.collective.fg.attempts) : "—"}</td>
                    <td className={styles.num}>{summary.collective.three.attempts ? `${summary.collective.three.made}/${summary.collective.three.attempts}` : "—"}</td>
                    <td className={styles.num}>{summary.collective.ft.attempts ? `${summary.collective.ft.made}/${summary.collective.ft.attempts}` : "—"}</td>
                    <td className={styles.num}>—</td>
                  </tr>
                ) : null}
                <tr className={styles.rowTotal}>
                  <td>Total del grupo{session.hidden_participants ? " (visible)" : ""}</td>
                  <td className={styles.num}>{summary.group.fg.attempts ? `${summary.group.fg.made}/${summary.group.fg.attempts}` : "—"}</td>
                  <td className={styles.num}>{summary.group.fg.attempts ? pctLabel(summary.group.fg.made, summary.group.fg.attempts) : "—"}</td>
                  <td className={styles.num}>{summary.group.three.attempts ? `${summary.group.three.made}/${summary.group.three.attempts}` : "—"}</td>
                  <td className={styles.num}>{summary.group.ft.attempts ? `${summary.group.ft.made}/${summary.group.ft.attempts}` : "—"}</td>
                  <td className={styles.num}>—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.subtle}>La racha solo se calcula con tiros registrados uno a uno; las series no tienen orden.</p>
          <ZoneTable byZone={viewSummary?.byZone || {}} minSample={settings.minSample} total={viewSummary?.fg} />
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function EditDialog({ session, serverEntries, allPlayers, playersById, onClose, onSave, error }) {
  const [nombre, setNombre] = useState(session.nombre);
  const [fecha, setFecha] = useState(String(session.fecha).slice(0, 10));
  const [notes, setNotes] = useState(session.notes || "");
  const [add, setAdd] = useState([]);
  const [remove, setRemove] = useState([]);
  const [saving, setSaving] = useState(false);
  const withEntries = new Set(serverEntries.filter((e) => e.player_id).map((e) => e.player_id));
  const candidates = allPlayers.filter((p) => (p.access_level === "editor" || p.access_level === "admin") && !session.player_ids.includes(p.id));
  const toggle = (setter, id) => setter((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(ev) {
    ev.preventDefault();
    setSaving(true);
    await onSave({ nombre, fecha, notes, add_player_ids: add, remove_player_ids: remove });
    setSaving(false);
  }

  return (
    <div className={styles.dialogBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="edit-title" onSubmit={save}>
        <h2 className={styles.dialogTitle} id="edit-title">Editar sesión</h2>
        <label className={styles.field}>
          <span className={styles.label}>Nombre</span>
          <input className={styles.input} value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Fecha</span>
          <input className={styles.input} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Notas</span>
          <textarea className={styles.textarea} rows={4} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div>
          <span className={styles.label}>Participantes</span>
          <div className={styles.chipsWrap} style={{ marginTop: 6 }}>
            {session.player_ids.map((pid) => {
              const locked = withEntries.has(pid);
              const marked = remove.includes(pid);
              return (
                <button key={pid} type="button" disabled={locked} className={cx(styles.chip, !marked && styles.chipActive)} aria-pressed={!marked} onClick={() => toggle(setRemove, pid)} title={locked ? "Tiene registros en la sesión: no se puede quitar" : marked ? "Se quitará" : "Tocá para quitar"}>
                  {playersById[pid]?.display_name || "Jugador"}
                  {locked ? <span className={styles.chipCount}>con tiros</span> : null}
                </button>
              );
            })}
          </div>
        </div>
        {candidates.length ? (
          <div>
            <span className={styles.label}>Sumar jugadores</span>
            <div className={styles.chipsWrap} style={{ marginTop: 6 }}>
              {candidates.map((p) => (
                <button key={p.id} type="button" className={cx(styles.chip, add.includes(p.id) && styles.chipActive)} aria-pressed={add.includes(p.id)} onClick={() => toggle(setAdd, p.id)}>
                  + {p.display_name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {error ? <Notice kind="error">{error}</Notice> : null}
        <div className={styles.btnRow}>
          <button type="submit" className={cx(styles.btn, styles.btnPrimary)} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
          <button type="button" className={cx(styles.btn, styles.btnGhost)} onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

function DeleteDialog({ session, onClose, onDeleted }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const matches = text.trim() === String(session.nombre).trim();

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function confirm(ev) {
    ev.preventDefault();
    if (!matches) return;
    setBusy(true);
    setError(null);
    try {
      await labApi.remove(session.id, text.trim());
      await onDeleted();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className={styles.dialogBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc" onSubmit={confirm}>
        <h2 className={styles.dialogTitle} id="del-title">Eliminar sesión</h2>
        <p id="del-desc" style={{ margin: 0, fontSize: 14, color: "#a5aaba" }}>
          Se borran la sesión y todos sus registros, para todos los jugadores. No se puede deshacer. Si solo querés sacarla de la vista, archivala.
        </p>
        <label className={styles.field}>
          <span className={styles.label}>Escribí «{session.nombre}» para confirmar</span>
          <input className={styles.input} value={text} onChange={(e) => setText(e.target.value)} autoFocus autoComplete="off" />
        </label>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <div className={styles.btnRow}>
          <button type="submit" className={cx(styles.btn, styles.btnDanger)} disabled={!matches || busy}>{busy ? "Eliminando…" : "Eliminar definitivamente"}</button>
          <button type="button" className={cx(styles.btn, styles.btnGhost)} onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
