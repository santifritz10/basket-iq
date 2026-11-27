"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DIMENSIONS } from "@/lib/player-dev/catalog";
import { criteriaCatalog, dimensionSummary, latestByCriterion, pctText } from "@/lib/player-dev/model";
import { ACCESS_LEVELS, RELATIONSHIP_TYPES } from "@/lib/player-domain/membership-rules";
import { PROVENANCE, emptyZoneMap, legacyZonesToMap, summarizeEntries, summarizeZoneMap, timelineByDate } from "@/lib/shooting/model";
import { formatDate, todayISO } from "@/components/shooting-lab/api";
import { Kpi, Notice, ProvenanceBadge, StatusBadge, cx } from "@/components/shooting-lab/parts";
import ShotChart, { ShotChartLegend } from "@/components/shooting-lab/ShotChart";
import TrendCharts from "@/components/shooting-lab/TrendCharts";
import lab from "@/components/shooting-lab/lab.module.css";
import { ACCESS_LABEL, devApi } from "./api";
import Fundamentals from "./Fundamentals";
import PlayerForm from "./PlayerForm";
import { Avatar } from "./Roster";
import StatsTab from "./StatsTab";
import GoalsTab from "./GoalsTab";
import NotesTab from "./NotesTab";
import EvolutionTab from "./EvolutionTab";
import TrainingTab from "./TrainingTab";
import s from "./dev.module.css";

const MIN_SAMPLE = 20;

export const TABS = [
  { id: "summary", label: "Resumen" },
  { id: "fundamentals", label: "Fundamentos" },
  { id: "shooting", label: "Lanzamiento" },
  { id: "stats", label: "Estadísticas" },
  { id: "training", label: "Entrenamientos" },
  { id: "goals", label: "Objetivos" },
  { id: "evolution", label: "Evolución" },
  { id: "notes", label: "Notas" },
  { id: "reports", label: "Informes" },
  { id: "people", label: "Colaboradores" }
];

const relLabel = (id) => RELATIONSHIP_TYPES.find((r) => r.id === id)?.label || id;

function daysAgo(n) {
  const d = new Date(`${todayISO()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Lanzamiento del jugador: sus registros propios + histórico de sesiones donde estuvo solo. */
export function playerShooting(profile, { from = null, to = null } = {}) {
  const byZone = emptyZoneMap();
  const points = [];
  let excludedGroup = 0;
  const bySession = {};
  profile.entries.forEach((e) => (bySession[e.session_id] = bySession[e.session_id] || []).push(e));
  profile.sessions.forEach((sess) => {
    if (sess.status === "archived" || sess.status === "draft") return;
    if (from && sess.fecha < from) return;
    if (to && sess.fecha > to) return;
    let map = null;
    if (sess.recording_mode === "entries") map = summarizeEntries(bySession[sess.id] || []).byZone;
    else if (sess.provenance === "legacy_single") map = legacyZonesToMap(sess.legacy_zones);
    else if (sess.provenance === "legacy_group") excludedGroup += 1;
    if (!map) return;
    Object.keys(byZone).forEach((z) => {
      byZone[z].attempts += map[z]?.attempts || 0;
      byZone[z].made += map[z]?.made || 0;
    });
    const t = summarizeZoneMap(map);
    if (t.fg.attempts) points.push({ fecha: sess.fecha, attempts: t.fg.attempts, made: t.fg.made });
  });
  return { byZone, totals: summarizeZoneMap(byZone), timeline: timelineByDate(points), excludedGroup };
}

export default function Profile({ playerId, tab = "summary", roster, onTab, onBack, onChanged }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      setProfile(await devApi.profile(playerId));
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [playerId]);

  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(async () => {
    await load();
    onChanged?.();
  }, [load, onChanged]);

  if (error) {
    return (
      <>
        <button type="button" className={lab.backLink} onClick={onBack}>← Plantel</button>
        <Notice kind="error">{error.status === 404 ? "El jugador no existe o no tenés acceso." : error.message}</Notice>
      </>
    );
  }
  if (!profile) {
    return (
      <div className={lab.stack} aria-busy="true">
        <span className={lab.srOnly}>Cargando perfil…</span>
        <div className={lab.skeleton} style={{ height: 120 }} />
        <div className={lab.skeleton} style={{ height: 300 }} />
      </div>
    );
  }

  const p = profile.player;
  const canEdit = profile.access_level === "admin" || profile.access_level === "editor";
  const current = TABS.some((t) => t.id === tab) ? tab : "summary";

  if (editing) {
    return (
      <>
        <button type="button" className={lab.backLink} onClick={() => setEditing(false)}>← Volver al perfil</button>
        <h1 className={lab.h1} style={{ marginBottom: 12 }}>Editar datos</h1>
        <PlayerForm player={p} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await reload(); }} />
      </>
    );
  }

  return (
    <>
      <button type="button" className={lab.backLink} onClick={onBack}>← Plantel</button>
      <header className={s.hero}>
        <Avatar player={p} large />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className={s.heroName}>{p.display_name}</h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.club_shield_url ? <img src={p.club_shield_url} alt="Escudo" className={s.shield} /> : null}
          </div>
          <div className={s.heroFacts}>
            {[["Edad", p.age], ["Altura", p.height], ["Posición", p.position], ["Equipo", p.team], ["Categoría", p.category], ["Nivel", p.level]]
              .filter(([, v]) => v != null && v !== "")
              .map(([k, v]) => <span key={k}>{k}: <strong>{v}</strong></span>)}
            {p.status === "archived" ? <span className={cx(lab.badge, lab.badgeDraft)}>Archivado</span> : null}
          </div>
        </div>
        <div className={s.heroActions}>
          <span className={lab.badge}>{ACCESS_LABEL[profile.access_level]}</span>
          {canEdit ? <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setEditing(true)}>Editar datos</button> : null}
        </div>
      </header>

      <nav className={s.tabs} aria-label="Secciones del perfil">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={cx(s.tab, current === t.id && s.tabActive)} aria-current={current === t.id ? "page" : undefined} onClick={() => onTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {current === "summary" ? <Summary profile={profile} roster={roster} canEdit={canEdit} onTab={onTab} onChanged={reload} /> : null}
      {current === "fundamentals" ? <Fundamentals profile={profile} canEdit={canEdit} onChanged={reload} /> : null}
      {current === "shooting" ? <ShootingTab profile={profile} canEdit={canEdit} /> : null}
      {current === "stats" ? <StatsTab profile={profile} canEdit={canEdit} onChanged={reload} /> : null}
      {current === "training" ? <TrainingTab profile={profile} canEdit={canEdit} onChanged={reload} /> : null}
      {current === "goals" ? <GoalsTab profile={profile} canEdit={canEdit} onChanged={reload} /> : null}
      {current === "evolution" ? <EvolutionTab profile={profile} canEdit={canEdit} onChanged={reload} /> : null}
      {current === "notes" ? <NotesTab profile={profile} canEdit={canEdit} onChanged={reload} /> : null}
      {current === "reports" ? <ComingNext title="Informes" text="Los informes de desarrollo (semanales, mensuales, de temporada) se arman en la etapa de inteligencia e informes, con revisión del entrenador antes de compartir." /> : null}
      {current === "people" ? <PeopleTab profile={profile} onChanged={reload} onArchived={async () => { await onChanged?.(); onBack(); }} /> : null}
    </>
  );
}

function ComingNext({ title, text }) {
  return (
    <div className={lab.empty}>
      <p className={lab.emptyTitle}>{title}</p>
      <p className={lab.emptyText}>{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Summary({ profile, roster, canEdit, onTab, onChanged }) {
  const catalog = criteriaCatalog(profile.criteria);
  const dims = dimensionSummary(profile.assessments, catalog);
  const latest = Object.values(latestByCriterion(profile.assessments));
  const strengths = latest.filter((a) => a.value / a.scale_max >= 0.8).sort((a, b) => b.value / b.scale_max - a.value / a.scale_max);
  const pending = dims.filter((d) => !d.evaluated);
  const lastAssessment = latest.reduce((m, a) => (a.assessed_on > m ? a.assessed_on : m), "");
  const recent = playerShooting(profile, { from: daysAgo(29) });
  const prev = playerShooting(profile, { from: daysAgo(59), to: daysAgo(30) });
  const doneSessions = profile.sessions.filter((x) => x.status !== "draft" && x.status !== "archived");
  const activeGoals = profile.goals.filter((g) => g.status === "active");
  const pid = profile.player.id;

  let trend = "Sin datos suficientes de los últimos 30 días.";
  const r = recent.totals.fg;
  const q = prev.totals.fg;
  if (r.attempts >= MIN_SAMPLE && q.attempts >= MIN_SAMPLE) {
    const d = Math.round(((r.made / r.attempts - q.made / q.attempts) * 100) * 10) / 10;
    trend = `Campo ${pctText(r.made, r.attempts)} (${r.made}/${r.attempts}) en 30 días; ${d >= 0 ? "+" : ""}${d.toLocaleString("es-AR")} pts frente a los 30 anteriores (${q.made}/${q.attempts}).`;
  } else if (r.attempts >= MIN_SAMPLE) {
    trend = `Campo ${pctText(r.made, r.attempts)} (${r.made}/${r.attempts}) en 30 días. No hay muestra suficiente antes para comparar.`;
  } else if (r.attempts) {
    trend = `${r.made}/${r.attempts} de campo en 30 días: muestra menor a ${MIN_SAMPLE} intentos.`;
  }

  return (
    <div className={lab.stack}>
      <div className={lab.kpis}>
        <Kpi label="Sesiones de tiro" value={String(doneSessions.length)} sub="Registradas" />
        <Kpi label="Objetivos activos" value={String(activeGoals.length)} sub={activeGoals.length ? "Ver Objetivos" : "Ninguno"} />
        <Kpi label="Última evaluación" value={lastAssessment ? formatDate(lastAssessment).replace(/ de \d{4}$/, "") : "—"} sub={lastAssessment ? `${latest.length} criterios evaluados` : "Sin evaluaciones"} />
        <Kpi label="Campo 30 días" value={r.attempts >= MIN_SAMPLE ? pctText(r.made, r.attempts) : "—"} sub={r.attempts ? `${r.made}/${r.attempts}` : "Sin intentos"} />
        <Kpi label="Libres 30 días" value={recent.totals.ft.attempts >= MIN_SAMPLE ? pctText(recent.totals.ft.made, recent.totals.ft.attempts) : "—"} sub={recent.totals.ft.attempts ? `${recent.totals.ft.made}/${recent.totals.ft.attempts}` : "Sin intentos"} />
      </div>

      {canEdit ? (
        <div className={lab.btnRow}>
          <button type="button" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} onClick={() => onTab("fundamentals")}>+ Evaluación</button>
          <a className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} href={`/shooting?view=new&player=${pid}`}>+ Sesión de tiro</a>
          <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => onTab("stats")}>+ Estadísticas</button>
          <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => onTab("goals")}>+ Objetivo</button>
          <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => onTab("notes")}>+ Nota</button>
        </div>
      ) : null}

      <div className={cx(lab.grid, lab.gridMain)}>
        <div className={lab.stack}>
          <section className={lab.card}>
            <div className={lab.cardHead}><h2 className={lab.cardTitle}>Evolución reciente</h2></div>
            <p style={{ margin: 0, fontSize: 14 }}>{trend}</p>
            {recent.excludedGroup ? <p className={lab.subtle}>No incluye {recent.excludedGroup} sesión(es) grupales históricas sin datos por jugador.</p> : null}
          </section>
          <section className={lab.card}>
            <div className={lab.cardHead}>
              <div>
                <h2 className={lab.cardTitle}>Fortalezas observadas</h2>
                <p className={lab.cardHint}>Criterios con 4 de 5 o más en su última evaluación.</p>
              </div>
            </div>
            {strengths.length ? (
              <div className={lab.chipsWrap}>
                {strengths.slice(0, 8).map((a) => (
                  <span key={a.criterion_key} className={cx(lab.chip, lab.chipActive)}>{a.criterion_label} {a.value}/{a.scale_max}</span>
                ))}
              </div>
            ) : (
              <p className={lab.subtle}>{latest.length ? "Ningún criterio evaluado llega a ese nivel todavía." : "Sin evaluaciones con fecha."}</p>
            )}
            <p className={lab.stepLabel} style={{ marginTop: 14 }}>Pendientes de evaluación</p>
            <p style={{ margin: 0, fontSize: 13.5, color: "#a5aaba" }}>{pending.length ? pending.map((d) => d.dimension.label).join(", ") : "Todos los fundamentos tienen al menos una evaluación."}</p>
          </section>
          <section className={lab.card}>
            <div className={lab.cardHead}>
              <h2 className={lab.cardTitle}>Últimas observaciones</h2>
              <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => onTab("notes")}>Ver todas</button>
            </div>
            {profile.notes.length ? (
              <ul className={s.timeline}>
                {profile.notes.slice(0, 3).map((n) => (
                  <li key={n.id} className={s.timelineItem}>
                    <span className={s.timelineDate}>{formatDate(String(n.created_at).slice(0, 10))}</span>
                    <span style={{ whiteSpace: "pre-wrap" }}>{n.body}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={lab.subtle}>Sin notas.</p>
            )}
          </section>
        </div>
        <div className={lab.stack}>
          <section className={lab.card}>
            <div className={lab.cardHead}>
              <h2 className={lab.cardTitle}>Objetivos activos</h2>
              <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => onTab("goals")}>Ver</button>
            </div>
            {activeGoals.length ? (
              <ul className={lab.list}>
                {activeGoals.slice(0, 5).map((g) => <li key={g.id} className={lab.goalItem}>{g.title || g.body}</li>)}
              </ul>
            ) : (
              <p className={lab.subtle}>Sin objetivos activos.</p>
            )}
          </section>
          <TeamsCard profile={profile} roster={roster} canEdit={canEdit} onChanged={onChanged} />
        </div>
      </div>
    </div>
  );
}

function TeamsCard({ profile, roster, canEdit, onChanged }) {
  const [teamId, setTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (!profile.schema?.installed) return null;
  const memberships = profile.teams.slice().sort((a, b) => String(b.joined_on).localeCompare(String(a.joined_on)));
  const activeIds = new Set(memberships.filter((m) => !m.left_on).map((m) => m.team_id));
  const options = (roster?.teams || []).filter((t) => !activeIds.has(t.id));

  async function run(fn) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={lab.card}>
      <div className={lab.cardHead}>
        <div>
          <h2 className={lab.cardTitle}>Equipos</h2>
          <p className={lab.cardHint}>Historial de tus equipos. El texto original del perfil se conserva.</p>
        </div>
      </div>
      {memberships.length ? (
        <ul className={s.timeline}>
          {memberships.map((m) => (
            <li key={m.id} className={s.timelineItem}>
              <span className={s.timelineDate}>{formatDate(m.joined_on)}{m.left_on ? <><br />→ {formatDate(m.left_on)}</> : <><br />hoy</>}</span>
              <div>
                <strong>{m.team.name}</strong>
                <div className={lab.subtle}>{[m.team.category, m.team.season].filter(Boolean).join(" · ")}</div>
                {canEdit && !m.left_on ? (
                  <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} style={{ marginTop: 6 }} disabled={busy} onClick={() => run(() => devApi.endTeamMember(m.id, { left_on: todayISO() }))}>
                    Marcar salida hoy
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={lab.subtle}>No está en ninguno de tus equipos.</p>
      )}
      {canEdit && options.length ? (
        <div className={lab.filters} style={{ marginTop: 10, marginBottom: 0 }}>
          <select className={lab.select} value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Equipo">
            <option value="">Sumar a un equipo…</option>
            {options.map((t) => <option key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}</option>)}
          </select>
          <button type="button" className={cx(lab.btn, lab.btnSmall)} disabled={!teamId || busy} onClick={() => run(async () => { await devApi.addTeamMember(teamId, { player_id: profile.player.id }); setTeamId(""); })}>
            Sumar
          </button>
        </div>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
    </section>
  );
}

// ---------------------------------------------------------------------------

function ShootingTab({ profile, canEdit }) {
  const [mode, setMode] = useState("efficiency");
  const data = useMemo(() => playerShooting(profile), [profile]);
  const t = data.totals;
  const pid = profile.player.id;
  return (
    <div className={lab.stack}>
      <div className={lab.btnRow}>
        <a className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} href={`/shooting?player=${pid}`}>Abrir en Shooting Lab</a>
        {canEdit ? <a className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} href={`/shooting?view=new&player=${pid}`}>+ Sesión de tiro</a> : null}
      </div>
      {data.excludedGroup ? (
        <Notice kind="info">{data.excludedGroup} sesión(es) grupales históricas no se incluyen: se cargaron como total del grupo y no se sabe cuánto tiró este jugador.</Notice>
      ) : null}
      <div className={lab.kpis}>
        <Kpi label="Campo" made={t.fg.made} attempts={t.fg.attempts} />
        <Kpi label="Dobles" made={t.two.made} attempts={t.two.attempts} />
        <Kpi label="Triples" made={t.three.made} attempts={t.three.attempts} />
        <Kpi label="Libres" made={t.ft.made} attempts={t.ft.attempts} />
        <Kpi label="Sesiones" value={String(data.timeline.length)} sub="Con tiros propios" />
      </div>
      <div className={cx(lab.grid, lab.gridMain)}>
        <section className={lab.card}>
          <div className={lab.cardHead}>
            <h2 className={lab.cardTitle}>Mapa acumulado</h2>
            <div className={lab.segment} role="radiogroup" aria-label="Vista">
              {[["efficiency", "Efectividad"], ["volume", "Volumen"]].map(([id, l]) => (
                <button key={id} type="button" role="radio" aria-checked={mode === id} className={cx(lab.segmentBtn, mode === id && lab.segmentBtnActive)} onClick={() => setMode(id)}>{l}</button>
              ))}
            </div>
          </div>
          <ShotChart byZone={data.byZone} mode={mode} title={`Mapa de ${profile.player.display_name}`} />
          <ShotChartLegend mode={mode} />
        </section>
        <section className={lab.card}>
          <div className={lab.cardHead}><h2 className={lab.cardTitle}>Evolución</h2></div>
          <TrendCharts points={data.timeline} minSample={MIN_SAMPLE} />
        </section>
      </div>
      <SessionsList profile={profile} />
    </div>
  );
}

function SessionsList({ profile }) {
  const bySession = {};
  profile.entries.forEach((e) => (bySession[e.session_id] = bySession[e.session_id] || []).push(e));
  return (
    <section className={lab.card}>
      <div className={lab.cardHead}><h2 className={lab.cardTitle}>Sesiones de tiro</h2></div>
      {profile.sessions.length ? (
        <ul className={lab.list}>
          {profile.sessions.map((x) => {
            let stat = null;
            if (x.recording_mode === "entries") stat = summarizeEntries(bySession[x.id] || []).fg;
            else if (x.provenance === "legacy_single") stat = summarizeZoneMap(legacyZonesToMap(x.legacy_zones)).fg;
            return (
              <li key={x.id} className={lab.sessionItem}>
                <a className={lab.sessionItemBtn} href={`/shooting?session=${x.id}`}>
                  <div className={lab.sessionName}>{x.nombre}</div>
                  <div className={lab.sessionMeta}>
                    <span>{formatDate(x.fecha)}</span>
                    <StatusBadge status={x.status} />
                    <ProvenanceBadge provenance={x.provenance} />
                    {x.participants_total > 1 ? <span>{x.participants_total} participantes</span> : null}
                  </div>
                </a>
                <div className={lab.sessionStat}>
                  {stat && stat.attempts ? (<><strong>{pctText(stat.made, stat.attempts)}</strong>{stat.made}/{stat.attempts} propios</>) : x.provenance === "legacy_group" ? <span>{PROVENANCE.legacy_group.short}</span> : <span>Sin tiros de campo propios</span>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={lab.subtle}>Todavía no participó de sesiones de tiro.</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function useAction(onChanged) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async (fn) => {
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
  };
  return { busy, error, run };
}

function PeopleTab({ profile, onChanged, onArchived }) {
  const { busy, error, run } = useAction(onChanged);
  const [form, setForm] = useState({ email: "", relationship_type: "coach", access_level: "viewer" });
  const [result, setResult] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const pid = profile.player.id;
  const isAdmin = profile.access_level === "admin";
  const canInvite = isAdmin || profile.access_level === "editor";
  const levels = ACCESS_LEVELS.filter((l) => isAdmin || l.id !== "admin");

  return (
    <div className={lab.stack}>
      {profile.members ? (
        <section className={lab.card}>
          <div className={lab.cardHead}><h2 className={lab.cardTitle}>Colaboradores</h2></div>
          <ul className={lab.list}>
            {profile.members.map((m) => (
              <li key={m.id} className={lab.sessionItem}>
                <div>
                  <div className={lab.sessionName}>{relLabel(m.relationship_type)}</div>
                  <div className={lab.sessionMeta}>
                    <span>{ACCESS_LABEL[m.access_level]}</span>
                    <span>{m.status === "active" ? "Activo" : m.status === "revoked" ? "Revocado" : "Pendiente"}</span>
                    <span>desde {formatDate(String(m.created_at).slice(0, 10))}</span>
                  </div>
                </div>
                {m.status === "active" ? (
                  <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} disabled={busy} onClick={() => run(() => devApi.revokeMember(pid, m.id))}>Quitar acceso</button>
                ) : null}
              </li>
            ))}
          </ul>
          <p className={lab.subtle}>El rol describe el vínculo (entrenador, familia, jugador…); el permiso define qué puede hacer. Un jugador nunca queda sin administrador.</p>
        </section>
      ) : (
        <Notice kind="info">Solo los administradores del jugador ven la lista de colaboradores.</Notice>
      )}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {canInvite ? (
        <section className={lab.card}>
          <div className={lab.cardHead}><h2 className={lab.cardTitle}>Invitar</h2></div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const r = await devApi.invite(pid, { ...form, email: form.email.trim().toLowerCase() });
                setResult(r);
                setForm((f) => ({ ...f, email: "" }));
              });
            }}
          >
            <div className={lab.formGrid}>
              <label className={lab.field}>
                <span className={lab.label}>Email</span>
                <input className={lab.input} type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </label>
              <label className={lab.field}>
                <span className={lab.label}>Rol</span>
                <select className={lab.select} value={form.relationship_type} onChange={(e) => setForm((f) => ({ ...f, relationship_type: e.target.value }))}>
                  {RELATIONSHIP_TYPES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </label>
              <label className={lab.field}>
                <span className={lab.label}>Permiso</span>
                <select className={lab.select} value={form.access_level} onChange={(e) => setForm((f) => ({ ...f, access_level: e.target.value }))}>
                  {levels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </label>
            </div>
            <button type="submit" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} style={{ marginTop: 10 }} disabled={busy}>Crear invitación</button>
          </form>
          {result?.token ? (
            <p className={lab.subtle} style={{ wordBreak: "break-all" }}>Invitación creada. Compartí este código con la persona invitada; lo carga en <strong>/invitations/accept</strong> con su cuenta: <code>{result.token}</code></p>
          ) : result ? (
            <p className={lab.subtle}>Invitación creada.</p>
          ) : null}
        </section>
      ) : null}
      {isAdmin ? (
        <section className={lab.card}>
          <div className={lab.cardHead}><h2 className={lab.cardTitle}>Archivar jugador</h2></div>
          <p className={lab.subtle} style={{ marginTop: 0 }}>Lo saca del plantel activo. No borra nada: evaluaciones, sesiones y notas se conservan.</p>
          {confirmArchive ? (
            <div className={lab.btnRow}>
              <button type="button" className={cx(lab.btn, lab.btnDanger, lab.btnSmall)} disabled={busy} onClick={async () => { if (await run(() => devApi.archivePlayer(pid))) onArchived(); }}>Confirmar archivo</button>
              <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setConfirmArchive(false)}>Cancelar</button>
            </div>
          ) : (
            <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setConfirmArchive(true)}>Archivar</button>
          )}
        </section>
      ) : null}
    </div>
  );
}

export { DIMENSIONS };
