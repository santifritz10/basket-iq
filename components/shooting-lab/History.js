"use client";

import { useMemo, useState } from "react";
import { STATUS_LABEL } from "./api";
import { SessionItem, groupEntriesBySession } from "./parts";
import styles from "./lab.module.css";

const STATUS_FILTERS = [
  { id: "active", label: "Todas (sin archivadas)" },
  { id: "draft", label: STATUS_LABEL.draft },
  { id: "in_progress", label: STATUS_LABEL.in_progress },
  { id: "completed", label: STATUS_LABEL.completed },
  { id: "archived", label: "Archivadas" }
];

const SOURCE_FILTERS = [
  { id: "all", label: "Toda procedencia" },
  { id: "entries", label: "Registros individuales" },
  { id: "legacy", label: "Histórico" }
];

export default function History({ data, playersById, onOpenSession }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [source, setSource] = useState("all");
  const [player, setPlayer] = useState("");
  const entriesBySession = useMemo(() => groupEntriesBySession(data.entries), [data.entries]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.sessions
      .filter((s) => (status === "active" ? s.status !== "archived" : s.status === status))
      .filter((s) => (source === "all" ? true : source === "entries" ? s.recording_mode === "entries" : s.recording_mode !== "entries"))
      .filter((s) => !player || s.player_ids.includes(player))
      .filter((s) => !term || String(s.nombre).toLowerCase().includes(term) || s.player_ids.some((id) => String(playersById[id]?.display_name || "").toLowerCase().includes(term)))
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || String(b.created_at).localeCompare(String(a.created_at)));
  }, [data.sessions, q, status, source, player, playersById]);

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Historial</h1>
          <p className={styles.lede}>
            Las sesiones anteriores a Shooting Lab se muestran como «Histórico». Las grupales históricas no tienen datos por jugador y se conservan tal como se cargaron.
          </p>
        </div>
      </div>
      <div className={styles.filters} role="group" aria-label="Filtros del historial">
        <input className={styles.input} style={{ maxWidth: 260 }} placeholder="Buscar sesión o jugador" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
          {STATUS_FILTERS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <select className={styles.select} value={source} onChange={(e) => setSource(e.target.value)} aria-label="Procedencia">
          {SOURCE_FILTERS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <select className={styles.select} value={player} onChange={(e) => setPlayer(e.target.value)} aria-label="Jugador">
          <option value="">Todos los jugadores</option>
          {data.players.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
      </div>
      <p className={styles.subtle}>{list.length} sesión(es)</p>
      {list.length ? (
        <ul className={styles.list}>
          {list.map((s) => (
            <SessionItem key={s.id} session={s} entries={entriesBySession[s.id]} playersById={playersById} onOpen={onOpenSession} />
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No hay sesiones con estos filtros</p>
        </div>
      )}
    </>
  );
}
