"use client";

import { useState } from "react";
import { Notice, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi, resizeImage } from "./api";
import { Avatar } from "./Roster";
import s from "./dev.module.css";

const FIELDS = [
  ["display_name", "Nombre y apellido", "text"],
  ["age", "Edad", "number"],
  ["height", "Altura", "text"],
  ["position", "Posición", "text"],
  ["team", "Equipo (texto)", "text"],
  ["category", "Categoría", "text"],
  ["level", "Nivel", "text"]
];

/** Alta y edición de los datos del jugador (usa la API existente de jugadores). */
export default function PlayerForm({ player = null, onCancel, onSaved }) {
  const [form, setForm] = useState(() => {
    const o = {};
    FIELDS.forEach(([k]) => (o[k] = player?.[k] ?? ""));
    o.photo_url = player?.photo_url || "";
    o.club_shield_url = player?.club_shield_url || "";
    return o;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [changed, setChanged] = useState({}); // imágenes elegidas o quitadas en este formulario

  async function pick(field, file, size) {
    try {
      const url = await resizeImage(file, size);
      setForm((f) => ({ ...f, [field]: url }));
      setChanged((c) => ({ ...c, [field]: true }));
    } catch (e) {
      setError(e.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!String(form.display_name).trim()) {
      setError("Escribí el nombre del jugador.");
      return;
    }
    const age = form.age === "" ? null : Number(form.age);
    if (age != null && (!Number.isInteger(age) || age < 3 || age > 80)) {
      setError("La edad tiene que ser un número entero.");
      return;
    }
    setBusy(true);
    setError(null);
    // Las imágenes no viajan con los datos: se guardan aparte en Storage (privado).
    const body = { ...form, age };
    delete body.photo_url;
    delete body.club_shield_url;
    try {
      const res = player ? await devApi.updatePlayer(player.id, body) : await devApi.createPlayer({ ...body, relationship_type: "coach", access_level: "admin" });
      const id = res.player?.id || player?.id;
      for (const [field, kind] of [["photo_url", "photo"], ["club_shield_url", "shield"]]) {
        if (!changed[field] || !id) continue;
        const value = form[field] || null;
        try {
          await devApi.uploadMedia(id, value ? { kind, data_url: value } : { kind, remove: true });
        } catch (err) {
          // Sin la migración 016 se guarda como antes (dentro del jugador).
          if (err.code === "media_not_installed") await devApi.updatePlayer(id, { [field]: value });
          else throw err;
        }
      }
      await onSaved(res.player);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      {!player ? (
        <div className={lab.pageHead}>
          <div>
            <h1 className={lab.h1}>Nuevo jugador</h1>
            <p className={lab.lede}>Vos quedás como administrador del perfil. Las evaluaciones se cargan después, desde Fundamentos.</p>
          </div>
        </div>
      ) : null}
      <form className={lab.card} style={{ maxWidth: 760 }} onSubmit={submit}>
        <div className={lab.formGrid}>
          {FIELDS.map(([k, label, type]) => (
            <label key={k} className={lab.field}>
              <span className={lab.label}>{label}</span>
              <input
                className={lab.input}
                type={type}
                inputMode={type === "number" ? "numeric" : undefined}
                value={form[k]}
                maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                required={k === "display_name"}
              />
            </label>
          ))}
        </div>
        <div className={lab.divider} style={{ margin: "14px 0" }} />
        <div className={lab.formGrid}>
          <div className={s.photoPick}>
            <Avatar player={{ display_name: form.display_name, photo_url: form.photo_url }} large />
            <div>
              <span className={lab.label}>Foto</span>
              <input type="file" accept="image/*" onChange={(e) => pick("photo_url", e.target.files?.[0], 320)} />
              {form.photo_url ? (
                <button type="button" className={cx(lab.btn, lab.btnGhost, lab.btnSmall)} onClick={() => { setForm((f) => ({ ...f, photo_url: "" })); setChanged((c) => ({ ...c, photo_url: true })); }}>Quitar</button>
              ) : null}
            </div>
          </div>
          <div className={s.photoPick}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {form.club_shield_url ? <img src={form.club_shield_url} alt="" className={s.shield} style={{ width: 56, height: 56 }} /> : null}
            <div>
              <span className={lab.label}>Escudo</span>
              <input type="file" accept="image/*" onChange={(e) => pick("club_shield_url", e.target.files?.[0], 160)} />
            </div>
          </div>
        </div>
        <p className={lab.subtle}>Las imágenes se achican antes de guardarse y se guardan en un espacio privado: solo las ven quienes tienen acceso al jugador.</p>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <div className={lab.btnRow} style={{ marginTop: 12 }}>
          <button type="submit" className={cx(lab.btn, lab.btnPrimary)} disabled={busy}>{busy ? "Guardando…" : player ? "Guardar cambios" : "Crear jugador"}</button>
          <button type="button" className={cx(lab.btn, lab.btnGhost)} onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </>
  );
}
