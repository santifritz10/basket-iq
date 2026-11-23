"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { syncAuthCookiesFromBrowserSession } from "@/lib/client/sync-auth-cookies";
import { renderMarkdown } from "@/components/assistant/renderMarkdown";
import styles from "@/components/assistant/assistant.module.css";

const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CHARS = 20000;

const SUGGESTIONS = [
  { mode: "planificador", text: "Necesito organizar un entrenamiento de 90 minutos para U15 enfocado en transición ofensiva." },
  { mode: "debate", text: "¿Qué ventajas y desventajas tiene defender el pick and roll con cambios?" },
  { mode: "tecnico", text: "Hoy me faltan el base y el pívot. ¿Cómo puedo adaptar un entrenamiento de bloqueo directo?" },
  { mode: "tecnico", text: "¿Cómo puedo mejorar la toma de decisiones de mis jugadores U13?" },
  { mode: "debate", text: "Quiero implementar una defensa zonal 2-3 con mi equipo. ¿Qué opinás?" }
];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Arma el historial que se envía: los últimos mensajes, dentro de los límites. */
function buildHistory(messages) {
  let history = messages
    .filter((m) => m.role === "user" || m.role === "model")
    .map((m) => ({ role: m.role, text: m.text }))
    .slice(-MAX_HISTORY_MESSAGES);
  let total = history.reduce((sum, m) => sum + m.text.length, 0);
  while (history.length > 1 && total > MAX_HISTORY_CHARS) {
    total -= history[0].text.length;
    history = history.slice(1);
  }
  while (history.length > 1 && history[0].role !== "user") history = history.slice(1);
  return history;
}

function BallIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="14" fill="currentColor" opacity="0.18" />
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M2 16h28M16 2v28" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 6.5c4 3.5 4 15.5 0 19M25.5 6.5c-4 3.5-4 15.5 0 19" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function AssistantChat({ modes, supabaseUrl, supabaseAnonKey }) {
  const [mode, setMode] = useState(modes[0].id);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState({ configured: null, model: "" });
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const syncSession = useCallback(async () => {
    if (!supabaseUrl || !supabaseAnonKey) return false;
    try {
      return await syncAuthCookiesFromBrowserSession({ url: supabaseUrl, anonKey: supabaseAnonKey });
    } catch {
      return false;
    }
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncSession();
      try {
        const res = await fetch("/api/assistant", { credentials: "same-origin" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data.ok) setStatus({ configured: data.configured, model: data.model });
      } catch {
        /* el estado es informativo: si falla, el chat igual funciona */
      }
    })();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [syncSession]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading, error]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const requestReply = useCallback(
    async (conversation) => {
      setLoading(true);
      setError(null);
      const controller = new AbortController();
      abortRef.current = controller;
      const payload = JSON.stringify({ mode, messages: buildHistory(conversation) });
      const send = () =>
        fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: payload,
          signal: controller.signal
        });
      try {
        let res = await send();
        if (res.status === 401 && (await syncSession())) res = await send();
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          setError(data.error || "No se pudo obtener respuesta. Probá de nuevo.");
          return;
        }
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "model", text: data.reply, truncated: Boolean(data.truncated), mode: data.mode }
        ]);
        if (data.model) setStatus((s) => ({ ...s, configured: true, model: data.model }));
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError("No se pudo conectar con el servidor. Revisá tu conexión y volvé a intentar.");
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [mode, syncSession]
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || loading) return;
    if (text.length > MAX_MESSAGE_CHARS) {
      setError(`Cada mensaje puede tener hasta ${MAX_MESSAGE_CHARS} caracteres.`);
      return;
    }
    const next = [...messages, { id: newId(), role: "user", text, mode }];
    setMessages(next);
    setInput("");
    requestReply(next);
  }, [input, loading, messages, mode, requestReply]);

  const handleRetry = useCallback(() => {
    if (loading || !messages.length) return;
    if (messages[messages.length - 1].role !== "user") return;
    requestReply(messages);
  }, [loading, messages, requestReply]);

  const handleNewConversation = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setLoading(false);
    setInput("");
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey && !ev.nativeEvent.isComposing) {
      ev.preventDefault();
      handleSend();
    }
  };

  const applySuggestion = (s) => {
    setMode(s.mode);
    setInput(s.text);
    inputRef.current?.focus();
  };

  const activeMode = modes.find((m) => m.id === mode) || modes[0];
  const canRetry = !loading && error && messages.length > 0 && messages[messages.length - 1].role === "user";
  const remaining = MAX_MESSAGE_CHARS - input.length;

  return (
    <section className={styles.shell} aria-label="Asistente IA">
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            <BallIcon />
          </span>
          <div>
            <h1 className={styles.title}>Asistente IA</h1>
            <p className={styles.subtitle}>
              Tu ayudante técnico de básquet
              {status.model ? <span className={styles.modelTag}>Gemini · {status.model}</span> : null}
            </p>
          </div>
        </div>
        <button type="button" className={styles.ghostButton} onClick={handleNewConversation} disabled={!messages.length && !error}>
          Nueva conversación
        </button>
      </header>

      <div className={styles.modes} role="radiogroup" aria-label="Modo de conversación">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={m.id === mode}
            className={`${styles.modeButton} ${m.id === mode ? styles.modeActive : ""}`}
            onClick={() => setMode(m.id)}
          >
            <span className={styles.modeLabel}>{m.label}</span>
            <span className={styles.modeDesc}>{m.description}</span>
          </button>
        ))}
      </div>

      {status.configured === false ? (
        <div className={styles.configWarning} role="status">
          El asistente todavía no está configurado en este servidor: falta la variable <code>GEMINI_API_KEY</code>.
        </div>
      ) : null}

      <div className={styles.conversation} ref={scrollRef} aria-live="polite">
        {!messages.length ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <BallIcon size={44} />
            </span>
            <p className={styles.emptyTitle}>¿En qué te ayudo hoy, coach?</p>
            <p className={styles.emptyText}>
              Contame la categoría, el nivel y el objetivo, y armamos la respuesta a la medida de tu equipo. Probá con alguna de estas:
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button key={s.text} type="button" className={styles.suggestion} onClick={() => applySuggestion(s)}>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`${styles.row} ${m.role === "user" ? styles.rowUser : styles.rowModel}`}>
              {m.role === "model" ? (
                <span className={styles.avatar} aria-hidden="true">
                  <BallIcon size={18} />
                </span>
              ) : null}
              <div className={`${styles.bubble} ${m.role === "user" ? styles.bubbleUser : styles.bubbleModel}`}>
                <span className={styles.author}>{m.role === "user" ? "Vos" : "BasketIQ"}</span>
                {m.role === "user" ? <p className={styles.userText}>{m.text}</p> : <div className={styles.markdown}>{renderMarkdown(m.text)}</div>}
                {m.truncated ? <p className={styles.truncated}>La respuesta se cortó por largo. Pedile que continúe.</p> : null}
              </div>
            </div>
          ))
        )}

        {loading ? (
          <div className={`${styles.row} ${styles.rowModel}`}>
            <span className={styles.avatar} aria-hidden="true">
              <BallIcon size={18} />
            </span>
            <div className={`${styles.bubble} ${styles.bubbleModel} ${styles.typing}`} role="status">
              <span className={styles.dots} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              Gemini está generando una respuesta…
            </div>
          </div>
        ) : null}

        {error ? (
          <div className={styles.error} role="alert">
            <span>{error}</span>
            {canRetry ? (
              <button type="button" className={styles.ghostButton} onClick={handleRetry}>
                Reintentar
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <form
        className={styles.composer}
        onSubmit={(ev) => {
          ev.preventDefault();
          handleSend();
        }}
      >
        <textarea
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(ev) => setInput(ev.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Escribí tu consulta (${activeMode.label.toLowerCase()})…`}
          rows={1}
          maxLength={MAX_MESSAGE_CHARS}
          aria-label="Consulta para el asistente"
          disabled={loading}
        />
        <button type="submit" className={styles.sendButton} disabled={loading || !input.trim()} aria-label="Enviar consulta">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" fill="currentColor" />
          </svg>
          <span>Enviar</span>
        </button>
      </form>
      <p className={styles.footnote}>
        {remaining < 500 ? `${remaining} caracteres disponibles · ` : ""}
        El asistente solo conoce lo que escribís en esta conversación y no la guarda. Evitá incluir datos personales sensibles de jugadores.
      </p>
    </section>
  );
}
