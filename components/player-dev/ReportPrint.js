"use client";

import { useEffect, useState } from "react";
import { REPORT_SECTIONS, REPORT_STATUS, REPORT_TYPES } from "@/lib/player-dev/insights";
import { labelOf } from "@/lib/player-dev/goals";
import { formatDate } from "@/components/shooting-lab/api";
import { Notice, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi } from "./api";
import s from "./dev.module.css";

/** Vista limpia para imprimir o guardar como PDF (diálogo de impresión del navegador). */
export default function ReportPrint({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    devApi.report(id).then(setData).catch((e) => setError(e.message));
  }, [id]);
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!data) return <div className={lab.skeleton} style={{ height: 300 }} />;
  const r = data.report;
  const sections = r.sections || Object.keys(r.texts || {});
  return (
    <div className={lab.stack}>
      <style>{"@media print{header,nav{display:none!important}html,body,#lab-scroll,main,div{background:#fff!important;overflow:visible!important;height:auto!important}}"}</style>
      <div className={cx(lab.btnRow, s.noPrint)}>
        <button type="button" className={cx(lab.btn, lab.btnPrimary)} onClick={() => window.print()}>Imprimir o guardar como PDF</button>
        {r.status === "draft" ? <span className={lab.subtle}>Es un borrador: todavía no está compartido.</span> : null}
      </div>
      <article className={s.print}>
        <h1>{r.title}</h1>
        <p className={s.printMeta}>
          {data.player?.display_name}
          {data.player?.category ? ` · ${data.player.category}` : ""}
          {r.report_type ? ` · ${labelOf(REPORT_TYPES, r.report_type)}` : ""}
          {r.period_from ? ` · ${formatDate(r.period_from)} – ${formatDate(r.period_to)}` : ""}
          {r.status === "draft" ? ` · ${labelOf(REPORT_STATUS, "draft")}` : ""}
        </p>
        {sections.map((sec) => (
          <section key={sec}>
            <h2>{labelOf(REPORT_SECTIONS, sec)}</h2>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{r.texts?.[sec] || "—"}</p>
          </section>
        ))}
        <p className={s.printFoot}>
          Basket Lab — Jugadores Lab. Datos registrados en la app para el período indicado{r.ai_assisted ? "; incluye texto sugerido por IA y revisado por el entrenador" : ""}. Las evaluaciones de fundamentos son subjetivas.
        </p>
      </article>
    </div>
  );
}
