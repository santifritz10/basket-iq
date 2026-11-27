"use client";

import { useState } from "react";
import { labApi, todayISO } from "./api";
import { Notice, cx } from "./parts";
import styles from "./lab.module.css";

function defaultName(fecha) {
  const [, m, d] = fecha.split("-");
  return `Sesión de tiro ${Number(d)}/${Number(m)}`;
}

/** Alta de sesión: nombre, fecha, participantes (solo los que el usuario puede editar) y notas. */
export default function SessionForm({ players, preset, onCancel, onCreated }) {
  const today = todayISO();
  const allowed = new Set(players.map((p) => p.id));
  const [nombre, setNombre] = useState(preset?.nombre ? `${preset.nombre} ${defaultName(today).replace("Sesión de tiro ", "")}` : defaultName(today));
  const [fecha, setFecha] = useState(today);
  const [selected, setSelected] = useState(() => (preset?.player_ids || []).filter((id) => allowed.has(id)));
  const [notes, setNotes] = useState(preset?.notes || "");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const visible = players.filter((p) => !filter || String(p.display_name).toLowerCase().includes(filter.toLowerCase()));

  function toggle(id) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function submit(status) {
    if (!selected.length) {
      setError("Elegí al menos un jugador.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await labApi.create({ nombre, fecha, player_ids: selected, notes, status });
      await onCreated(res.session);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Nueva sesión</h1>
          <p className={styles.lede}>Cada tiro queda registrado a nombre del jugador que lo tomó, aunque la sesión sea grupal.</p>
        </div>
      </div>
      <section className={styles.card} style={{ maxWidth: 760 }}>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Nombre</span>
            <input className={styles.input} value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Fecha</span>
            <input className={styles.input} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
        </div>

        <div className={styles.divider} />
        <div className={styles.cardHead}>
          <div>
            <h2 className={styles.cardTitle}>Jugadores ({selected.length})</h2>
            <p className={styles.cardHint}>Solo aparecen los jugadores que podés editar.</p>
          </div>
          {players.length > 8 ? (
            <input className={styles.input} style={{ maxWidth: 220 }} placeholder="Buscar jugador" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Buscar jugador" />
          ) : null}
        </div>
        <div className={styles.chipsWrap}>
          {visible.map((p) => (
            <button key={p.id} type="button" className={cx(styles.chip, selected.includes(p.id) && styles.chipActive)} aria-pressed={selected.includes(p.id)} onClick={() => toggle(p.id)}>
              {p.display_name}
              {p.category ? <span className={styles.chipCount}>{p.category}</span> : null}
            </button>
          ))}
        </div>

        <div className={styles.divider} />
        <label className={styles.field}>
          <span className={styles.label}>Notas (opcional)</span>
          <textarea className={styles.textarea} rows={notes ? 8 : 3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Objetivo de la sesión, ejercicio, observaciones…" />
        </label>

        {error ? <Notice kind="error">{error}</Notice> : null}

        <div className={styles.btnRow} style={{ marginTop: 14 }}>
          <button type="button" className={cx(styles.btn, styles.btnPrimary)} disabled={busy} onClick={() => submit("in_progress")}>
            {busy ? "Creando…" : "Empezar a registrar"}
          </button>
          <button type="button" className={cx(styles.btn, styles.btnGhost)} disabled={busy} onClick={() => submit("draft")}>
            Guardar como borrador
          </button>
          <button type="button" className={cx(styles.btn, styles.btnGhost)} disabled={busy} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </section>
    </>
  );
}
