"use client";

import { useMemo, useState } from "react";

const schema = [
  { group: "Dribbling", items: [{ key: "drib_control", label: "Control" }, { key: "drib_weak_hand", label: "Mano débil" }] },
  { group: "Tiro", items: [{ key: "shot_mechanics", label: "Mecánica" }, { key: "shot_consistency", label: "Consistencia" }] },
  { group: "Pase", items: [{ key: "pass_accuracy", label: "Precisión" }, { key: "pass_decisions", label: "Decisiones" }] },
  { group: "Finalización", items: [{ key: "finish_definition", label: "Definición" }, { key: "finish_both_hands", label: "Uso de ambas manos" }] }
];

function basePlayer() {
  const fundamentals = {};
  schema.forEach((g) => g.items.forEach((i) => (fundamentals[i.key] = 3)));
  return {
    id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: "",
    position: "",
    age: "",
    height: "",
    level: "",
    photo_url: "",
    fundamentals,
    stats: { ft_pct: "", fg_pct: "", three_pct: "", assists: "", turnovers: "", rebounds: "" },
    notes_history: [],
    goals: [],
    evolution: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export default function PlayersModule({ initialItems }) {
  const [players, setPlayers] = useState(Array.isArray(initialItems) ? initialItems : []);
  const [selectedId, setSelectedId] = useState(initialItems?.[0]?.id || null);
  const [tab, setTab] = useState("fundamentals");
  const selected = useMemo(() => players.find((p) => p.id === selectedId) || null, [players, selectedId]);

  async function persist(next) {
    setPlayers(next);
    await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: next })
    });
  }

  async function addPlayer() {
    const p = basePlayer();
    p.name = "Nuevo jugador";
    const next = [p, ...players];
    await persist(next);
    setSelectedId(p.id);
  }

  async function deletePlayer(id) {
    if (!confirm("¿Eliminar jugador?")) return;
    const next = players.filter((p) => p.id !== id);
    await persist(next);
    setSelectedId(next[0]?.id || null);
  }

  async function updateSelected(patch) {
    if (!selected) return;
    const next = players.map((p) => (p.id === selected.id ? { ...p, ...patch, updated_at: new Date().toISOString() } : p));
    await persist(next);
  }

  async function setRating(key, value) {
    if (!selected) return;
    const fundamentals = { ...(selected.fundamentals || {}), [key]: value };
    await updateSelected({
      fundamentals,
      evolution: [
        { id: `e_${Date.now()}`, text: `Actualización ${key}: ${value}/5`, created_at: new Date().toISOString() },
        ...(selected.evolution || [])
      ].slice(0, 120)
    });
  }

  async function addNote() {
    const value = prompt("Nueva nota del entrenador:");
    if (!value) return;
    await updateSelected({
      notes_history: [
        { id: `n_${Date.now()}`, text: value, created_at: new Date().toISOString() },
        ...(selected.notes_history || [])
      ].slice(0, 200),
      evolution: [
        { id: `e_${Date.now()}`, text: "Nueva nota agregada", created_at: new Date().toISOString() },
        ...(selected.evolution || [])
      ].slice(0, 120)
    });
  }

  async function addGoal() {
    const value = prompt("Nuevo objetivo:");
    if (!value) return;
    await updateSelected({
      goals: [
        { id: `g_${Date.now()}`, text: value, status: "pendiente", created_at: new Date().toISOString() },
        ...(selected.goals || [])
      ],
      evolution: [
        { id: `e_${Date.now()}`, text: `Objetivo creado: ${value}`, created_at: new Date().toISOString() },
        ...(selected.evolution || [])
      ].slice(0, 120)
    });
  }

  async function changeGoalStatus(goalId, status) {
    if (!selected) return;
    const goals = (selected.goals || []).map((g) => (g.id === goalId ? { ...g, status } : g));
    await updateSelected({ goals });
  }

  async function removeGoal(goalId) {
    if (!selected) return;
    const goals = (selected.goals || []).filter((g) => g.id !== goalId);
    await updateSelected({ goals });
  }

  return (
    <section className="players-view manual-section">
      <div className="players-header">
        <h1 style={{ marginTop: 0 }}>Seguimiento de Jugadores</h1>
        <p>Herramienta de evaluación y evolución individual para entrenadores.</p>
        <div className="players-actions">
          <button className="toolbar-button toolbar-button-accent" onClick={addPlayer} type="button">
            Agregar jugador
          </button>
        </div>
      </div>

      {!selected ? (
        <div className="player-tab-card">
          <p className="text-muted">No hay jugadores cargados todavía.</p>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 14 }}>
        <div className="players-grid" style={{ gridTemplateColumns: "1fr", alignContent: "start" }}>
          {players.map((p) => (
            <article
              key={p.id}
              className="player-card"
              style={{ borderColor: selectedId === p.id ? "rgba(255,139,43,.6)" : undefined }}
              onClick={() => setSelectedId(p.id)}
            >
              <div className="player-card-main">
                <h3>{p.name || "Sin nombre"}</h3>
                <p className="player-card-meta">{p.position || "Sin posición"} · {p.age || "—"} años</p>
                <p className="player-card-level">{p.level || "Nivel no definido"}</p>
              </div>
              <div style={{ marginTop: 8 }}>
                <button className="btn-borrar-small" onClick={(e) => { e.stopPropagation(); deletePlayer(p.id); }} type="button">
                  Borrar
                </button>
              </div>
            </article>
          ))}
        </div>

        {selected ? (
          <div>
            <div className="player-profile-header">
              <div className="player-profile-head-grid">
                <div>
                  {selected.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="player-profile-photo" src={selected.photo_url} alt={selected.name || "Jugador"} />
                  ) : (
                    <div className="player-profile-photo-placeholder">
                      {String(selected.name || "JU").split(" ").slice(0, 2).map((c) => c[0] || "").join("").toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="player-profile-main">
                  <input value={selected.name || ""} onChange={(e) => updateSelected({ name: e.target.value })} />
                  <div className="form-row form-row-inline" style={{ marginTop: 8 }}>
                    <div><input value={selected.position || ""} onChange={(e) => updateSelected({ position: e.target.value })} placeholder="Posición" /></div>
                    <div><input value={selected.age || ""} onChange={(e) => updateSelected({ age: e.target.value })} placeholder="Edad" /></div>
                    <div><input value={selected.height || ""} onChange={(e) => updateSelected({ height: e.target.value })} placeholder="Altura" /></div>
                  </div>
                  <div className="form-row form-row-inline" style={{ marginTop: 8 }}>
                    <div><input value={selected.level || ""} onChange={(e) => updateSelected({ level: e.target.value })} placeholder="Nivel" /></div>
                    <div><input value={selected.photo_url || ""} onChange={(e) => updateSelected({ photo_url: e.target.value })} placeholder="Foto URL opcional" /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="player-tabs">
              {[
                ["fundamentals", "Fundamentos"],
                ["stats", "Estadísticas"],
                ["notes", "Notas"],
                ["goals", "Objetivos"],
                ["evolution", "Evolución"]
              ].map(([id, label]) => (
                <button key={id} type="button" className={`player-tab-btn ${tab === id ? "is-active" : ""}`} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "fundamentals" ? (
              <div style={{ display: "grid", gap: 10 }}>
                {schema.map((group) => (
                  <section key={group.group} className="player-tab-card">
                    <h4>{group.group}</h4>
                    {group.items.map((item) => (
                      <div key={item.key} className="player-rate-row">
                        <span className="player-rate-label">{item.label}</span>
                        <div className="player-stars">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={`rating-star ${(selected.fundamentals?.[item.key] || 0) >= n ? "is-active" : ""}`}
                              onClick={() => setRating(item.key, n)}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            ) : null}

            {tab === "stats" ? (
              <div className="player-tab-card">
                <div className="form-row form-row-inline">
                  <div><label>% tiros libres</label><input value={selected.stats?.ft_pct || ""} onChange={(e) => updateSelected({ stats: { ...selected.stats, ft_pct: e.target.value } })} /></div>
                  <div><label>% tiros de campo</label><input value={selected.stats?.fg_pct || ""} onChange={(e) => updateSelected({ stats: { ...selected.stats, fg_pct: e.target.value } })} /></div>
                  <div><label>% triples</label><input value={selected.stats?.three_pct || ""} onChange={(e) => updateSelected({ stats: { ...selected.stats, three_pct: e.target.value } })} /></div>
                </div>
                <div className="form-row form-row-inline">
                  <div><label>Asistencias</label><input value={selected.stats?.assists || ""} onChange={(e) => updateSelected({ stats: { ...selected.stats, assists: e.target.value } })} /></div>
                  <div><label>Pérdidas</label><input value={selected.stats?.turnovers || ""} onChange={(e) => updateSelected({ stats: { ...selected.stats, turnovers: e.target.value } })} /></div>
                  <div><label>Rebotes</label><input value={selected.stats?.rebounds || ""} onChange={(e) => updateSelected({ stats: { ...selected.stats, rebounds: e.target.value } })} /></div>
                </div>
              </div>
            ) : null}

            {tab === "notes" ? (
              <div className="player-tab-card">
                <div className="form-actions">
                  <button type="button" className="toolbar-button toolbar-button-accent" onClick={addNote}>Agregar nota</button>
                </div>
                <div className="player-note-list">
                  {(selected.notes_history || []).map((n) => (
                    <article className="player-note-item" key={n.id}>
                      <p>{n.text}</p>
                      <span>{new Date(n.created_at).toLocaleString("es-AR")}</span>
                    </article>
                  ))}
                  {!selected.notes_history?.length ? <p className="text-muted">Sin notas.</p> : null}
                </div>
              </div>
            ) : null}

            {tab === "goals" ? (
              <div className="player-tab-card">
                <div className="form-actions">
                  <button type="button" className="toolbar-button toolbar-button-accent" onClick={addGoal}>Agregar objetivo</button>
                </div>
                <div className="player-goal-list">
                  {(selected.goals || []).map((g) => (
                    <article className="player-goal-item" key={g.id}>
                      <div className="player-goal-main">
                        <p>{g.text}</p>
                        <span>{new Date(g.created_at).toLocaleString("es-AR")}</span>
                      </div>
                      <div className="player-goal-actions">
                        <select value={g.status} onChange={(e) => changeGoalStatus(g.id, e.target.value)}>
                          <option value="pendiente">Pendiente</option>
                          <option value="en_progreso">En progreso</option>
                          <option value="completado">Completado</option>
                        </select>
                        <button type="button" className="btn-borrar-small" onClick={() => removeGoal(g.id)}>Borrar</button>
                      </div>
                    </article>
                  ))}
                  {!selected.goals?.length ? <p className="text-muted">Sin objetivos.</p> : null}
                </div>
              </div>
            ) : null}

            {tab === "evolution" ? (
              <div className="player-tab-card">
                {(selected.evolution || []).map((ev) => (
                  <article className="player-evolution-item" key={ev.id}>
                    <p>{ev.text}</p>
                    <span>{new Date(ev.created_at).toLocaleString("es-AR")}</span>
                  </article>
                ))}
                {!selected.evolution?.length ? <p className="text-muted">Sin cambios registrados.</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
