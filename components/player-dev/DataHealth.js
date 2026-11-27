"use client";

import { useEffect, useState } from "react";
import { Notice, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi } from "./api";
import { Dialog } from "./Fundamentals";
import s from "./dev.module.css";

const kb = (b) => (b >= 1048576 ? `${(b / 1048576).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/**
 * Mantenimiento de datos del sistema anterior: copia de imágenes a Storage (privado) y pendientes que
 * requieren decisión del entrenador. Nada se convierte ni se borra solo.
 */
export default function DataHealth({ onChanged }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const load = () => devApi.dataStatus().then(setData).catch(() => setData(null));
  useEffect(() => {
    load();
  }, []);
  if (!data) return null;
  const { media, legacy } = data;
  const nothing = !media.pending && !media.releasable && !legacy.fundamentalsToConfirm && !legacy.fundamentalsDefaultOnly && !legacy.textGoals && !legacy.groupLegacySessions;
  if (nothing) return null;

  async function act(action) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const { result } = await devApi.dataAction(action);
      setMsg(
        action === "migrate"
          ? `Se copiaron ${result.copied} imagen(es)${result.failed ? `, ${result.failed} fallaron` : ""}${result.skipped ? `, ${result.skipped} con formato no compatible quedan como están` : ""}. ${result.remaining ? `Quedan ${result.remaining}.` : ""}`
          : `Se liberaron ${result.released} imagen(es) vieja(s)${result.kept ? `; ${result.kept} no coincidieron y se conservaron` : ""}.`
      );
      await load();
      await onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setConfirmRelease(false);
    }
  }

  return (
    <section className={lab.card}>
      <div className={lab.cardHead}>
        <div>
          <h2 className={lab.cardTitle}>Datos del sistema anterior</h2>
          <p className={lab.cardHint}>Nada se convierte ni se borra solo: cada paso lo decidís vos.</p>
        </div>
      </div>
      <ul className={s.insightList}>
        {media.installed && media.pending ? (
          <li>
            {media.pending} foto(s) o escudo(s) guardados dentro del jugador ({kb(media.pendingBytes)}). Copiarlos a un espacio privado hace que el plantel cargue más rápido.
            <div className={lab.btnRow} style={{ marginTop: 6 }}>
              <button type="button" className={cx(lab.btn, lab.btnSmall)} disabled={busy} onClick={() => act("migrate")}>{busy ? "Copiando…" : "Copiar a Storage"}</button>
            </div>
          </li>
        ) : null}
        {!media.installed && media.players ? <li>Para pasar las fotos a un espacio privado falta correr <code>docs/sql/016-player-media-storage.sql</code>.</li> : null}
        {media.installed && media.releasable ? (
          <li>
            {media.releasable} imagen(es) ya copiadas y verificadas. Podés liberar la copia vieja para alivianar los datos.
            <div className={lab.btnRow} style={{ marginTop: 6 }}>
              <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} disabled={busy} onClick={() => setConfirmRelease(true)}>Liberar copias viejas…</button>
            </div>
          </li>
        ) : null}
        {legacy.fundamentalsToConfirm ? <li>{legacy.fundamentalsToConfirm} jugador(es) con fundamentos del sistema anterior sin confirmar (se confirman desde Fundamentos).</li> : null}
        {legacy.fundamentalsDefaultOnly ? <li>{legacy.fundamentalsDefaultOnly} jugador(es) solo tienen el valor por defecto (3) del sistema anterior: no cuentan como evaluación.</li> : null}
        {legacy.textGoals ? <li>{legacy.textGoals} objetivo(s) activos de solo texto: se pueden convertir en medibles desde Objetivos.</li> : null}
        {legacy.groupLegacySessions ? <li>{legacy.groupLegacySessions} sesión(es) de tiro históricas grupales: sus totales no se atribuyen a cada jugador.</li> : null}
      </ul>
      {msg ? <Notice kind="success">{msg}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {confirmRelease ? (
        <Dialog title="Liberar copias viejas" onClose={() => setConfirmRelease(false)}>
          <p style={{ marginTop: 0 }}>Antes de liberar cada imagen se vuelve a comparar, byte a byte, la copia en Storage con la original. Solo se libera si coinciden; si no, se conserva.</p>
          <div className={lab.btnRow}>
            <button type="button" className={cx(lab.btn, lab.btnPrimary)} disabled={busy} onClick={() => act("release")}>Liberar</button>
            <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={() => setConfirmRelease(false)}>Cancelar</button>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}
