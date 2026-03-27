"use client";

import { useMemo, useState } from "react";

export default function ShootingPayloadEditor({ initialPayload }) {
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
      <p>Editor seguro del payload de tiro por zonas (vía `/api/shooting`).</p>
      <textarea
        rows={22}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        style={{ width: "100%", borderRadius: 12, padding: 12 }}
      />
      <div className="form-actions">
        <button type="button" className="toolbar-button toolbar-button-accent" disabled={!canParse} onClick={save}>
          Guardar payload
        </button>
      </div>
      {status ? <p>{status}</p> : null}
    </section>
  );
}
