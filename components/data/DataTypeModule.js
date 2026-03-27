"use client";

import { useState } from "react";

export default function DataTypeModule({ title, description, endpoint, initialItems, createItem }) {
  const [items, setItems] = useState(Array.isArray(initialItems) ? initialItems : []);

  async function persist(next) {
    setItems(next);
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: next })
    });
  }

  async function addItem() {
    const newItem = createItem();
    await persist([newItem, ...items]);
  }

  async function removeItem(id) {
    if (!confirm("¿Eliminar elemento?")) return;
    await persist(items.filter((it) => String(it.id) !== String(id)));
  }

  async function editItem(item) {
    const text = prompt("Editar JSON del elemento:", JSON.stringify(item, null, 2));
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      const next = items.map((it) => (String(it.id) === String(item.id) ? parsed : it));
      await persist(next);
    } catch {
      alert("JSON inválido.");
    }
  }

  return (
    <section className="manual-section players-view">
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <p>{description}</p>
      <div className="form-actions">
        <button className="toolbar-button toolbar-button-accent" onClick={addItem} type="button">
          Agregar
        </button>
      </div>
      <div className="players-grid" style={{ gridTemplateColumns: "1fr" }}>
        {items.map((item) => (
          <article key={item.id} className="player-tab-card">
            <p style={{ marginTop: 0 }}><strong>{item.nombre || item.name || "Elemento"}</strong></p>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(item, null, 2)}</pre>
            <div className="form-actions">
              <button type="button" className="toolbar-button" onClick={() => editItem(item)}>Editar JSON</button>
              <button type="button" className="btn-borrar" onClick={() => removeItem(item.id)}>Borrar</button>
            </div>
          </article>
        ))}
        {!items.length ? <p className="text-muted">Sin elementos cargados.</p> : null}
      </div>
    </section>
  );
}
