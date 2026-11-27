"use client";

import { useMemo, useState } from "react";
import { LEGACY_STAT_LABELS, STAT_FIELDS } from "@/lib/player-dev/catalog";
import { aggregateStats, pctText, validateStatRecord } from "@/lib/player-dev/model";
import { formatDate, newClientId, todayISO } from "@/components/shooting-lab/api";
import { Kpi, Notice, Segment, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi } from "./api";
import s from "./dev.module.css";

const shot = (m, a) => (m == null ? "—" : `${m}/${a}`);

export default function StatsTab({ profile, canEdit, onChanged }) {
  const [type, setType] = useState("match");
  const [season, setSeason] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | record
  const installed = profile.schema?.installed;
  const legacy = profile.stats.filter((r) => r.record_type === "manual_legacy");
  const seasons = [...new Set(profile.stats.filter((r) => r.record_type === type && r.season).map((r) => r.season))].sort().reverse();
  const records = useMemo(
    () => profile.stats.filter((r) => r.record_type === type && (!season || r.season === season)).sort((a, b) => String(b.played_on).localeCompare(String(a.played_on))),
    [profile.stats, type, season]
  );
  const agg = aggregateStats(records, type);

  return (
    <div className={lab.stack}>
      {!installed ? <Notice kind="warn">Para guardar estadísticas con historial falta correr la migración 012 en Supabase.</Notice> : null}
      <div className={lab.filters}>
        <Segment label="Tipo" options={[{ id: "match", label: "Partidos" }, { id: "training", label: "Entrenamientos" }]} value={type} onChange={(t) => { setType(t); setSeason(""); }} />
        {seasons.length ? (
          <select className={lab.select} value={season} onChange={(e) => setSeason(e.target.value)} aria-label="Temporada">
            <option value="">Todas las temporadas</option>
            {seasons.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        ) : null}
        {canEdit && installed ? (
          <button type="button" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} onClick={() => setEditing("new")}>
            + {type === "match" ? "Partido" : "Entrenamiento"}
          </button>
        ) : null}
      </div>
      <p className={lab.subtle} style={{ margin: 0 }}>
        Partidos y entrenamientos se muestran por separado y nunca se suman entre sí. Los porcentajes salen de convertidos totales sobre intentados totales.
      </p>

      <div className={lab.kpis}>
        <Kpi label={type === "match" ? "Partidos" : "Registros"} value={String(agg.count)} sub={season || "Todas las temporadas"} />
        <Kpi label="Campo" made={agg.fg.made} attempts={agg.fg.att} />
        <Kpi label="Triples" made={agg.fg3.made} attempts={agg.fg3.att} />
        <Kpi label="Libres" made={agg.ft.made} attempts={agg.ft.att} />
        <Kpi label="Puntos por registro" value={agg.averages.points != null ? String(agg.averages.points) : "—"} sub={agg.counts.points ? `${agg.counts.points} con dato` : "Sin datos"} />
      </div>

      {Object.keys(agg.averages).length ? (
        <section className={lab.card}>
          <div className={lab.cardHead}><h2 className={lab.cardTitle}>Promedios por registro</h2></div>
          <div className={s.statGrid}>
            {[["minutes", "Minutos"], ["reb", "Rebotes"], ["assists", "Asistencias"], ["turnovers", "Pérdidas"], ["steals", "Recuperos"], ["blocks", "Tapones"], ["fouls", "Faltas"]]
              .filter(([k]) => agg.averages[k] != null)
              .map(([k, l]) => (
                <div key={k} className={lab.kpi}>
                  <div className={lab.kpiLabel}>{l}</div>
                  <div className={lab.kpiValue} style={{ fontSize: 22 }}>{agg.averages[k].toLocaleString("es-AR")}</div>
                  <div className={lab.kpiSub}>{agg.counts[k]} registro(s)</div>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <section className={lab.card}>
        <div className={lab.cardHead}><h2 className={lab.cardTitle}>Registros</h2></div>
        {records.length ? (
          <div className={lab.tableWrap}>
            <table className={lab.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  {type === "match" ? <th>Rival</th> : null}
                  <th className={lab.num}>Min</th>
                  <th className={lab.num}>Pts</th>
                  <th className={lab.num}>2P</th>
                  <th className={lab.num}>3P</th>
                  <th className={lab.num}>TL</th>
                  <th className={lab.num}>Reb</th>
                  <th className={lab.num}>Ast</th>
                  <th className={lab.num}>Pér</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className={canEdit ? lab.clickRow : undefined} onClick={() => canEdit && setEditing(r)}>
                    <td>{formatDate(r.played_on)}{r.competition ? <div className={lab.subtle}>{r.competition}</div> : null}</td>
                    {type === "match" ? <td>{r.opponent || "—"}</td> : null}
                    <td className={lab.num}>{r.minutes ?? "—"}</td>
                    <td className={lab.num}>{r.points ?? "—"}</td>
                    <td className={lab.num}>{shot(r.fg2_made, r.fg2_att)}</td>
                    <td className={lab.num}>{shot(r.fg3_made, r.fg3_att)}</td>
                    <td className={lab.num}>{shot(r.ft_made, r.ft_att)}</td>
                    <td className={lab.num}>{r.oreb == null && r.dreb == null ? "—" : (r.oreb || 0) + (r.dreb || 0)}</td>
                    <td className={lab.num}>{r.assists ?? "—"}</td>
                    <td className={lab.num}>{r.turnovers ?? "—"}</td>
                  </tr>
                ))}
                <tr className={lab.rowTotal}>
                  <td>Total</td>
                  {type === "match" ? <td /> : null}
                  <td className={lab.num} />
                  <td className={lab.num}>{agg.sums.points ?? "—"}</td>
                  <td className={lab.num}>{agg.fg2.att ? `${agg.fg2.made}/${agg.fg2.att} · ${pctText(agg.fg2.made, agg.fg2.att)}` : "—"}</td>
                  <td className={lab.num}>{agg.fg3.att ? `${agg.fg3.made}/${agg.fg3.att} · ${pctText(agg.fg3.made, agg.fg3.att)}` : "—"}</td>
                  <td className={lab.num}>{agg.ft.att ? `${agg.ft.made}/${agg.ft.att} · ${pctText(agg.ft.made, agg.ft.att)}` : "—"}</td>
                  <td className={lab.num}>{agg.sums.reb ?? "—"}</td>
                  <td className={lab.num}>{agg.sums.assists ?? "—"}</td>
                  <td className={lab.num}>{agg.sums.turnovers ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className={lab.subtle}>Sin registros de {type === "match" ? "partidos" : "entrenamientos"}{season ? " en esta temporada" : ""}.</p>
        )}
        <p className={lab.subtle}>La Planilla de partido todavía no genera estadísticas por jugador; cuando lo haga se van a sumar acá sin cargarlas dos veces.</p>
      </section>

      {legacy.length || hasLegacyGameStats(profile.player.game_stats) ? (
        <section className={lab.card}>
          <div className={lab.cardHead}>
            <div>
              <h2 className={lab.cardTitle}>Histórico manual</h2>
              <p className={lab.cardHint}>Valores cargados en el sistema anterior, sin fecha ni intentos. Se conservan tal cual y no entran en los totales.</p>
            </div>
          </div>
          <div className={s.statGrid}>
            {Object.entries((legacy[0]?.legacy_values) || pickLegacy(profile.player.game_stats)).map(([k, v]) => (
              <div key={k} className={lab.kpi}>
                <div className={lab.kpiLabel}>{LEGACY_STAT_LABELS[k] || k}</div>
                <div className={lab.kpiValue} style={{ fontSize: 22 }}>{String(v)}{/pct$/.test(k) && !String(v).includes("%") ? "%" : ""}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {editing ? (
        <StatDialog playerId={profile.player.id} record={editing === "new" ? null : editing} type={type} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onChanged(); }} />
      ) : null}
    </div>
  );
}

function pickLegacy(gs) {
  const out = {};
  Object.keys(LEGACY_STAT_LABELS).forEach((k) => {
    const v = gs?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") out[k] = v;
  });
  return out;
}

function hasLegacyGameStats(gs) {
  return Object.keys(pickLegacy(gs)).length > 0;
}

function StatDialog({ playerId, record, type, onClose, onSaved }) {
  const [clientId] = useState(() => newClientId());
  const [form, setForm] = useState(() => {
    const o = { record_type: record?.record_type || type, played_on: record?.played_on || todayISO(), opponent: record?.opponent || "", competition: record?.competition || "", season: record?.season || "", notes: record?.notes || "" };
    STAT_FIELDS.forEach((f) => (o[f.key] = record?.[f.key] ?? ""));
    return o;
  });
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);

  async function save(e) {
    e.preventDefault();
    const v = validateStatRecord({ ...form, client_record_id: clientId });
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      if (record) await devApi.editStats(playerId, record.id, form);
      else await devApi.addStats(playerId, { ...form, client_record_id: clientId });
      await onSaved();
    } catch (err) {
      setErrors([err.message]);
      setBusy(false);
    }
  }

  return (
    <div className={lab.dialogBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className={lab.dialog} style={{ width: "min(680px, 100%)" }} role="dialog" aria-modal="true" aria-label="Estadísticas" onSubmit={save}>
        <h2 className={lab.dialogTitle}>{record ? "Editar registro" : form.record_type === "match" ? "Nuevo partido" : "Nuevo entrenamiento"}</h2>
        <div className={lab.formGrid}>
          <label className={lab.field}>
            <span className={lab.label}>Fecha</span>
            <input className={lab.input} type="date" max={todayISO()} value={form.played_on} onChange={(e) => setForm((f) => ({ ...f, played_on: e.target.value }))} />
          </label>
          {form.record_type === "match" ? (
            <>
              <label className={lab.field}><span className={lab.label}>Rival</span><input className={lab.input} value={form.opponent} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, opponent: e.target.value }))} /></label>
              <label className={lab.field}><span className={lab.label}>Competición</span><input className={lab.input} value={form.competition} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, competition: e.target.value }))} /></label>
            </>
          ) : null}
          <label className={lab.field}><span className={lab.label}>Temporada</span><input className={lab.input} value={form.season} maxLength={40} placeholder="2026" onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))} /></label>
        </div>
        <div className={s.statGrid}>
          {STAT_FIELDS.map((f) => (
            <label key={f.key} className={lab.field}>
              <span className={lab.label}>{f.label}</span>
              <input className={lab.input} type="number" inputMode={f.decimal ? "decimal" : "numeric"} min={0} max={999} step={f.decimal ? 0.1 : 1} value={form[f.key]} onChange={(e) => setForm((x) => ({ ...x, [f.key]: e.target.value }))} />
            </label>
          ))}
        </div>
        <p className={lab.subtle} style={{ margin: 0 }}>Dejá vacío lo que no registraste (vacío no es 0). En tiros, cargá convertidos e intentados juntos.</p>
        <label className={lab.field}><span className={lab.label}>Notas</span><textarea className={lab.textarea} rows={2} maxLength={2000} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
        {errors.length ? <Notice kind="error"><ul style={{ margin: 0, paddingLeft: 18 }}>{errors.map((x) => <li key={x}>{x}</li>)}</ul></Notice> : null}
        <div className={lab.btnRow}>
          <button type="submit" className={cx(lab.btn, lab.btnPrimary)} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
          <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={onClose}>Cancelar</button>
          {record ? (
            confirmVoid ? (
              <button type="button" className={cx(lab.btn, lab.btnDanger)} disabled={busy} onClick={async () => { setBusy(true); try { await devApi.voidStats(playerId, record.id); await onSaved(); } catch (err) { setErrors([err.message]); setBusy(false); } }}>
                Confirmar anulación
              </button>
            ) : (
              <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={() => setConfirmVoid(true)}>Anular registro</button>
            )
          ) : null}
        </div>
      </form>
    </div>
  );
}
