"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/auth/BrandLogo";
import { DEFAULT_MIN_SAMPLE, DEFAULT_THRESHOLDS } from "@/lib/shooting/model";
import { labApi, safeStorage } from "./api";
import Dashboard from "./Dashboard";
import History from "./History";
import LiveSession from "./LiveSession";
import SessionForm from "./SessionForm";
import styles from "./lab.module.css";

const SETTINGS_KEY = "shootingLab.settings";

function readSettings() {
  const fallback = { thresholds: { ...DEFAULT_THRESHOLDS }, minSample: DEFAULT_MIN_SAMPLE };
  try {
    const raw = safeStorage()?.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const s = JSON.parse(raw);
    const low = Number(s?.thresholds?.low);
    const high = Number(s?.thresholds?.high);
    const minSample = Number(s?.minSample);
    if (!(low >= 0 && high <= 100 && low < high)) return fallback;
    return { thresholds: { low, high }, minSample: minSample >= 1 && minSample <= 500 ? Math.floor(minSample) : DEFAULT_MIN_SAMPLE };
  } catch {
    return fallback;
  }
}

function viewFromUrl() {
  if (typeof window === "undefined") return { name: "dashboard" };
  const q = new URLSearchParams(window.location.search);
  if (q.get("session")) return { name: "session", id: q.get("session") };
  if (q.get("view") === "history") return { name: "history" };
  if (q.get("view") === "new") return { name: "new" };
  return { name: "dashboard" };
}

function urlForView(view, playerId) {
  const q = new URLSearchParams();
  if (view.name === "session") q.set("session", view.id);
  else if (view.name === "history") q.set("view", "history");
  else if (view.name === "new") q.set("view", "new");
  if (playerId && view.name !== "session") q.set("player", playerId);
  const s = q.toString();
  return `/shooting${s ? `?${s}` : ""}`;
}

export default function ShootingLab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState({ name: "dashboard" });
  const [playerId, setPlayerId] = useState("");
  const [settings, setSettings] = useState({ thresholds: DEFAULT_THRESHOLDS, minSample: DEFAULT_MIN_SAMPLE });

  const load = useCallback(async () => {
    try {
      const d = await labApi.overview();
      setData(d);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    setSettings(readSettings());
    setView(viewFromUrl());
    setPlayerId(new URLSearchParams(window.location.search).get("player") || "");
    load();
    const onPop = () => setView(viewFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [load]);

  const go = useCallback(
    (next, { replace = false } = {}) => {
      setView(next);
      const url = urlForView(next, playerId);
      try {
        if (replace) window.history.replaceState(null, "", url);
        else window.history.pushState(null, "", url);
      } catch {
        /* sin historial: igual cambia la vista */
      }
      (document.getElementById("lab-scroll") || window).scrollTo({ top: 0, behavior: "smooth" });
    },
    [playerId]
  );

  const changePlayer = useCallback(
    (pid) => {
      setPlayerId(pid);
      try {
        window.history.replaceState(null, "", urlForView(view, pid));
      } catch {
        /* nada */
      }
    },
    [view]
  );

  const saveSettings = useCallback((next) => {
    setSettings(next);
    try {
      safeStorage()?.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* se usa solo en esta pestaña */
    }
  }, []);

  const [newPreset, setNewPreset] = useState(null);
  const startNew = useCallback(
    (preset = null) => {
      setNewPreset(preset);
      go({ name: "new" });
    },
    [go]
  );

  const playersById = useMemo(() => Object.fromEntries((data?.players || []).map((p) => [p.id, p])), [data]);
  const editablePlayers = useMemo(
    () => (data?.players || []).filter((p) => p.access_level === "editor" || p.access_level === "admin"),
    [data]
  );

  const blocked = data && (!data.mode?.relational || !data.schema?.installed);

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <a href="/" className={styles.brandLink} aria-label="Volver a Basket Lab">
          <BrandLogo size={36} className={styles.brandLogo} />
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>
              Shooting <span>Lab</span>
            </span>
            <span className={styles.brandSub}>Basket Lab — By Coach Fritz</span>
          </span>
        </a>
        <nav className={styles.topNav} aria-label="Secciones de Shooting Lab">
          <button type="button" className={`${styles.navBtn} ${view.name === "dashboard" ? styles.navBtnActive : ""}`} onClick={() => go({ name: "dashboard" })}>
            Panel
          </button>
          <button type="button" className={`${styles.navBtn} ${view.name === "history" ? styles.navBtnActive : ""}`} onClick={() => go({ name: "history" })}>
            Historial
          </button>
          {!blocked && editablePlayers.length ? (
            <button type="button" className={`${styles.navBtn} ${view.name === "new" ? styles.navBtnActive : ""}`} onClick={() => startNew()}>
              + Sesión
            </button>
          ) : null}
        </nav>
      </header>

      <main className={styles.main}>
        {error && !data ? (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            <strong>No se pudo cargar Shooting Lab.</strong> {error.message}{" "}
            <button type="button" className={`${styles.btn} ${styles.btnSmall}`} onClick={load}>
              Reintentar
            </button>
          </div>
        ) : null}

        {!data && !error ? <LoadingState /> : null}

        {data && !data.mode?.relational ? (
          <div className={`${styles.notice} ${styles.noticeWarn}`} role="status">
            <strong>Shooting Lab necesita el modo de jugadores relacional.</strong> Mientras tanto seguís teniendo el módulo de tiro anterior desde el menú principal.
          </div>
        ) : null}

        {data && data.mode?.relational && !data.schema?.installed ? (
          <div className={`${styles.notice} ${styles.noticeWarn}`} role="status">
            <strong>Falta instalar la base de Shooting Lab.</strong> Hay que correr <code>docs/sql/011-shooting-lab.sql</code> en Supabase (no borra ni modifica tus datos). Hasta entonces no se pueden crear sesiones nuevas.
          </div>
        ) : null}

        {data && !blocked && !data.players.length ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Todavía no tenés jugadores</p>
            <p className={styles.emptyText}>Creá o vinculá jugadores desde la sección Jugadores y volvé para registrar sus lanzamientos.</p>
            <a className={`${styles.btn} ${styles.btnPrimary}`} href="/">
              Ir a Basket Lab
            </a>
          </div>
        ) : null}

        {data && !blocked && data.players.length ? (
          <>
            {view.name === "dashboard" ? (
              <Dashboard
                data={data}
                playersById={playersById}
                playerId={playerId}
                onPlayerChange={changePlayer}
                settings={settings}
                onSettings={saveSettings}
                canCreate={editablePlayers.length > 0}
                onOpenSession={(id) => go({ name: "session", id })}
                onNewSession={startNew}
                onHistory={() => go({ name: "history" })}
              />
            ) : null}
            {view.name === "history" ? (
              <History data={data} playersById={playersById} settings={settings} onOpenSession={(id) => go({ name: "session", id })} />
            ) : null}
            {view.name === "new" ? (
              <SessionForm
                players={editablePlayers}
                preset={newPreset || (playerId ? { player_ids: [playerId] } : null)}
                onCancel={() => go({ name: "dashboard" })}
                onCreated={async (session) => {
                  await load();
                  go({ name: "session", id: session.id }, { replace: true });
                }}
              />
            ) : null}
            {view.name === "session" ? (
              <LiveSession
                key={view.id}
                sessionId={view.id}
                playersById={playersById}
                allPlayers={data.players}
                settings={settings}
                onBack={() => go({ name: "history" })}
                onChanged={load}
                onOpenSession={(id) => go({ name: "session", id })}
                onDeleted={async () => {
                  await load();
                  go({ name: "history" }, { replace: true });
                }}
              />
            ) : null}
          </>
        ) : null}

      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className={styles.stack} aria-busy="true" aria-live="polite">
      <span className={styles.srOnly}>Cargando Shooting Lab…</span>
      <div className={styles.skeleton} style={{ height: 34, width: "40%" }} />
      <div className={styles.skeleton} style={{ height: 88 }} />
      <div className={styles.skeleton} style={{ height: 320 }} />
    </div>
  );
}
