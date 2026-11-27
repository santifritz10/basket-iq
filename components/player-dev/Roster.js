"use client";

import { useMemo, useState } from "react";
import { ROSTER_SORTS, filterRoster, groupRoster, normalizeLabel, pctText } from "@/lib/player-dev/model";
import { formatDate, safeStorage } from "@/components/shooting-lab/api";
import { Notice, Segment, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi, initials } from "./api";
import s from "./dev.module.css";

const VIEW_KEY = "playersLab.view";
const MIN_SAMPLE = 20;

function uniq(list) {
  const seen = new Map();
  list.filter(Boolean).forEach((v) => {
    const k = normalizeLabel(v);
    if (k && !seen.has(k)) seen.set(k, v);
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "es"));
}

export function Avatar({ player, large = false }) {
  if (player?.photo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={player.photo_url} alt="" className={cx(s.avatar, large && s.avatarLg)} />;
  }
  return <span className={cx(s.avatar, large && s.avatarLg)} aria-hidden="true">{initials(player?.display_name)}</span>;
}

export default function Roster({ roster, onOpen, onNew, onReload }) {
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("");
  const [category, setCategory] = useState("");
  const [position, setPosition] = useState("");
  const [sort, setSort] = useState("name");
  const [group, setGroup] = useState("team");
  const [showArchived, setShowArchived] = useState(false);
  const [mode, setMode] = useState(() => {
    try {
      return safeStorage()?.getItem(VIEW_KEY) || "cards";
    } catch {
      return "cards";
    }
  });
  const [teamsOpen, setTeamsOpen] = useState(false);

  const players = useMemo(() => roster.players.filter((p) => (showArchived ? p.status === "archived" : p.status !== "archived")), [roster.players, showArchived]);
  const teams = uniq(players.map((p) => p.teamLabel || p.team));
  const categories = uniq(players.map((p) => p.category));
  const positions = uniq(players.map((p) => p.position));
  const list = filterRoster(players, { q, team, category, position }, sort);
  const groups = group === "none" ? [{ key: "all", label: null, items: list }] : groupRoster(list, group);

  function setView(m) {
    setMode(m);
    try {
      safeStorage()?.setItem(VIEW_KEY, m);
    } catch {
      /* solo en esta pestaña */
    }
  }

  return (
    <>
      <div className={lab.pageHead}>
        <div>
          <h1 className={lab.h1}>Plantel</h1>
          <p className={lab.lede}>{roster.players.filter((p) => p.status !== "archived").length} jugador(es). Tocá uno para abrir su perfil.</p>
        </div>
        <div className={lab.btnRow}>
          {roster.schema?.installed ? (
            <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={() => setTeamsOpen((v) => !v)}>
              Equipos{roster.suggestions?.length ? ` (${roster.suggestions.length} por ordenar)` : ""}
            </button>
          ) : null}
          <button type="button" className={cx(lab.btn, lab.btnPrimary)} onClick={onNew}>+ Jugador</button>
        </div>
      </div>

      {teamsOpen ? <TeamsPanel roster={roster} onReload={onReload} onClose={() => setTeamsOpen(false)} /> : null}

      <div className={lab.filters} role="group" aria-label="Filtros">
        <input className={lab.input} style={{ maxWidth: 240 }} placeholder="Buscar jugador" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar jugador" />
        {teams.length ? (
          <select className={lab.select} value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Equipo">
            <option value="">Todos los equipos</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : null}
        {categories.length ? (
          <select className={lab.select} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categories.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : null}
        {positions.length ? (
          <select className={lab.select} value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Posición">
            <option value="">Todas las posiciones</option>
            {positions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : null}
        <select className={lab.select} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar por">
          {ROSTER_SORTS.map((o) => <option key={o.id} value={o.id}>Orden: {o.label}</option>)}
        </select>
        <select className={lab.select} value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Agrupar">
          <option value="team">Agrupar por equipo</option>
          <option value="category">Agrupar por categoría</option>
          <option value="none">Sin agrupar</option>
        </select>
        <Segment label="Vista" options={[{ id: "cards", label: "Tarjetas" }, { id: "table", label: "Tabla" }]} value={mode} onChange={setView} />
        <label className={lab.chip} style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} style={{ accentColor: "#ff8a1f" }} />
          Archivados
        </label>
      </div>

      {!roster.players.length ? (
        <div className={lab.empty}>
          <p className={lab.emptyTitle}>Todavía no hay jugadores</p>
          <p className={lab.emptyText}>Creá el primer perfil para empezar a registrar evaluaciones, sesiones de tiro y objetivos.</p>
          <button type="button" className={cx(lab.btn, lab.btnPrimary)} onClick={onNew}>Crear jugador</button>
        </div>
      ) : !list.length ? (
        <div className={lab.empty}>
          <p className={lab.emptyTitle}>Ningún jugador coincide con los filtros</p>
          <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={() => { setQ(""); setTeam(""); setCategory(""); setPosition(""); }}>Limpiar filtros</button>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} aria-label={g.label || "Jugadores"}>
            {g.label ? <h2 className={s.groupTitle}>{g.label} · {g.items.length}</h2> : null}
            {mode === "table" ? <RosterTable items={g.items} onOpen={onOpen} /> : <RosterCards items={g.items} onOpen={onOpen} />}
          </section>
        ))
      )}
      <p className={lab.subtle} style={{ marginTop: 16 }}>
        La efectividad de 30 días aparece solo con {MIN_SAMPLE} intentos o más registrados a nombre del jugador. El listado no es un ranking.
      </p>
    </>
  );
}

function fgText(p) {
  if (!p.fg30 || p.fg30.att < MIN_SAMPLE) return "—";
  return pctText(p.fg30.made, p.fg30.att);
}

function RosterCards({ items, onOpen }) {
  return (
    <div className={s.cards}>
      {items.map((p) => (
        <button key={p.id} type="button" className={s.playerCard} onClick={() => onOpen(p.id)}>
          <div className={s.cardTop}>
            <Avatar player={p} />
            <div style={{ minWidth: 0 }}>
              <div className={s.name}>{p.display_name}</div>
              <div className={s.meta}>{[p.position, p.category, p.teamLabel || p.team].filter(Boolean).join(" · ") || "Sin datos de equipo"}</div>
            </div>
          </div>
          <div className={s.facts}>
            <span><strong>{p.active_goals}</strong>objetivos</span>
            <span><strong>{p.last_assessment_on ? formatDate(p.last_assessment_on).replace(/ de \d{4}$/, "") : "—"}</strong>evaluación</span>
            <span><strong>{fgText(p)}</strong>campo 30 d</span>
          </div>
          <div className={s.meta}>Última sesión de tiro: {p.last_session_on ? formatDate(p.last_session_on) : "ninguna"}</div>
        </button>
      ))}
    </div>
  );
}

function RosterTable({ items, onOpen }) {
  return (
    <div className={lab.tableWrap}>
      <table className={lab.table}>
        <thead>
          <tr>
            <th>Jugador</th>
            <th>Posición</th>
            <th>Categoría</th>
            <th className={lab.num}>Objetivos</th>
            <th>Última evaluación</th>
            <th>Última sesión</th>
            <th className={lab.num}>Campo 30 d</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className={lab.clickRow} onClick={() => onOpen(p.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen(p.id)}>
              <td><strong>{p.display_name}</strong></td>
              <td>{p.position || "—"}</td>
              <td>{p.category || "—"}</td>
              <td className={lab.num}>{p.active_goals}</td>
              <td>{p.last_assessment_on ? formatDate(p.last_assessment_on) : "—"}</td>
              <td>{p.last_session_on ? formatDate(p.last_session_on) : "—"}</td>
              <td className={lab.num}>{fgText(p)}{p.fg30 && p.fg30.att >= MIN_SAMPLE ? ` (${p.fg30.made}/${p.fg30.att})` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamsPanel({ roster, onReload, onClose }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", season: "", club: "" });
  const byId = Object.fromEntries(roster.players.map((p) => [p.id, p]));

  async function run(key, fn) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await onReload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={lab.card} style={{ marginBottom: 16 }} aria-labelledby="teams-title">
      <div className={lab.cardHead}>
        <div>
          <h2 className={lab.cardTitle} id="teams-title">Equipos</h2>
          <p className={lab.cardHint}>Tus equipos son solo tuyos. Nada se agrupa solo: confirmás cada propuesta.</p>
        </div>
        <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={onClose}>Cerrar</button>
      </div>
      {error ? <Notice kind="error">{error}</Notice> : null}

      {roster.suggestions?.length ? (
        <>
          <p className={lab.stepLabel}>Propuestas según el texto de equipo de cada jugador</p>
          <ul className={lab.list} style={{ marginBottom: 14 }}>
            {roster.suggestions.map((sug) => (
              <li key={sug.key} className={lab.sessionItem}>
                <div style={{ minWidth: 0 }}>
                  <div className={lab.sessionName}>{sug.team}{sug.category ? ` · ${sug.category}` : ""}</div>
                  <div className={lab.sessionMeta}>
                    {sug.players.map((id) => byId[id]?.display_name).join(", ")}
                  </div>
                  {sug.ambiguous ? (
                    <div className={lab.subtle} style={{ color: "#f5c451" }}>Escrito de formas distintas: {sug.variants.join(" / ")}. Revisá que sea el mismo equipo.</div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={cx(lab.btn, lab.btnSmall, lab.btnPrimary)}
                  disabled={busy === sug.key}
                  onClick={() => run(sug.key, () => devApi.addTeam({ name: sug.team, category: sug.category, player_ids: sug.players }))}
                >
                  Crear equipo
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {roster.teams.length ? (
        <>
          <p className={lab.stepLabel}>Tus equipos</p>
          <ul className={lab.list} style={{ marginBottom: 14 }}>
            {roster.teams.map((t) => (
              <li key={t.id} className={lab.sessionItem}>
                <div style={{ minWidth: 0 }}>
                  <div className={lab.sessionName}>{t.name}</div>
                  <div className={lab.sessionMeta}>
                    {[t.category, t.season, t.club].filter(Boolean).join(" · ") || "Sin categoría"} · {t.player_ids.length} jugador(es)
                  </div>
                </div>
                <button type="button" className={cx(lab.btn, lab.btnSmall, lab.btnGhost)} disabled={busy === t.id} onClick={() => run(t.id, () => devApi.editTeam(t.id, { archived: true }))}>
                  Archivar
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run("new", async () => {
            await devApi.addTeam(form);
            setForm({ name: "", category: "", season: "", club: "" });
          });
        }}
      >
        <p className={lab.stepLabel}>Nuevo equipo</p>
        <div className={lab.formGrid}>
          {[["name", "Nombre"], ["category", "Categoría"], ["season", "Temporada"], ["club", "Club"]].map(([k, l]) => (
            <label key={k} className={lab.field}>
              <span className={lab.label}>{l}</span>
              <input className={lab.input} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} required={k === "name"} />
            </label>
          ))}
        </div>
        <button type="submit" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} style={{ marginTop: 10 }} disabled={busy === "new"}>Crear equipo</button>
        <p className={lab.subtle}>Los jugadores se suman desde su perfil (sección Resumen → Equipos). El texto original de equipo y categoría se conserva.</p>
      </form>
    </section>
  );
}
