"use client";

import { useMemo, useState } from "react";
import { PERIODS, SOURCES, buildDashboard, deltaLabel, goalZones } from "@/lib/shooting/dashboard";
import { ALL_ZONES, SHOT_TAGS, compareZoneMaps, pctLabel, suggestShootingPlan, toggleTag, zoneById } from "@/lib/shooting/model";
import { todayISO } from "./api";
import { Kpi, Notice, Segment, SessionItem, cx, groupEntriesBySession } from "./parts";
import ShotChart, { ShotChartLegend } from "./ShotChart";
import TrendCharts from "./TrendCharts";
import styles from "./lab.module.css";

export default function Dashboard({ data, playersById, playerId, onPlayerChange, settings, onSettings, canCreate, onOpenSession, onNewSession, onHistory }) {
  const [periodId, setPeriodId] = useState("90");
  const [source, setSource] = useState("all");
  const [tags, setTags] = useState([]);
  const [compare, setCompare] = useState(false);
  const [chartMode, setChartMode] = useState("efficiency");
  const [zone, setZone] = useState(null);
  const { thresholds, minSample } = settings;

  const player = playerId ? playersById[playerId] : null;
  const pid = player ? playerId : null;

  const dash = useMemo(
    () => buildDashboard({ sessions: data.sessions, entries: data.entries, playerId: pid, periodId, source, tags, today: todayISO() }),
    [data, pid, periodId, source, tags]
  );
  const { current, previous } = dash;
  const t = current.totals;
  const p = previous?.totals;
  const entriesBySession = useMemo(() => groupEntriesBySession(data.entries), [data.entries]);

  const recent = useMemo(
    () =>
      data.sessions
        .filter((s) => s.status !== "archived" && (!pid || s.player_ids.includes(pid)))
        .slice()
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, 6),
    [data.sessions, pid]
  );
  const openDrafts = recent.filter((s) => s.status === "draft" || s.status === "in_progress");

  const goals = useMemo(() => (data.goals || []).filter((g) => !pid || g.player_id === pid), [data.goals, pid]);
  const linked = useMemo(() => goalZones(goals), [goals]);
  const comparison = useMemo(() => (compare && previous ? compareZoneMaps(previous.byZone, current.byZone, minSample) : null), [compare, previous, current, minSample]);
  const compareByZone = comparison ? Object.fromEntries(comparison.map((c) => [c.zone.id, c])) : {};

  const noData = !current.used.length;
  const selected = zone ? zoneById(zone) : null;
  const selLine = zone ? current.byZone[zone] : null;

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>{player ? player.display_name : "Todos los jugadores"}</h1>
          <p className={styles.lede}>
            Lanzamientos registrados por jugador, con su procedencia. Los tiros libres se muestran aparte y no entran en el porcentaje de campo.
          </p>
        </div>
        {canCreate ? (
          <button type="button" className={cx(styles.btn, styles.btnPrimary)} onClick={() => onNewSession(pid ? { player_ids: [pid] } : null)}>
            + Nueva sesión
          </button>
        ) : null}
      </div>

      <div className={styles.filters} role="group" aria-label="Filtros del panel">
        <label className={styles.srOnly} htmlFor="lab-player">Jugador</label>
        <select id="lab-player" className={styles.select} value={pid || ""} onChange={(e) => onPlayerChange(e.target.value)}>
          <option value="">Todos los jugadores</option>
          {data.players.map((pl) => (
            <option key={pl.id} value={pl.id}>{pl.display_name}</option>
          ))}
        </select>
        <Segment label="Período" options={PERIODS} value={periodId} onChange={setPeriodId} />
        <label className={styles.srOnly} htmlFor="lab-source">Procedencia</label>
        <select id="lab-source" className={styles.select} value={source} onChange={(e) => setSource(e.target.value)}>
          {SOURCES.map((s) => (
            <option key={s.id} value={s.id}>{s.id === "all" ? "Registros + histórico" : s.label}</option>
          ))}
        </select>
        {dash.range.previous ? (
          <label className={styles.chip} style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} style={{ accentColor: "#ff8a1f" }} />
            Comparar con el período anterior
          </label>
        ) : null}
      </div>

      <div className={styles.chipsWrap} style={{ marginBottom: 16 }}>
        <span className={styles.subtle} style={{ marginRight: 4 }}>Características:</span>
        {SHOT_TAGS.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={cx(styles.chip, tags.includes(tag.id) && styles.chipActive)}
            aria-pressed={tags.includes(tag.id)}
            onClick={() => setTags((cur) => toggleTag(cur, tag.id))}
          >
            {tag.label}
          </button>
        ))}
        {tags.length ? (
          <button type="button" className={cx(styles.btn, styles.btnGhost, styles.btnSmall)} onClick={() => setTags([])}>
            Quitar filtros
          </button>
        ) : null}
      </div>

      {current.excluded.groupLegacy ? (
        <Notice kind="info">
          {current.excluded.groupLegacy === 1 ? "1 sesión grupal histórica no se incluye" : `${current.excluded.groupLegacy} sesiones grupales históricas no se incluyen`}: se cargaron como total del grupo y no se puede saber cuánto tiró cada jugador.
        </Notice>
      ) : null}
      {current.excluded.tagLegacy ? (
        <Notice kind="info">
          Con filtros de características se excluyen {current.excluded.tagLegacy} sesión(es) históricas, porque no registraban esa información.
        </Notice>
      ) : null}
      {dash.legacyUsed ? (
        <p className={styles.subtle} style={{ margin: "0 0 12px" }}>
          Incluye {dash.legacyUsed} sesión(es) históricas{pid ? " de un solo participante" : ""}. El histórico no tiene «cerca del aro» ni tiros libres.
        </p>
      ) : null}

      <div className={styles.kpis} style={{ marginBottom: 16 }}>
        <Kpi label="Sesiones" value={String(current.used.length)} sub={compare && previous ? `Antes: ${previous.used.length}` : "En el período"} />
        <Kpi label="Tiros de campo" made={t.fg.made} attempts={t.fg.attempts} sub={compare ? deltaLabel(t.fg, p?.fg, minSample) || undefined : undefined} />
        <Kpi label="Dobles" made={t.two.made} attempts={t.two.attempts} />
        <Kpi label="Triples" made={t.three.made} attempts={t.three.attempts} sub={compare && t.three.attempts ? deltaLabel(t.three, p?.three, minSample) : undefined} />
        <Kpi label="Tiros libres" made={t.ft.made} attempts={t.ft.attempts} sub={compare && t.ft.attempts ? deltaLabel(t.ft, p?.ft, minSample) : undefined} />
      </div>

      {noData ? (
        <div className={styles.empty} style={{ marginBottom: 16 }}>
          <p className={styles.emptyTitle}>Sin lanzamientos en este período</p>
          <p className={styles.emptyText}>
            {pid ? "Este jugador no tiene registros propios con estos filtros." : "No hay sesiones con estos filtros."} Probá con «Todo» o registrá una sesión nueva.
          </p>
          {canCreate ? (
            <button type="button" className={cx(styles.btn, styles.btnPrimary)} onClick={() => onNewSession(pid ? { player_ids: [pid] } : null)}>
              Registrar una sesión
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={cx(styles.grid, styles.gridMain)}>
        <div className={styles.stack}>
          <section className={styles.card} aria-labelledby="lab-map-title">
            <div className={styles.cardHead}>
              <div>
                <h2 className={styles.cardTitle} id="lab-map-title">Mapa de lanzamiento</h2>
                <p className={styles.cardHint}>Tocá una zona para ver el detalle.</p>
              </div>
              <Segment
                label="Vista del mapa"
                options={[{ id: "efficiency", label: "Efectividad" }, { id: "volume", label: "Volumen" }]}
                value={chartMode}
                onChange={setChartMode}
              />
            </div>
            <ShotChart
              byZone={current.byZone}
              mode={chartMode}
              thresholds={thresholds}
              minSample={minSample}
              selectedZone={zone}
              onSelectZone={(id) => setZone((z) => (z === id ? null : id))}
              title={`Mapa de lanzamiento: ${player ? player.display_name : "todos los jugadores"}`}
            />
            <ShotChartLegend mode={chartMode} thresholds={thresholds} minSample={minSample} />
            {selected ? (
              <div className={cx(styles.notice, styles.noticeInfo)} style={{ marginTop: 12 }}>
                <div>
                  <strong>{selected.label}</strong>:{" "}
                  {selLine.attempts ? `${selLine.made}/${selLine.attempts} · ${pctLabel(selLine.made, selLine.attempts)}` : "sin registros"}
                  {selLine.attempts && selLine.attempts < minSample ? ` · muestra menor a ${minSample} intentos, interpretar con cuidado` : ""}
                  {compareByZone[zone] && previous ? (
                    <>
                      {" "}· Período anterior: {compareByZone[zone].a.attempts ? `${compareByZone[zone].a.made}/${compareByZone[zone].a.attempts}` : "sin registros"}
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          <section className={styles.card} aria-labelledby="lab-zones-title">
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle} id="lab-zones-title">Detalle por zona</h2>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Zona</th>
                    <th className={styles.num}>Aciertos</th>
                    <th className={styles.num}>Intentos</th>
                    <th className={styles.num}>%</th>
                    {comparison ? <th className={styles.num}>vs. antes</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {ALL_ZONES.map((z) => {
                    const line = current.byZone[z.id];
                    const c = compareByZone[z.id];
                    return (
                      <tr
                        key={z.id}
                        className={cx(styles.clickRow, zone === z.id && styles.rowSelected)}
                        onClick={() => z.id !== "ft" && setZone((cur) => (cur === z.id ? null : z.id))}
                      >
                        <td>{z.label}</td>
                        <td className={styles.num}>{line.attempts ? line.made : "—"}</td>
                        <td className={styles.num}>{line.attempts || "—"}</td>
                        <td className={styles.num}>
                          {line.attempts ? pctLabel(line.made, line.attempts) : "sin datos"}
                          {line.attempts && line.attempts < minSample ? "*" : ""}
                        </td>
                        {comparison ? (
                          <td className={styles.num}>
                            {c.deltaPct == null ? <span className={styles.subtle}>muestra chica</span> : `${c.deltaPct > 0 ? "+" : ""}${Math.round(c.deltaPct * 10) / 10} pts`}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                  <tr className={styles.rowTotal}>
                    <td>Total de campo</td>
                    <td className={styles.num}>{t.fg.made}</td>
                    <td className={styles.num}>{t.fg.attempts}</td>
                    <td className={styles.num}>{t.fg.attempts ? pctLabel(t.fg.made, t.fg.attempts) : "sin datos"}</td>
                    {comparison ? <td className={styles.num}>{deltaLabel(t.fg, p?.fg, minSample)?.replace(" vs. período anterior", "") || ""}</td> : null}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className={styles.subtle} style={{ marginBottom: 0 }}>* Menos de {minSample} intentos.</p>
          </section>

          <section className={styles.card} aria-labelledby="lab-trend-title">
            <div className={styles.cardHead}>
              <div>
                <h2 className={styles.cardTitle} id="lab-trend-title">Evolución</h2>
                <p className={styles.cardHint}>Efectividad de campo por fecha de sesión, y volumen de intentos debajo.</p>
              </div>
            </div>
            <TrendCharts points={dash.timeline} minSample={minSample} />
          </section>
        </div>

        <div className={styles.stack}>
          {openDrafts.length ? (
            <section className={styles.card} aria-labelledby="lab-open-title">
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle} id="lab-open-title">Para retomar</h2>
              </div>
              <ul className={styles.list}>
                {openDrafts.map((s) => (
                  <SessionItem key={s.id} session={s} entries={entriesBySession[s.id]} playersById={playersById} onOpen={onOpenSession} playerId={pid} />
                ))}
              </ul>
            </section>
          ) : null}

          <section className={styles.card} aria-labelledby="lab-recent-title">
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle} id="lab-recent-title">Sesiones recientes</h2>
              <button type="button" className={cx(styles.btn, styles.btnGhost, styles.btnSmall)} onClick={onHistory}>
                Ver historial
              </button>
            </div>
            {recent.length ? (
              <ul className={styles.list}>
                {recent.map((s) => (
                  <SessionItem key={s.id} session={s} entries={entriesBySession[s.id]} playersById={playersById} onOpen={onOpenSession} playerId={pid} />
                ))}
              </ul>
            ) : (
              <p className={styles.subtle}>Todavía no hay sesiones.</p>
            )}
          </section>

          <PlanCard
            byZone={current.byZone}
            settings={settings}
            goalZoneIds={linked.zones}
            player={player}
            canCreate={canCreate}
            onCreate={(notes) => onNewSession({ player_ids: pid ? [pid] : [], notes, nombre: "Plan de tiro" })}
          />

          <section className={styles.card} aria-labelledby="lab-goals-title">
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle} id="lab-goals-title">Objetivos activos</h2>
            </div>
            {goals.length ? (
              <ul className={styles.list}>
                {goals.slice(0, 6).map((g) => {
                  const m = linked.matched.find((x) => x.goal.id === g.id);
                  return (
                    <li key={g.id} className={styles.goalItem}>
                      <div>{g.body}</div>
                      <div className={styles.subtle}>
                        {!pid ? `${playersById[g.player_id]?.display_name || "Jugador"} · ` : ""}
                        {m ? `Relacionado con: ${m.zones.map((z) => zoneById(z)?.short).join(", ")}` : "Sin zona relacionada"}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.subtle}>Sin objetivos activos{player ? " para este jugador" : ""}.</p>
            )}
            <p className={styles.subtle} style={{ marginBottom: 0 }}>
              La relación con las zonas se detecta por palabras como «triple», «esquina» o «libre». Los objetivos medibles llegan en una próxima etapa.
            </p>
          </section>

          <section className={styles.card} aria-labelledby="lab-routines-title">
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle} id="lab-routines-title">Rutinas y ejercicios</h2>
            </div>
            <p className={styles.subtle} style={{ margin: 0 }}>
              Las rutinas guardadas y su paso al planificador llegan con la etapa del planificador. Por ahora, el plan sugerido se guarda como nota de una sesión en borrador.
            </p>
          </section>

          <SettingsCard settings={settings} onSave={onSettings} />
        </div>
      </div>
    </>
  );
}

function planText(items, player) {
  const lines = items.filter((i) => i.shots > 0).map((i) => `- ${i.zone.label}: ${i.shots} tiros (${i.reasonLabel})`);
  const total = items.reduce((a, i) => a + (Number(i.shots) || 0), 0);
  return [`Plan de tiro${player ? ` · ${player.display_name}` : ""} · ${total} tiros`, ...lines].join("\n");
}

function PlanCard({ byZone, settings, goalZoneIds, player, canCreate, onCreate }) {
  const [total, setTotal] = useState(60);
  const [includeFt, setIncludeFt] = useState(true);
  const [edits, setEdits] = useState({});
  const [copied, setCopied] = useState(false);

  const plan = useMemo(
    () =>
      suggestShootingPlan(byZone, {
        totalShots: total,
        minSample: settings.minSample,
        thresholds: settings.thresholds,
        goalZones: goalZoneIds,
        includeFreeThrows: includeFt
      }),
    [byZone, total, settings, goalZoneIds, includeFt]
  );
  const items = plan.items.map((i) => ({ ...i, shots: edits[i.zone.id] ?? i.shots }));
  const sum = items.reduce((a, i) => a + (Number(i.shots) || 0), 0);

  async function copy() {
    try {
      await navigator.clipboard.writeText(planText(items, player));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="lab-plan-title">
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle} id="lab-plan-title">Plan de tiro sugerido</h2>
          <p className={styles.cardHint}>Según los datos filtrados. Editá las cantidades antes de usarlo.</p>
        </div>
      </div>
      <div className={styles.formGrid} style={{ marginBottom: 10 }}>
        <label className={styles.field}>
          <span className={styles.label}>Total de tiros</span>
          <input
            className={styles.input}
            type="number"
            inputMode="numeric"
            min={10}
            max={500}
            value={total}
            onChange={(e) => {
              setTotal(e.target.value);
              setEdits({});
            }}
          />
        </label>
        <label className={styles.field} style={{ alignSelf: "end" }}>
          <span className={styles.chip} style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={includeFt} onChange={(e) => { setIncludeFt(e.target.checked); setEdits({}); }} style={{ accentColor: "#ff8a1f" }} />
            Incluir tiros libres
          </span>
        </label>
      </div>
      {plan.notes.map((n) => (
        <Notice key={n} kind="info">{n}</Notice>
      ))}
      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        {items.map((i) => (
          <div key={i.zone.id} className={styles.planRow}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{i.zone.label}</div>
              <div className={styles.subtle}>
                {i.reasonLabel}
                {i.sample.attempts ? ` · ${i.sample.made}/${i.sample.attempts}` : ""}
              </div>
            </div>
            <label className={styles.srOnly} htmlFor={`plan-${i.zone.id}`}>Tiros en {i.zone.label}</label>
            <input
              id={`plan-${i.zone.id}`}
              className={cx(styles.input, styles.planInput)}
              type="number"
              inputMode="numeric"
              min={0}
              max={500}
              value={i.shots}
              onChange={(e) => setEdits((cur) => ({ ...cur, [i.zone.id]: Math.max(0, Math.min(500, Math.floor(Number(e.target.value) || 0))) }))}
            />
          </div>
        ))}
      </div>
      <p className={styles.subtle}>Total: {sum} tiros. Una zona nunca se marca como débil con menos de {settings.minSample} intentos.</p>
      <div className={styles.btnRow}>
        <button type="button" className={cx(styles.btn, styles.btnGhost)} onClick={copy}>
          {copied ? "Copiado" : "Copiar plan"}
        </button>
        {canCreate ? (
          <button type="button" className={cx(styles.btn, styles.btnPrimary)} onClick={() => onCreate(planText(items, player))}>
            Crear sesión con este plan
          </button>
        ) : null}
      </div>
    </section>
  );
}

function SettingsCard({ settings, onSave }) {
  const [low, setLow] = useState(settings.thresholds.low);
  const [high, setHigh] = useState(settings.thresholds.high);
  const [minSample, setMinSample] = useState(settings.minSample);
  const l = Number(low);
  const h = Number(high);
  const m = Math.floor(Number(minSample));
  const valid = l >= 0 && h <= 100 && l < h && m >= 1 && m <= 500;
  return (
    <details className={cx(styles.card, styles.details)}>
      <summary>Referencias visuales</summary>
      <p className={styles.subtle}>Cambian solo los colores y el aviso de muestra chica en este dispositivo. No cambian ningún dato.</p>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.label}>Bajo, menos de (%)</span>
          <input className={styles.input} type="number" min={0} max={100} value={low} onChange={(e) => setLow(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Alto, más de (%)</span>
          <input className={styles.input} type="number" min={0} max={100} value={high} onChange={(e) => setHigh(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Muestra mínima (intentos)</span>
          <input className={styles.input} type="number" min={1} max={500} value={minSample} onChange={(e) => setMinSample(e.target.value)} />
        </label>
      </div>
      {!valid ? <p className={styles.subtle}>El valor bajo tiene que ser menor que el alto, entre 0 y 100.</p> : null}
      <div className={styles.btnRow} style={{ marginTop: 10 }}>
        <button type="button" className={cx(styles.btn, styles.btnPrimary, styles.btnSmall)} disabled={!valid} onClick={() => onSave({ thresholds: { low: l, high: h }, minSample: m })}>
          Guardar
        </button>
        <button
          type="button"
          className={cx(styles.btn, styles.btnGhost, styles.btnSmall)}
          onClick={() => {
            setLow(40);
            setHigh(60);
            setMinSample(20);
            onSave({ thresholds: { low: 40, high: 60 }, minSample: 20 });
          }}
        >
          Restablecer
        </button>
      </div>
    </details>
  );
}

