"use client";

import { useMemo, useState } from "react";
import { NOTE_LINKS, NOTE_TYPES, filterNotes, labelOf } from "@/lib/player-dev/goals";
import { assessmentBatches } from "@/lib/player-dev/model";
import { formatDate } from "@/components/shooting-lab/api";
import { Notice, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi } from "./api";
import s from "./dev.module.css";

/** Opciones para vincular una nota con algo concreto del jugador. */
function linkOptions(profile) {
  return {
    assessment: assessmentBatches(profile.assessments).map((b) => ({ id: b.batch_id, label: `Evaluación del ${formatDate(b.assessed_on)}` })),
    shooting_session: profile.sessions.map((x) => ({ id: x.id, label: `${x.nombre} · ${formatDate(x.fecha)}` })),
    goal: profile.goals.map((g) => ({ id: g.id, label: g.title || g.body })),
    stat_record: profile.stats
      .filter((r) => r.record_type !== "manual_legacy")
      .map((r) => ({ id: r.id, label: `${r.record_type === "match" ? "Partido" : "Entrenamiento"}${r.opponent ? ` vs ${r.opponent}` : ""} · ${formatDate(r.played_on)}` }))
  };
}

const EMPTY = { body: "", note_type: "general", visibility: "collaborators", linked_type: "", linked_id: "" };

export default function NotesTab({ profile, canEdit, onChanged }) {
  const installed = profile.schema?.goals !== false;
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState({ type: "", q: "", linked: "" });
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const pid = profile.player.id;
  const options = useMemo(() => linkOptions(profile), [profile]);
  const linkLabel = (n) => {
    if (!n.linked_type) return null;
    const opt = (options[n.linked_type] || []).find((o) => o.id === n.linked_id);
    return `${labelOf(NOTE_LINKS, n.linked_type)}: ${opt ? opt.label : "ya no disponible"}`;
  };
  const list = filterNotes(profile.notes, filter);
  const counts = {};
  profile.notes.forEach((n) => (counts[n.note_type || "general"] = (counts[n.note_type || "general"] || 0) + 1));

  async function run(fn) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.body.trim()) return;
    const ok = await run(() =>
      installed
        ? devApi.createNote(pid, { ...form, linked_type: form.linked_id ? form.linked_type : null, linked_id: form.linked_id || null })
        : devApi.addNote(pid, form.body.trim())
    );
    if (ok) setForm(EMPTY);
  }

  return (
    <div className={lab.stack}>
      {!installed ? <Notice kind="warn">Para clasificar notas y hacerlas privadas falta correr <code>docs/sql/013-goals-notes.sql</code> en Supabase.</Notice> : null}
      {canEdit ? (
        <section className={lab.card}>
          <div className={lab.cardHead}><h2 className={lab.cardTitle}>Nueva nota</h2></div>
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            <textarea className={lab.textarea} rows={3} maxLength={4000} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Observación del entrenamiento, del partido…" aria-label="Nota" />
            {installed ? (
              <div className={lab.formGrid}>
                <label className={lab.field}>
                  <span className={lab.label}>Tipo</span>
                  <select className={lab.select} value={form.note_type} onChange={(e) => setForm((f) => ({ ...f, note_type: e.target.value }))}>
                    {NOTE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </label>
                <label className={lab.field}>
                  <span className={lab.label}>Quién la ve</span>
                  <select className={lab.select} value={form.visibility} onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}>
                    <option value="collaborators">Todos los colaboradores</option>
                    <option value="private">Solo yo (privada)</option>
                  </select>
                </label>
                <label className={lab.field}>
                  <span className={lab.label}>Vincular con</span>
                  <select className={lab.select} value={form.linked_type} onChange={(e) => setForm((f) => ({ ...f, linked_type: e.target.value, linked_id: "" }))}>
                    <option value="">Nada</option>
                    {NOTE_LINKS.map((l) => <option key={l.id} value={l.id} disabled={!options[l.id].length}>{l.label}</option>)}
                  </select>
                </label>
                {form.linked_type ? (
                  <label className={lab.field}>
                    <span className={lab.label}>{labelOf(NOTE_LINKS, form.linked_type)}</span>
                    <select className={lab.select} value={form.linked_id} onChange={(e) => setForm((f) => ({ ...f, linked_id: e.target.value }))} required>
                      <option value="">Elegí…</option>
                      {options[form.linked_type].map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </label>
                ) : null}
              </div>
            ) : null}
            <div><button type="submit" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} disabled={busy || !form.body.trim()}>Guardar nota</button></div>
          </form>
        </section>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <section className={lab.card}>
        <div className={lab.cardHead}>
          <h2 className={lab.cardTitle}>Notas ({profile.notes.length})</h2>
          <input className={lab.input} style={{ maxWidth: 220 }} placeholder="Buscar" value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))} aria-label="Buscar en notas" />
        </div>
        {installed && profile.notes.length ? (
          <div className={lab.chipsWrap} style={{ marginBottom: 10 }}>
            <button type="button" className={cx(lab.chip, !filter.type && lab.chipActive)} onClick={() => setFilter((f) => ({ ...f, type: "" }))}>Todas</button>
            {NOTE_TYPES.filter((t) => counts[t.id]).map((t) => (
              <button key={t.id} type="button" className={cx(lab.chip, filter.type === t.id && lab.chipActive)} onClick={() => setFilter((f) => ({ ...f, type: f.type === t.id ? "" : t.id }))}>
                {t.label} {counts[t.id]}
              </button>
            ))}
          </div>
        ) : null}
        {list.length ? (
          <ul className={s.timeline}>
            {list.map((n) => {
              const mine = n.created_by_user_id === profile.me;
              return (
                <li key={n.id} className={s.timelineItem}>
                  <span className={s.timelineDate}>{formatDate(String(n.created_at).slice(0, 10))}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className={lab.sessionMeta} style={{ marginBottom: 4 }}>
                      {installed ? <span className={lab.badge}>{labelOf(NOTE_TYPES, n.note_type || "general")}</span> : null}
                      {n.visibility === "private" ? <span className={cx(lab.badge, lab.badgeDraft)}>Privada</span> : null}
                      <span>{mine ? "Escrita por vos" : "Otro colaborador"}</span>
                      {linkLabel(n) ? <span>{linkLabel(n)}</span> : null}
                    </div>
                    {editing?.id === n.id ? (
                      <form
                        style={{ display: "grid", gap: 6 }}
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const body = { body: editing.body };
                          if (installed) Object.assign(body, { note_type: editing.note_type, ...(mine ? { visibility: editing.visibility } : {}) });
                          if (await run(() => devApi.editNote(pid, n.id, body))) setEditing(null);
                        }}
                      >
                        <textarea className={lab.textarea} rows={3} maxLength={4000} value={editing.body} onChange={(e) => setEditing((x) => ({ ...x, body: e.target.value }))} aria-label="Editar nota" />
                        {installed ? (
                          <div className={lab.filters} style={{ margin: 0 }}>
                            <select className={lab.select} value={editing.note_type} onChange={(e) => setEditing((x) => ({ ...x, note_type: e.target.value }))} aria-label="Tipo">
                              {NOTE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                            {mine ? (
                              <select className={lab.select} value={editing.visibility} onChange={(e) => setEditing((x) => ({ ...x, visibility: e.target.value }))} aria-label="Quién la ve">
                                <option value="collaborators">Todos los colaboradores</option>
                                <option value="private">Solo yo</option>
                              </select>
                            ) : null}
                          </div>
                        ) : null}
                        <div className={lab.btnRow}>
                          <button type="submit" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} disabled={busy || !editing.body.trim()}>Guardar</button>
                          <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setEditing(null)}>Cancelar</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div style={{ whiteSpace: "pre-wrap" }}>{n.body}</div>
                        {canEdit && installed ? (
                          <div className={lab.btnRow} style={{ marginTop: 6 }}>
                            <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setEditing({ id: n.id, body: n.body, note_type: n.note_type || "general", visibility: n.visibility || "collaborators" })}>Editar</button>
                            {mine ? <DeleteNote busy={busy} onConfirm={() => run(() => devApi.deleteNote(pid, n.id))} /> : null}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={lab.subtle}>{profile.notes.length ? "Ninguna nota coincide." : "Sin notas."}</p>
        )}
        {installed ? <p className={lab.subtle}>Las notas privadas solo las ve quien las escribe. Las demás las ven todos los colaboradores del jugador.</p> : null}
      </section>
    </div>
  );
}

function DeleteNote({ busy, onConfirm }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setAsk(true)}>Borrar</button>;
  return (
    <>
      <button type="button" className={cx(lab.btn, lab.btnDanger, lab.btnSmall)} disabled={busy} onClick={onConfirm}>Confirmar borrado</button>
      <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setAsk(false)}>Cancelar</button>
    </>
  );
}
