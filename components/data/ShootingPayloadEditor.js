"use client";

import { useMemo, useState } from "react";

export default function ShootingPayloadEditor({ initialPayload, readOnly = false }) {
  const [raw, setRaw] = useState(() => JSON.stringify(initialPayload || {}, null, 2));
  const [status, setStatus] = useState("");
  const canParse = useMemo(() => {
    try {
      JSON.parse(raw);
      return true;
    } catch {
      return false;
    }
  }, [raw]);

  async function save() {
    if (readOnly) return;
    try {
      const payload = JSON.parse(raw);
      const res = await fetch("/api/shooting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No se pudo guardar");
      setStatus("Guardado correctamente.");
    } catch (error) {
      setStatus("Error: " + error.message);
    }
  }

  return (
    <section className="manual-section players-view">
      <h1 style={{ marginTop: 0 }}>Entrenamiento de tiro</h1>
      {readOnly ? (
        <p className="text-muted">
          Vista de solo lectura del payload agregado. Editá sesiones desde el módulo principal de Entrenamiento de tiro.
        </p>
      ) : (
        <p>Editor del payload de tiro por zonas (modo legacy).</p>
      )}
      <textarea
        rows={22}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        readOnly={readOnly}
        style={{ width: "100%", borderRadius: 12, padding: 12 }}
      />
      {!readOnly ? (
        <div className="form-actions">
          <button type="button" className="toolbar-button toolbar-button-accent" disabled={!canParse} onClick={save}>
            Guardar payload
          </button>
        </div>
      ) : null}
      {status ? <p>{status}</p> : null}
    </section>
  );
}
