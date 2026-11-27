"use client";

import { useCallback, useEffect, useState } from "react";
import { ASK_PRESETS, REPORT_SECTIONS, REPORT_STATUS, REPORT_TYPES, defaultPeriod } from "@/lib/player-dev/insights";
import { labelOf } from "@/lib/player-dev/goals";
import { renderMarkdown } from "@/components/assistant/renderMarkdown";
import { formatDate, todayISO } from "@/components/shooting-lab/api";
import { Notice, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi } from "./api";
import { Dialog } from "./Fundamentals";
import s from "./dev.module.css";

const PERIODS = [
  { id: 30, label: "30 días" },
  { id: 90, label: "3 meses" },
  { id: 180, label: "6 meses" },
  { id: 365, label: "1 año" }
];

const REC_QUESTION =
  "Con estos datos, proponé recomendaciones concretas para el informe de desarrollo del período: qué priorizar y con qué ejercicios. Separá datos, interpretación y recomendación, y aclará lo que no se puede concluir.";

export default function ReportsTab({ profile, canEdit }) {
  const pid = profile.player.id;
  const [openId, setOpenId] = useState(null);
  return (
    <div className={lab.stack}>
      <Analysis pid={pid} />
      {openId ? (
        <ReportEditor id={openId} me={profile.me} canEdit={canEdit} pid={pid} onBack={() => setOpenId(null)} />
      ) : (
        <ReportsList pid={pid} me={profile.me} canEdit={canEdit} onOpen={setOpenId} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Análisis automático + consulta al Asistente
// ---------------------------------------------------------------------------

function Analysis({ pid }) {
  const [days, setDays] = useState(90);
  const [notes, setNotes] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showSent, setShowSent] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [askError, setAskError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    devApi.insights(pid, { days, notes }).then(setData).catch((e) => setError(e.message));
  }, [pid, days, notes]);

  async function ask(body) {
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    try {
      setAnswer(await devApi.ask(pid, { ...body, days, include_notes: notes }));
    } catch (e) {
      setAskError(e.message);
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className={lab.card}>
      <div className={lab.cardHead}>
        <div>
          <h2 className={lab.cardTitle}>Análisis</h2>
          <p className={lab.cardHint}>Calculado con lo registrado (sesiones, partidos, evaluaciones, objetivos y asistencia).</p>
        </div>
        <div className={lab.segment} role="radiogroup" aria-label="Período">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={days === p.id} className={cx(lab.segmentBtn, days === p.id && lab.segmentBtnActive)} onClick={() => setDays(p.id)}>{p.label}</button>
          ))}
        </div>
      </div>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!data && !error ? <div className={lab.skeleton} style={{ height: 120 }} /> : null}
      {data ? (
        <div className={cx(lab.grid, lab.gridMain)}>
          <div>
            <p className={lab.stepLabel}>Lo que muestran los datos</p>
            {data.digest.signals.length ? (
              <ul className={s.insightList}>
                {data.digest.signals.map((x) => (
                  <li key={x.id + x.text} className={x.insufficient ? s.insightMuted : undefined}>
                    {x.text}
                    <span className={s.insightBasis}>{x.basis}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={lab.subtle}>Todavía no hay datos suficientes para señalar algo.</p>
            )}
          </div>
          <div>
            <p className={lab.stepLabel}>Lo que falta para evaluar mejor</p>
            {data.digest.gaps.length ? (
              <ul className={s.insightList}>{data.digest.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
            ) : (
              <p className={lab.subtle}>Nada importante.</p>
            )}
          </div>
        </div>
      ) : null}

      <div className={s.askBox}>
        <p className={lab.stepLabel} style={{ marginTop: 0 }}>Preguntar al Asistente IA</p>
        <div className={s.chips}>
          {ASK_PRESETS.map((p) => (
            <button key={p.id} type="button" className={s.chip} disabled={asking || !data} onClick={() => { setQuestion(p.text); ask({ preset: p.id }); }}>{p.text}</button>
          ))}
        </div>
        <form
          className={lab.filters}
          style={{ marginBottom: 0 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim()) ask({ question });
          }}
        >
          <input className={lab.input} value={question} maxLength={1000} onChange={(e) => setQuestion(e.target.value)} placeholder="O escribí tu pregunta sobre este jugador" aria-label="Pregunta al Asistente" style={{ flex: 1, minWidth: 200 }} />
          <button type="submit" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} disabled={asking || !question.trim() || !data}>{asking ? "Consultando…" : "Preguntar"}</button>
        </form>
        <label className={lab.subtle} style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 0" }}>
          <input type="checkbox" checked={notes} onChange={(e) => setNotes(e.target.checked)} /> Incluir observaciones compartidas (nunca las privadas)
        </label>
        <p className={lab.subtle} style={{ margin: "6px 0 0" }}>
          Se envía a Gemini un resumen sin nombre, equipo ni fecha de nacimiento, solo cuando preguntás.{" "}
          <button type="button" className={s.linkish} onClick={() => setShowSent(!showSent)} aria-expanded={showSent}>{showSent ? "Ocultar" : "Ver qué se envía"}</button>
        </p>
        {showSent && data ? <pre className={s.sentBox}>{data.sent}</pre> : null}
        {askError ? <Notice kind="error">{askError}</Notice> : null}
        {asking ? <div className={lab.skeleton} style={{ height: 80, marginTop: 10 }} aria-busy="true" /> : null}
        {answer ? (
          <div className={s.answer}>
            <p className={lab.stepLabel} style={{ marginTop: 0 }}>{answer.question}</p>
            <div className={s.markdown}>{renderMarkdown(answer.answer)}</div>
            {answer.truncated ? <p className={lab.subtle}>La respuesta quedó cortada por largo.</p> : null}
            <p className={lab.subtle} style={{ marginBottom: 0 }}>
              Respuesta generada por IA a partir del resumen: revisala antes de usarla.{answer.conversationId ? <> Quedó guardada en el <a href={`/assistant?c=${answer.conversationId}`} style={{ color: "inherit" }}>historial del Asistente</a>.</> : null}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Informes
// ---------------------------------------------------------------------------

function ReportsList({ pid, me, canEdit, onOpen }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const load = useCallback(() => devApi.reports(pid).then(setData).catch((e) => setError(e.message)), [pid]);
  useEffect(() => {
    load();
  }, [load]);
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!data) return <div className={lab.skeleton} style={{ height: 120 }} />;
  if (!data.installed) return <Notice kind="warn">Para crear informes falta correr <code>docs/sql/015-player-reports.sql</code> en Supabase.</Notice>;
  const list = data.reports.filter((r) => (r.status === "archived") === showArchived);
  return (
    <section className={lab.card}>
      <div className={lab.cardHead}>
        <div>
          <h2 className={lab.cardTitle}>Informes</h2>
          <p className={lab.cardHint}>Se crean como borrador (solo los ves vos). Los revisás, los editás y recién ahí los compartís.</p>
        </div>
        <div className={lab.btnRow}>
          {canEdit ? <button type="button" className={cx(lab.btn, lab.btnPrimary, lab.btnSmall)} onClick={() => setCreating(true)}>+ Nuevo informe</button> : null}
          <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => setShowArchived(!showArchived)}>{showArchived ? "Ver vigentes" : "Ver archivados"}</button>
        </div>
      </div>
      {list.length ? (
        <ul className={lab.list}>
          {list.map((r) => (
            <li key={r.id}>
              <button type="button" className={cx(s.stackItem, s.rowBtn)} onClick={() => onOpen(r.id)}>
                <span className={lab.sessionName}>{r.title}</span>
                <span className={lab.sessionMeta}>
                  <span className={cx(lab.badge, r.status === "draft" && lab.badgeDraft)}>{labelOf(REPORT_STATUS, r.status)}</span>
                  {r.report_type ? <span>{labelOf(REPORT_TYPES, r.report_type)}</span> : null}
                  {r.period_from ? <span>{formatDate(r.period_from)} – {formatDate(r.period_to)}</span> : <span>{formatDate(String(r.created_at).slice(0, 10))}</span>}
                  {r.created_by_user_id === me ? <span>Tuyo</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={lab.subtle}>{showArchived ? "No hay informes archivados." : "Todavía no hay informes."}</p>
      )}
      {creating ? (
        <NewReportDialog
          pid={pid}
          onClose={() => setCreating(false)}
          onCreated={(r) => {
            setCreating(false);
            onOpen(r.id);
          }}
        />
      ) : null}
    </section>
  );
}

function NewReportDialog({ pid, onClose, onCreated }) {
  const today = todayISO();
  const [type, setType] = useState("monthly");
  const [period, setPeriod] = useState(() => defaultPeriod("monthly", today));
  const [sections, setSections] = useState(REPORT_SECTIONS.map((x) => x.id).filter((x) => x !== "notes"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const toggle = (id) => setSections((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  return (
    <Dialog title="Nuevo informe" onClose={onClose}>
      <form
        style={{ display: "grid", gap: 12 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const r = await devApi.addReport(pid, { report_type: type, period_from: period.from, period_to: period.to, sections });
            onCreated(r.report);
          } catch (err) {
            setError(err.message);
            setBusy(false);
          }
        }}
      >
        <label className={lab.field}>
          <span className={lab.label}>Tipo</span>
          <select className={lab.select} value={type} onChange={(e) => { setType(e.target.value); setPeriod(defaultPeriod(e.target.value, today)); }}>
            {REPORT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <div className={lab.formGrid}>
          <label className={lab.field}>
            <span className={lab.label}>Desde</span>
            <input className={lab.input} type="date" max={period.to} value={period.from} onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))} required />
          </label>
          <label className={lab.field}>
            <span className={lab.label}>Hasta</span>
            <input className={lab.input} type="date" max={today} value={period.to} onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))} required />
          </label>
        </div>
        <fieldset className={s.checkGrid}>
          <legend className={lab.label}>Secciones</legend>
          {REPORT_SECTIONS.map((x) => (
            <label key={x.id}>
              <input type="checkbox" checked={sections.includes(x.id)} disabled={x.id === "summary"} onChange={() => toggle(x.id)} /> {x.label}
            </label>
          ))}
        </fieldset>
        <p className={lab.subtle} style={{ margin: 0 }}>Los números se toman de lo registrado en el período y quedan fijos en el informe. «Observaciones» suma solo notas compartidas, nunca las privadas.</p>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <div className={lab.btnRow}>
          <button type="submit" className={cx(lab.btn, lab.btnPrimary)} disabled={busy}>{busy ? "Armando…" : "Crear borrador"}</button>
          <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </Dialog>
  );
}

function ReportEditor({ id, me, canEdit, pid, onBack }) {
  const [report, setReport] = useState(null);
  const [texts, setTexts] = useState({});
  const [title, setTitle] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmShare, setConfirmShare] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  useEffect(() => {
    devApi
      .report(id)
      .then((r) => {
        setReport(r.report);
        setTexts(r.report.texts || {});
        setTitle(r.report.title);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error && !report) return <Notice kind="error">{error} <button type="button" className={cx(lab.btn, lab.btnSmall)} onClick={onBack}>Volver</button></Notice>;
  if (!report) return <div className={lab.skeleton} style={{ height: 240 }} />;

  const editable = canEdit && report.status === "draft" && report.created_by_user_id === me;
  const sections = report.sections || Object.keys(report.texts || {});

  async function save(extra = {}) {
    setBusy(true);
    setError(null);
    try {
      const body = editable && (dirty || aiUsed) ? { title, texts, ...(aiUsed ? { ai_assisted: true } : {}), ...extra } : extra;
      const r = await devApi.editReport(id, body);
      setReport(r.report);
      setTexts(r.report.texts || {});
      setDirty(false);
      setAiUsed(false);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function suggest() {
    setBusy(true);
    setError(null);
    try {
      const days = Math.min(365, Math.max(30, Math.round((new Date(report.period_to) - new Date(report.period_from)) / 86400000) + 1));
      const r = await devApi.ask(pid, { question: REC_QUESTION, days: [30, 90, 180, 365].find((d) => d >= days) || 365, save_history: false });
      setTexts((t) => ({ ...t, recommendations: `${t.recommendations ? `${t.recommendations}\n\n` : ""}Sugerido por el Asistente IA (revisar):\n${r.answer}` }));
      setAiUsed(true);
      setDirty(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={lab.card}>
      <div className={lab.btnRow} style={{ marginBottom: 10 }}>
        <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={onBack}>← Informes</button>
        <a className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} href={`/players?view=report&id=${report.id}`} target="_blank" rel="noopener noreferrer">Imprimir / PDF</a>
      </div>
      <div className={lab.cardHead}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {editable ? (
            <input className={lab.input} value={title} maxLength={160} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} aria-label="Título del informe" style={{ fontWeight: 700, fontSize: 17, width: "100%" }} />
          ) : (
            <h2 className={lab.cardTitle}>{report.title}</h2>
          )}
          <p className={lab.cardHint}>
            {labelOf(REPORT_STATUS, report.status)}
            {report.report_type ? ` · ${labelOf(REPORT_TYPES, report.report_type)}` : ""}
            {report.period_from ? ` · ${formatDate(report.period_from)} – ${formatDate(report.period_to)}` : ""}
            {report.ai_assisted ? " · incluye texto sugerido por IA y revisado" : ""}
          </p>
        </div>
      </div>
      {report.status === "draft" && !editable ? <Notice kind="info">Es un borrador de otra persona.</Notice> : null}
      {report.status === "shared" ? <Notice kind="info">Compartido con quienes tienen acceso al jugador. Ya no se edita: si hay que corregirlo, creá uno nuevo.</Notice> : null}
      {report.legacy ? <Notice kind="info">Informe del sistema anterior.</Notice> : null}

      <div style={{ display: "grid", gap: 14, marginTop: 10 }}>
        {sections.map((sec) => (
          <div key={sec}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <p className={lab.stepLabel} style={{ margin: "0 0 6px" }}>{labelOf(REPORT_SECTIONS, sec)}</p>
              {sec === "recommendations" && editable ? (
                <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} disabled={busy} onClick={suggest}>Sugerir con el Asistente IA</button>
              ) : null}
            </div>
            {editable ? (
              <textarea
                className={lab.textarea}
                rows={sec === "summary" || sec === "recommendations" ? 5 : 3}
                maxLength={8000}
                value={texts[sec] || ""}
                onChange={(e) => { setTexts((t) => ({ ...t, [sec]: e.target.value })); setDirty(true); }}
                aria-label={labelOf(REPORT_SECTIONS, sec)}
              />
            ) : (
              <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14.5 }}>{texts[sec] || "—"}</p>
            )}
          </div>
        ))}
      </div>
      {editable ? <p className={lab.subtle}>Los textos iniciales salen de los datos registrados en el período. Las recomendaciones automáticas son propuestas de Basket Lab: revisalas.</p> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {canEdit ? (
        <div className={lab.btnRow} style={{ marginTop: 12 }}>
          {editable ? <button type="button" className={cx(lab.btn, lab.btnPrimary)} disabled={busy || !dirty} onClick={() => save()}>Guardar borrador</button> : null}
          {editable ? <button type="button" className={cx(lab.btn)} disabled={busy} onClick={() => setConfirmShare(true)}>Compartir…</button> : null}
          {report.status === "archived" ? <button type="button" className={cx(lab.btn, lab.btnGhost)} disabled={busy} onClick={() => save({ status: "shared" })}>Reactivar</button> : null}
          {report.status !== "archived" && (report.status !== "draft" || editable) ? <button type="button" className={cx(lab.btn, lab.btnGhost)} disabled={busy} onClick={() => save({ status: "archived" })}>Archivar</button> : null}
        </div>
      ) : null}
      {confirmShare ? (
        <Dialog title="Compartir informe" onClose={() => setConfirmShare(false)}>
          <p style={{ marginTop: 0 }}>Lo van a ver todos los que tienen acceso a este jugador. Después de compartirlo ya no se puede editar.</p>
          {dirty ? <p className={lab.subtle}>Se guardan tus cambios antes de compartir.</p> : null}
          <div className={lab.btnRow}>
            <button type="button" className={cx(lab.btn, lab.btnPrimary)} disabled={busy} onClick={async () => { if (await save({ status: "shared" })) setConfirmShare(false); }}>Compartir</button>
            <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={() => setConfirmShare(false)}>Cancelar</button>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}
