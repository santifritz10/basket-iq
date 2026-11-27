"use client";

import { useCallback, useEffect, useState } from "react";
import { BrandLogo } from "@/components/auth/BrandLogo";
import { Notice, cx } from "@/components/shooting-lab/parts";
import lab from "@/components/shooting-lab/lab.module.css";
import { devApi } from "./api";
import PlayerForm from "./PlayerForm";
import Profile from "./Profile";
import Roster from "./Roster";
import Compare from "./Compare";
import Attendance from "./Attendance";
import ReportPrint from "./ReportPrint";

function viewFromUrl() {
  if (typeof window === "undefined") return { name: "roster" };
  const q = new URLSearchParams(window.location.search);
  if (q.get("player")) return { name: "profile", id: q.get("player"), tab: q.get("tab") || "summary" };
  if (q.get("view") === "new") return { name: "new" };
  if (q.get("view") === "attendance") return { name: "attendance" };
  if (q.get("view") === "report" && q.get("id")) return { name: "report", id: q.get("id") };
  if (q.get("view") === "compare") return { name: "compare", ids: (q.get("ids") || "").split(",").filter(Boolean) };
  return { name: "roster" };
}

function urlFor(view) {
  const q = new URLSearchParams();
  if (view.name === "profile") {
    q.set("player", view.id);
    if (view.tab && view.tab !== "summary") q.set("tab", view.tab);
  } else if (view.name === "new") q.set("view", "new");
  else if (view.name === "attendance") q.set("view", "attendance");
  else if (view.name === "compare") {
    q.set("view", "compare");
    if (view.ids?.length) q.set("ids", view.ids.join(","));
  }
  const s = q.toString();
  return `/players${s ? `?${s}` : ""}`;
}

export default function PlayersApp() {
  const [roster, setRoster] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState({ name: "roster" });

  const load = useCallback(async () => {
    try {
      setRoster(await devApi.roster());
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    setView(viewFromUrl());
    load();
    const onPop = () => setView(viewFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [load]);

  const go = useCallback((next, { replace = false, scroll = true } = {}) => {
    setView(next);
    try {
      window.history[replace ? "replaceState" : "pushState"](null, "", urlFor(next));
    } catch {
      /* igual cambia la vista */
    }
    if (scroll) (document.getElementById("lab-scroll") || window).scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const relational = roster?.mode?.relational;

  return (
    <div className={lab.root}>
      <header className={lab.topbar}>
        <a href="/" className={lab.brandLink} aria-label="Volver a Basket Lab">
          <BrandLogo size={36} className={lab.brandLogo} />
          <span className={lab.brandText}>
            <span className={lab.brandTitle}>
              Jugadores <span>Lab</span>
            </span>
            <span className={lab.brandSub}>Basket Lab — By Coach Fritz</span>
          </span>
        </a>
        <nav className={lab.topNav} aria-label="Secciones">
          <button type="button" className={cx(lab.navBtn, view.name === "roster" && lab.navBtnActive)} onClick={() => go({ name: "roster" })}>
            Plantel
          </button>
          {relational ? (
            <button type="button" className={cx(lab.navBtn, view.name === "compare" && lab.navBtnActive)} onClick={() => go({ name: "compare", ids: [] })}>
              Comparar
            </button>
          ) : null}
          {relational && roster?.schema?.installed ? (
            <button type="button" className={cx(lab.navBtn, view.name === "attendance" && lab.navBtnActive)} onClick={() => go({ name: "attendance" })}>
              Asistencia
            </button>
          ) : null}
          <a className={lab.navBtn} href="/shooting">Shooting Lab</a>
          {relational ? (
            <button type="button" className={cx(lab.navBtn, view.name === "new" && lab.navBtnActive)} onClick={() => go({ name: "new" })}>
              + Jugador
            </button>
          ) : null}
        </nav>
      </header>
      <main className={lab.main}>
        {error && !roster ? (
          <Notice kind="error">
            <strong>No se pudo cargar el plantel.</strong> {error.message}{" "}
            <button type="button" className={cx(lab.btn, lab.btnSmall)} onClick={load}>Reintentar</button>
          </Notice>
        ) : null}
        {!roster && !error ? (
          <div className={lab.stack} aria-busy="true">
            <span className={lab.srOnly}>Cargando…</span>
            <div className={lab.skeleton} style={{ height: 34, width: "40%" }} />
            <div className={lab.skeleton} style={{ height: 160 }} />
            <div className={lab.skeleton} style={{ height: 160 }} />
          </div>
        ) : null}
        {roster && !relational ? (
          <Notice kind="warn">Esta pantalla necesita el modo de jugadores relacional.</Notice>
        ) : null}
        {roster && relational && !roster.schema?.installed ? (
          <Notice kind="warn">
            <strong>Falta instalar la base de evaluaciones y equipos.</strong> Corré <code>docs/sql/012-player-development.sql</code> en Supabase (no borra ni cambia datos). Mientras tanto podés ver el plantel, pero no cargar evaluaciones, estadísticas ni equipos.
          </Notice>
        ) : null}
        {roster && relational ? (
          <>
            {view.name === "roster" ? (
              <Roster roster={roster} onOpen={(id) => go({ name: "profile", id, tab: "summary" })} onNew={() => go({ name: "new" })} onReload={load} />
            ) : null}
            {view.name === "new" ? (
              <PlayerForm
                onCancel={() => go({ name: "roster" })}
                onSaved={async (player) => {
                  await load();
                  go({ name: "profile", id: player.id, tab: "summary" }, { replace: true });
                }}
              />
            ) : null}
            {view.name === "compare" ? (
              <Compare
                roster={roster}
                initialIds={view.ids || []}
                onIds={(ids) => {
                  try {
                    window.history.replaceState(null, "", urlFor({ name: "compare", ids }));
                  } catch {
                    /* sin URL igual funciona */
                  }
                }}
                onOpen={(id) => go({ name: "profile", id, tab: "summary" })}
              />
            ) : null}
            {view.name === "report" ? <ReportPrint id={view.id} /> : null}
            {view.name === "attendance" ? <Attendance roster={roster} onOpen={(id) => go({ name: "profile", id, tab: "training" })} /> : null}
            {view.name === "profile" ? (
              <Profile
                key={view.id}
                playerId={view.id}
                tab={view.tab}
                roster={roster}
                onTab={(tab) => go({ name: "profile", id: view.id, tab }, { replace: true, scroll: false })}
                onBack={() => go({ name: "roster" })}
                onChanged={load}
              />
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
