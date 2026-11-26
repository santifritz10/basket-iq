"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { syncAuthCookiesFromBrowserSession } from "@/lib/client/sync-auth-cookies";
import { renderMarkdown } from "@/components/assistant/renderMarkdown";
import {
  DEFAULT_CONVERSATION_TITLE,
  buildGeminiHistory,
  groupConversationsByActivity
} from "@/lib/assistant/conversation-utils";
import styles from "@/components/assistant/workspace.module.css";

const MAX_MESSAGE_CHARS = 4000;
const SETTINGS_KEY = "basketiq.assistant.settings.v1";
const MOBILE_QUERY = "(max-width: 900px)";

const SUGGESTIONS = [
  { mode: "planificador", title: "Planificar una sesión", text: "Necesito organizar un entrenamiento de 90 minutos para U15 enfocado en transición ofensiva." },
  { mode: "debate", title: "Debatir una defensa", text: "¿Qué ventajas y desventajas tiene defender el pick and roll con cambios?" },
  { mode: "tecnico", title: "Adaptar a imprevistos", text: "Hoy me faltan el base y el pívot. ¿Cómo puedo adaptar un entrenamiento de bloqueo directo?" },
  { mode: "tecnico", title: "Formar decisiones", text: "¿Cómo puedo mejorar la toma de decisiones de mis jugadores U13?" }
];

/* ---------------------------------------------------------------- iconos */

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false" };
  switch (name) {
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "edit":
      return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case "folder":
      return <svg {...common}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
    case "sidebar":
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "dots":
      return <svg {...common}><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></svg>;
    case "trash":
      return <svg {...common}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>;
    case "copy":
      return <svg {...common}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 5 5L20 7" /></svg>;
    case "refresh":
      return <svg {...common}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>;
    case "paperclip":
      return <svg {...common}><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" /></svg>;
    case "send":
      return <svg {...common}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
    case "stop":
      return <svg {...common}><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" /></svg>;
    case "chevron":
      return <svg {...common}><path d="m6 9 6 6 6-6" /></svg>;
    case "arrowDown":
      return <svg {...common}><path d="M12 5v14M5 12l7 7 7-7" /></svg>;
    case "back":
      return <svg {...common}><path d="M15 18l-6-6 6-6" /></svg>;
    case "close":
      return <svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    default:
      return null;
  }
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

/* ---------------------------------------------------------------- helpers */

function tempId() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSettings(value) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
  } catch {
    /* preferencia local opcional */
  }
}

function readConversationIdFromUrl() {
  try {
    return new URL(window.location.href).searchParams.get("c");
  } catch {
    return null;
  }
}

function writeConversationIdToUrl(id, { replace = false } = {}) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("c", id);
  else url.searchParams.delete("c");
  if (url.toString() === window.location.href) return;
  window.history[replace ? "replaceState" : "pushState"]({ c: id || null }, "", url);
}

function upsertConversation(list, conversation) {
  if (!conversation?.id) return list;
  const rest = list.filter((c) => c.id !== conversation.id);
  return [conversation, ...rest].sort((a, b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)));
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

/* ---------------------------------------------------------------- componente */

export default function AssistantWorkspace({ modes, supabaseUrl, supabaseAnonKey }) {
  const isMobile = useIsMobile();
  const [settings, setSettings] = useState({ defaultMode: modes[0].id, sidebarCollapsed: false });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // "unknown" mientras carga, "on" con historial en la base, "off" si falta la migración.
  const [persistence, setPersistence] = useState("unknown");
  const [authExpired, setAuthExpired] = useState(false);
  const [status, setStatus] = useState({ configured: null, model: "" });

  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [academyLabel, setAcademyLabel] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [mode, setMode] = useState(modes[0].id);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(null); // "send" | "regenerate" | "retry"
  const [error, setError] = useState(null); // { text, canRetry }

  const [menuFor, setMenuFor] = useState(null);
  const [renaming, setRenaming] = useState(null); // { id, value }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const viewTokenRef = useRef(0);
  const stickToBottomRef = useRef(true);

  const activeConversation = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId]);
  const activeMode = modes.find((m) => m.id === mode) || modes[0];

  /* ------------------------------------------------------------ red */

  const syncSession = useCallback(async () => {
    if (!supabaseUrl || !supabaseAnonKey) return false;
    try {
      return await syncAuthCookiesFromBrowserSession({ url: supabaseUrl, anonKey: supabaseAnonKey });
    } catch {
      return false;
    }
  }, [supabaseUrl, supabaseAnonKey]);

  /** fetch JSON con un reintento si la cookie de sesión venció. */
  const api = useCallback(
    async (url, { method = "GET", body, signal } = {}) => {
      const send = () =>
        fetch(url, {
          method,
          credentials: "same-origin",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
          signal
        });
      let res = await send();
      if (res.status === 401 && (await syncSession())) res = await send();
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) setAuthExpired(true);
      return { res, data };
    },
    [syncSession]
  );

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    try {
      const { res, data } = await api("/api/assistant/conversations");
      if (res.ok && data.ok) {
        setConversations(data.conversations || []);
        setPersistence("on");
        return "on";
      }
      if (data.code === "storage_not_ready") {
        setPersistence("off");
        return "off";
      }
      return "error";
    } catch {
      return "error";
    } finally {
      setListLoading(false);
    }
  }, [api]);

  const openConversation = useCallback(
    async (id, { pushUrl = true } = {}) => {
      abortRef.current?.abort();
      viewTokenRef.current += 1;
      const token = viewTokenRef.current;
      setMenuFor(null);
      setError(null);
      setPending(null);
      if (isMobile) setDrawerOpen(false);
      if (pushUrl) writeConversationIdToUrl(id);
      if (!id) {
        setActiveId(null);
        setMessages([]);
        setMode(readSettings().defaultMode || modes[0].id);
        setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }
      setActiveId(id);
      setMessages([]);
      setAcademyLabel(null);
      setLoadingConversation(true);
      try {
        const { res, data } = await api(`/api/assistant/conversations/${id}`);
        if (token !== viewTokenRef.current) return;
        if (res.ok && data.ok) {
          setMessages(data.messages || []);
          setAcademyLabel(data.conversation?.academyLabel || null);
          setMode(data.conversation?.mode || modes[0].id);
          setConversations((list) => (list.some((c) => c.id === id) ? list : upsertConversation(list, data.conversation)));
          stickToBottomRef.current = true;
          const last = data.messages?.[data.messages.length - 1];
          if (last?.role === "user") setError({ text: "Esta consulta quedó sin respuesta.", canRetry: true });
        } else if (res.status === 404) {
          setActiveId(null);
          writeConversationIdToUrl(null, { replace: true });
          setError({ text: "Esa conversación no existe o fue eliminada.", canRetry: false });
        } else {
          setError({ text: data.error || "No se pudo abrir la conversación.", canRetry: false });
        }
      } catch {
        if (token === viewTokenRef.current) setError({ text: "No se pudo conectar con el servidor.", canRetry: false });
      } finally {
        if (token === viewTokenRef.current) setLoadingConversation(false);
      }
    },
    [api, isMobile, modes]
  );

  /* ------------------------------------------------------------ arranque */

  useEffect(() => {
    const stored = readSettings();
    const next = { defaultMode: stored.defaultMode || modes[0].id, sidebarCollapsed: Boolean(stored.sidebarCollapsed) };
    setSettings(next);
    setSidebarCollapsed(next.sidebarCollapsed);
    setMode(next.defaultMode);

    let cancelled = false;
    (async () => {
      await syncSession();
      api("/api/assistant")
        .then(({ res, data }) => {
          if (!cancelled && res.ok && data.ok) setStatus({ configured: data.configured, model: data.model });
        })
        .catch(() => {});
      const state = await loadConversations();
      if (cancelled) return;
      const fromUrl = readConversationIdFromUrl();
      if (state === "on" && fromUrl) openConversation(fromUrl, { pushUrl: false });
    })();

    const onPop = () => {
      const id = readConversationIdFromUrl();
      openConversation(id, { pushUrl: false });
    };
    window.addEventListener("popstate", onPop);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", onPop);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------ búsqueda */

  useEffect(() => {
    const q = search.trim();
    if (!q || persistence !== "on") {
      setSearchResults(null);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { res, data } = await api(`/api/assistant/conversations?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok && data.ok) setSearchResults(data.conversations || []);
      } catch {
        /* se mantiene el filtro local */
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, persistence, api]);

  const visibleConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    const local = conversations.filter((c) => c.title.toLowerCase().includes(q));
    if (!searchResults) return local;
    const ids = new Set(local.map((c) => c.id));
    return [...local, ...searchResults.filter((c) => !ids.has(c.id))];
  }, [conversations, search, searchResults]);

  const groups = useMemo(() => groupConversationsByActivity(visibleConversations), [visibleConversations]);

  /* ------------------------------------------------------------ scroll y textarea */

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, pending, error]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 120;
    setShowJump(distance > 240);
  };

  const jumpToBottom = () => {
    stickToBottomRef.current = true;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  const resizeInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 32), 220)}px`;
  }, []);

  useEffect(() => {
    resizeInput();
  }, [input, resizeInput]);

  // El ancho del campo cambia al contraer la barra lateral o pasar a celular.
  useEffect(() => {
    const el = inputRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        resizeInput();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [resizeInput]);

  useEffect(() => {
    if (!menuFor && !modeMenuOpen) return undefined;
    const close = (ev) => {
      if (ev.target.closest?.("[data-menu-root]")) return;
      setMenuFor(null);
      setModeMenuOpen(false);
    };
    const onKey = (ev) => {
      if (ev.key === "Escape") {
        setMenuFor(null);
        setModeMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuFor, modeMenuOpen]);

  /* ------------------------------------------------------------ chat */

  const runPersistent = useCallback(
    async ({ action, text }) => {
      const token = viewTokenRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      const optimisticId = action === "send" ? tempId() : null;
      if (optimisticId) {
        setMessages((prev) => [...prev, { id: optimisticId, role: "user", text, mode, pendingSave: true }]);
      }
      stickToBottomRef.current = true;
      setPending(action);
      setError(null);
      try {
        const { res, data } = await api("/api/assistant/chat", {
          method: "POST",
          body: { conversationId: activeId, mode, action, text },
          signal: controller.signal
        });
        if (data.conversation) setConversations((list) => upsertConversation(list, data.conversation));
        if (token !== viewTokenRef.current) return;
        if (data.conversation && !activeId) {
          setActiveId(data.conversation.id);
          writeConversationIdToUrl(data.conversation.id, { replace: true });
        }
        setMessages((prev) => {
          let next = prev;
          if (optimisticId) {
            next = data.userMessage
              ? next.map((m) => (m.id === optimisticId ? data.userMessage : m))
              : next.filter((m) => m.id !== optimisticId);
          }
          if (res.ok && data.ok) {
            if (data.replacedMessageId) next = next.filter((m) => m.id !== data.replacedMessageId);
            if (!next.some((m) => m.id === data.message.id)) next = [...next, data.message];
          }
          return next;
        });
        if (res.ok && data.ok) {
          if (data.model) setStatus((s) => ({ ...s, configured: true, model: data.model }));
          return;
        }
        if (optimisticId && !data.userMessage) setInput((current) => current || text);
        const saved = Boolean(data.userMessage) || action !== "send";
        setError({ text: data.error || "No se pudo obtener respuesta. Probá de nuevo.", canRetry: saved && res.status !== 404 });
      } catch (err) {
        if (err?.name === "AbortError") return;
        if (token !== viewTokenRef.current) return;
        if (optimisticId) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
          setInput((current) => current || text);
        }
        setError({ text: "No se pudo conectar con el servidor. Revisá tu conexión y volvé a intentar.", canRetry: false });
      } finally {
        if (token === viewTokenRef.current) setPending(null);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [activeId, api, mode]
  );

  /** Sin migración: chat sin guardar, igual que la versión anterior. */
  const runEphemeral = useCallback(
    async ({ action, text }) => {
      const token = viewTokenRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      let conversation = messages;
      if (action === "send") conversation = [...messages, { id: tempId(), role: "user", text, mode }];
      if (action === "regenerate" && conversation[conversation.length - 1]?.role === "model") conversation = conversation.slice(0, -1);
      setMessages(conversation);
      stickToBottomRef.current = true;
      setPending(action);
      setError(null);
      try {
        const history = buildGeminiHistory(
          conversation.map((m) => ({ role: m.role, text: String(m.text).slice(0, MAX_MESSAGE_CHARS) })),
          { maxMessages: 20, maxChars: 20000 }
        );
        const { res, data } = await api("/api/assistant", { method: "POST", body: { mode, messages: history }, signal: controller.signal });
        if (token !== viewTokenRef.current) return;
        if (!res.ok || !data.ok) {
          setError({ text: data.error || "No se pudo obtener respuesta. Probá de nuevo.", canRetry: true });
          return;
        }
        setMessages((prev) => [...prev, { id: tempId(), role: "model", text: data.reply, truncated: Boolean(data.truncated), mode: data.mode }]);
        if (data.model) setStatus((s) => ({ ...s, configured: true, model: data.model }));
      } catch (err) {
        if (err?.name === "AbortError") return;
        if (token === viewTokenRef.current) setError({ text: "No se pudo conectar con el servidor. Revisá tu conexión y volvé a intentar.", canRetry: true });
      } finally {
        if (token === viewTokenRef.current) setPending(null);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [api, messages, mode]
  );

  const run = persistence === "off" ? runEphemeral : runPersistent;

  const handleSend = () => {
    const text = input.trim();
    if (!text || pending || persistence === "unknown") return;
    if (text.length > MAX_MESSAGE_CHARS) {
      setError({ text: `Cada mensaje puede tener hasta ${MAX_MESSAGE_CHARS} caracteres.`, canRetry: false });
      return;
    }
    setInput("");
    run({ action: "send", text });
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(null);
    setError({ text: "Cancelaste la respuesta.", canRetry: true });
  };

  const handleRetry = () => {
    if (pending) return;
    run({ action: "retry" });
  };

  const handleRegenerate = () => {
    if (pending) return;
    run({ action: "regenerate" });
  };

  const handleCopy = async (message) => {
    try {
      await navigator.clipboard.writeText(message.text);
    } catch {
      const area = document.createElement("textarea");
      area.value = message.text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopiedId(message.id);
    setTimeout(() => setCopiedId((id) => (id === message.id ? null : id)), 1600);
  };

  const handleKeyDown = (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey && !ev.nativeEvent.isComposing && !isMobile) {
      ev.preventDefault();
      handleSend();
    }
  };

  /* ------------------------------------------------------------ gestión de conversaciones */

  const submitRename = async () => {
    if (!renaming) return;
    const { id, value } = renaming;
    const title = value.replace(/\s+/g, " ").trim();
    setRenaming(null);
    const current = conversations.find((c) => c.id === id);
    if (!title || !current || title === current.title) return;
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, title, titleSource: "user" } : c)));
    const { res, data } = await api(`/api/assistant/conversations/${id}`, { method: "PATCH", body: { title } }).catch(() => ({ res: { ok: false }, data: {} }));
    if (res.ok && data.ok) {
      setConversations((list) => list.map((c) => (c.id === id ? data.conversation : c)));
    } else {
      setConversations((list) => list.map((c) => (c.id === id ? current : c)));
      setError({ text: data.error || "No se pudo renombrar la conversación.", canRetry: false });
    }
  };

  const doDelete = async () => {
    const target = confirmDelete;
    setConfirmDelete(null);
    if (!target) return;
    const { res, data } = await api(`/api/assistant/conversations/${target.id}`, { method: "DELETE" }).catch(() => ({ res: { ok: false }, data: {} }));
    if (res.ok && data.ok) {
      setConversations((list) => list.filter((c) => c.id !== target.id));
      setSearchResults((list) => (list ? list.filter((c) => c.id !== target.id) : list));
      if (activeId === target.id) openConversation(null);
    } else {
      setError({ text: data.error || "No se pudo eliminar la conversación.", canRetry: false });
    }
  };

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    writeSettings(next);
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setDrawerOpen((v) => !v);
      return;
    }
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    updateSettings({ sidebarCollapsed: next });
  };

  const applySuggestion = (s) => {
    setMode(s.mode);
    setInput(s.text);
    inputRef.current?.focus();
  };

  /* ------------------------------------------------------------ render */

  const lastMessage = messages[messages.length - 1];
  const headerTitle = activeConversation?.title || (activeId ? "Conversación" : DEFAULT_CONVERSATION_TITLE);
  const showWelcome = !activeId && !messages.length && !loadingConversation;
  const sidebarVisible = isMobile ? drawerOpen : !sidebarCollapsed;
  const remaining = MAX_MESSAGE_CHARS - input.length;

  const renderConversationItem = (c) => {
    const active = c.id === activeId;
    if (renaming?.id === c.id) {
      return (
        <li key={c.id}>
          <form
            className={styles.renameForm}
            onSubmit={(ev) => {
              ev.preventDefault();
              submitRename();
            }}
          >
            <input
              autoFocus
              className={styles.renameInput}
              value={renaming.value}
              maxLength={120}
              aria-label="Nuevo nombre de la conversación"
              onChange={(ev) => setRenaming({ id: c.id, value: ev.target.value })}
              onBlur={submitRename}
              onKeyDown={(ev) => {
                if (ev.key === "Escape") setRenaming(null);
              }}
            />
          </form>
        </li>
      );
    }
    return (
      <li key={c.id} className={styles.chatItemWrap}>
        <button
          type="button"
          className={`${styles.chatItem} ${active ? styles.chatItemActive : ""}`}
          onClick={() => openConversation(c.id)}
          aria-current={active ? "page" : undefined}
          title={c.title}
        >
          <span className={styles.chatItemTitle}>{c.title}</span>
        </button>
        <div className={styles.chatItemMenuRoot} data-menu-root>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.chatItemMenuButton} ${menuFor === c.id ? styles.chatItemMenuButtonOpen : ""}`}
            aria-label={`Opciones de ${c.title}`}
            aria-haspopup="menu"
            aria-expanded={menuFor === c.id}
            onClick={() => setMenuFor((v) => (v === c.id ? null : c.id))}
          >
            <Icon name="dots" size={16} />
          </button>
          {menuFor === c.id ? (
            <div className={styles.popover} role="menu">
              <button
                type="button"
                role="menuitem"
                className={styles.popoverItem}
                onClick={() => {
                  setMenuFor(null);
                  setRenaming({ id: c.id, value: c.title });
                }}
              >
                <Icon name="edit" size={15} /> Renombrar
              </button>
              <button type="button" role="menuitem" className={styles.popoverItem} disabled title="Disponible cuando lleguen los proyectos (etapa 2)">
                <Icon name="folder" size={15} /> Mover a proyecto
                <span className={styles.soonTag}>Etapa 2</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${styles.popoverItem} ${styles.popoverDanger}`}
                onClick={() => {
                  setMenuFor(null);
                  setConfirmDelete(c);
                }}
              >
                <Icon name="trash" size={15} /> Eliminar
              </button>
            </div>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <div className={`${styles.workspace} ${sidebarVisible ? "" : styles.sidebarHidden}`}>
      {isMobile && drawerOpen ? <div className={styles.scrim} onClick={() => setDrawerOpen(false)} aria-hidden="true" /> : null}

      <aside
        className={`${styles.sidebar} ${isMobile ? styles.sidebarDrawer : ""} ${isMobile && drawerOpen ? styles.sidebarOpen : ""}`}
        aria-label="Conversaciones"
        aria-hidden={!sidebarVisible}
        inert={!sidebarVisible}
      >
        <div className={styles.sidebarTop}>
          <a href="/" className={styles.brand} title="Volver a Basket Lab">
            <span className={styles.brandIcon}>
              <BallIcon size={22} />
            </span>
            <span className={styles.brandText}>
              BasketIQ <small>Asistente</small>
            </span>
          </a>
          <button type="button" className={styles.iconButton} onClick={toggleSidebar} aria-label={isMobile ? "Cerrar menú" : "Contraer barra lateral"} title={isMobile ? "Cerrar menú" : "Contraer barra lateral"}>
            <Icon name={isMobile ? "close" : "sidebar"} />
          </button>
        </div>

        <div className={styles.sidebarActions}>
          <button type="button" className={styles.sidebarAction} onClick={() => openConversation(null)}>
            <Icon name="edit" /> Nuevo chat
          </button>
          <label className={styles.searchBox}>
            <Icon name="search" size={16} />
            <input
              type="search"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              placeholder="Buscar conversaciones"
              aria-label="Buscar conversaciones"
              disabled={persistence === "off"}
            />
          </label>
        </div>

        <div className={styles.sidebarScroll}>
          <section className={styles.sidebarSection} aria-label="Proyectos">
            <div className={styles.sectionHeader}>
              <span>Proyectos</span>
              <span className={styles.soonTag}>Etapa 2</span>
            </div>
            <button type="button" className={styles.sidebarAction} disabled title="Los proyectos por categoría llegan en la etapa 2">
              <Icon name="folder" /> Nuevo proyecto
            </button>
            <p className={styles.sectionHint}>Acá vas a poder agrupar chats, documentos y contexto por categoría (U13, U15, Primera…).</p>
          </section>

          <section className={styles.sidebarSection} aria-label="Chats">
            <div className={styles.sectionHeader}>
              <span>Chats</span>
              {searching ? <span className={styles.sectionMuted}>Buscando…</span> : null}
            </div>
            {persistence === "off" ? (
              <p className={styles.sectionHint}>El historial todavía no está activado. Las conversaciones de esta sesión no se guardan.</p>
            ) : listLoading ? (
              <div className={styles.skeletonList} aria-label="Cargando conversaciones">
                <span />
                <span />
                <span />
              </div>
            ) : !visibleConversations.length ? (
              <p className={styles.sectionHint}>{search.trim() ? "No hay conversaciones que coincidan." : "Todavía no tenés conversaciones guardadas."}</p>
            ) : (
              groups.map((g) => (
                <div key={g.id} className={styles.group}>
                  <p className={styles.groupLabel}>{g.label}</p>
                  <ul className={styles.chatList}>{g.items.map(renderConversationItem)}</ul>
                </div>
              ))
            )}
          </section>
        </div>

        <div className={styles.sidebarBottom}>
          <button type="button" className={styles.sidebarAction} onClick={() => setSettingsOpen(true)}>
            <Icon name="settings" /> Configuración
          </button>
          <a href="/" className={styles.sidebarAction}>
            <Icon name="back" /> Volver a Basket Lab
          </a>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          {!sidebarVisible ? (
            <button type="button" className={styles.iconButton} onClick={toggleSidebar} aria-label={isMobile ? "Abrir menú" : "Expandir barra lateral"} title={isMobile ? "Abrir menú" : "Expandir barra lateral"}>
              <Icon name={isMobile ? "menu" : "sidebar"} />
            </button>
          ) : null}
          <div className={styles.topbarTitle}>
            <h1 title={headerTitle}>{headerTitle}</h1>
            <span className={styles.topbarSub}>
              {academyLabel && activeId ? `Academy: ${academyLabel}` : "Sin proyecto"}
              {status.model ? ` · Gemini ${status.model}` : ""}
            </span>
          </div>
          <div className={styles.topbarActions}>
            {activeConversation ? (
              <>
                <button type="button" className={styles.iconButton} onClick={() => { if (isMobile) setDrawerOpen(true); else if (sidebarCollapsed) toggleSidebar(); setRenaming({ id: activeConversation.id, value: activeConversation.title }); }} aria-label="Renombrar conversación" title="Renombrar">
                  <Icon name="edit" />
                </button>
                <button type="button" className={styles.iconButton} onClick={() => setConfirmDelete(activeConversation)} aria-label="Eliminar conversación" title="Eliminar">
                  <Icon name="trash" />
                </button>
              </>
            ) : null}
            <button type="button" className={styles.iconButton} onClick={() => openConversation(null)} aria-label="Nuevo chat" title="Nuevo chat">
              <Icon name="plus" />
            </button>
          </div>
        </header>

        {status.configured === false ? (
          <div className={styles.banner} role="status">
            El asistente todavía no está configurado en este servidor: falta la variable <code>GEMINI_API_KEY</code>.
          </div>
        ) : null}
        {persistence === "off" ? (
          <div className={styles.banner} role="status">
            El historial todavía no está activado: falta ejecutar <code>docs/sql/007-assistant-conversations.sql</code> en Supabase. Mientras tanto el chat funciona, pero no se guarda.
          </div>
        ) : null}
        {authExpired ? (
          <div className={styles.banner} role="alert">
            Tu sesión expiró. <a href="/">Volvé a iniciar sesión en Basket Lab</a> para usar el asistente.
          </div>
        ) : null}

        <div className={styles.scroll} ref={scrollRef} onScroll={onScroll}>
          <div className={styles.thread} aria-live="polite">
            {showWelcome ? (
              <div className={styles.welcome}>
                <span className={styles.welcomeIcon}>
                  <BallIcon size={52} />
                </span>
                <h2>¿En qué te ayudo hoy, coach?</h2>
                <p>Contame la categoría, el nivel y el objetivo, y armamos la respuesta a la medida de tu equipo.</p>
                <div className={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <button key={s.text} type="button" className={styles.suggestion} onClick={() => applySuggestion(s)}>
                      <span className={styles.suggestionTitle}>{s.title}</span>
                      <span className={styles.suggestionText}>{s.text}</span>
                      <span className={styles.suggestionMode}>{modes.find((m) => m.id === s.mode)?.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {loadingConversation ? (
              <div className={styles.loadingThread} role="status">
                <span className={styles.dots} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                Abriendo conversación…
              </div>
            ) : null}

            {messages.map((m) => {
              const isLast = m === lastMessage;
              if (m.role === "user") {
                return (
                  <div key={m.id} className={styles.userRow}>
                    <div className={`${styles.userBubble} ${m.pendingSave ? styles.userBubblePending : ""}`}>{m.text}</div>
                  </div>
                );
              }
              const hidden = isLast && pending === "regenerate";
              return (
                <article key={m.id} className={`${styles.modelRow} ${hidden ? styles.modelRowFaded : ""}`}>
                  <span className={styles.avatar} aria-hidden="true">
                    <BallIcon size={18} />
                  </span>
                  <div className={styles.modelBody}>
                    <div className={styles.markdown}>{renderMarkdown(m.text)}</div>
                    {m.truncated ? <p className={styles.truncated}>La respuesta se cortó por largo. Pedile que continúe.</p> : null}
                    <div className={styles.messageActions}>
                      <button type="button" className={styles.actionButton} onClick={() => handleCopy(m)} aria-label="Copiar respuesta" title="Copiar">
                        <Icon name={copiedId === m.id ? "check" : "copy"} size={15} />
                        <span>{copiedId === m.id ? "Copiado" : "Copiar"}</span>
                      </button>
                      {isLast ? (
                        <button type="button" className={styles.actionButton} onClick={handleRegenerate} disabled={Boolean(pending)} aria-label="Regenerar respuesta" title="Regenerar">
                          <Icon name="refresh" size={15} />
                          <span>Regenerar</span>
                        </button>
                      ) : null}
                      {m.mode ? <span className={styles.messageMode}>{modes.find((x) => x.id === m.mode)?.label || m.mode}</span> : null}
                    </div>
                  </div>
                </article>
              );
            })}

            {pending ? (
              <div className={styles.modelRow} role="status">
                <span className={`${styles.avatar} ${styles.avatarPulse}`} aria-hidden="true">
                  <BallIcon size={18} />
                </span>
                <div className={styles.typing}>
                  <span className={styles.dots} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  {pending === "regenerate" ? "Generando otra respuesta…" : "Pensando la respuesta…"}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className={styles.error} role="alert">
                <span>{error.text}</span>
                {error.canRetry && !pending && lastMessage?.role === "user" ? (
                  <button type="button" className={styles.ghostButton} onClick={handleRetry}>
                    Reintentar
                  </button>
                ) : null}
                <button type="button" className={styles.iconButton} onClick={() => setError(null)} aria-label="Cerrar aviso">
                  <Icon name="close" size={16} />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.composerDock}>
          {showJump ? (
            <button type="button" className={styles.jumpButton} onClick={jumpToBottom} aria-label="Ir al final de la conversación">
              <Icon name="arrowDown" size={16} />
            </button>
          ) : null}
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
              placeholder="Escribí tu consulta…"
              rows={1}
              maxLength={MAX_MESSAGE_CHARS}
              aria-label="Consulta para el asistente"
            />
            <div className={styles.composerBar}>
              <button type="button" className={styles.iconButton} disabled title="Adjuntar documentos llega en la etapa 3, junto con los proyectos" aria-label="Adjuntar archivo (disponible en la etapa 3)">
                <Icon name="paperclip" />
              </button>
              <div className={styles.modeRoot} data-menu-root>
                <button
                  type="button"
                  className={styles.modePill}
                  onClick={() => setModeMenuOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={modeMenuOpen}
                  aria-label={`Modo de conversación: ${activeMode.label}`}
                >
                  <span className={styles.modeDot} data-mode={activeMode.id} />
                  {activeMode.label}
                  <Icon name="chevron" size={14} />
                </button>
                {modeMenuOpen ? (
                  <div className={`${styles.popover} ${styles.modePopover}`} role="listbox" aria-label="Modo de conversación">
                    {modes.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        role="option"
                        aria-selected={m.id === mode}
                        className={`${styles.modeOption} ${m.id === mode ? styles.modeOptionActive : ""}`}
                        onClick={() => {
                          setMode(m.id);
                          setModeMenuOpen(false);
                          inputRef.current?.focus();
                        }}
                      >
                        <span className={styles.modeDot} data-mode={m.id} />
                        <span>
                          <strong>{m.label}</strong>
                          <small>{m.description}</small>
                        </span>
                        {m.id === mode ? <Icon name="check" size={15} /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <span className={styles.composerSpacer} />
              {remaining < 500 ? <span className={styles.counter}>{remaining}</span> : null}
              {pending ? (
                <button type="button" className={styles.sendButton} onClick={handleStop} aria-label="Detener respuesta" title="Detener">
                  <Icon name="stop" />
                </button>
              ) : (
                <button type="submit" className={styles.sendButton} disabled={!input.trim() || persistence === "unknown"} aria-label="Enviar consulta" title="Enviar">
                  <Icon name="send" />
                </button>
              )}
            </div>
          </form>
          <p className={styles.footnote}>
            BasketIQ puede equivocarse: revisá las propuestas antes de aplicarlas. Evitá incluir datos médicos o personales de jugadores.
          </p>
        </div>
      </main>

      {confirmDelete ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setConfirmDelete(null)}>
          <div className={styles.modal} role="alertdialog" aria-modal="true" aria-labelledby="delete-title" onClick={(ev) => ev.stopPropagation()}>
            <h2 id="delete-title">¿Eliminar la conversación?</h2>
            <p>
              Se va a borrar <strong>{confirmDelete.title}</strong> con todos sus mensajes. No se puede deshacer.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setConfirmDelete(null)} autoFocus>
                Cancelar
              </button>
              <button type="button" className={styles.dangerButton} onClick={doDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setSettingsOpen(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(ev) => ev.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 id="settings-title">Configuración</h2>
              <button type="button" className={styles.iconButton} onClick={() => setSettingsOpen(false)} aria-label="Cerrar">
                <Icon name="close" />
              </button>
            </div>
            <fieldset className={styles.fieldset}>
              <legend>Modo para los chats nuevos</legend>
              {modes.map((m) => (
                <label key={m.id} className={styles.radioRow}>
                  <input type="radio" name="default-mode" checked={settings.defaultMode === m.id} onChange={() => updateSettings({ defaultMode: m.id })} />
                  <span>
                    <strong>{m.label}</strong>
                    <small>{m.description}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <dl className={styles.statusList}>
              <div>
                <dt>Modelo</dt>
                <dd>{status.model ? `Google Gemini · ${status.model}` : "Sin datos"}</dd>
              </div>
              <div>
                <dt>Historial</dt>
                <dd>{persistence === "on" ? "Activado: tus chats se guardan en tu cuenta." : persistence === "off" ? "Desactivado: falta la migración 007 en Supabase." : "Comprobando…"}</dd>
              </div>
            </dl>
            <p className={styles.modalNote}>
              Cada consulta se envía a Google Gemini con los mensajes de esa conversación. No incluyas datos médicos ni información personal identificable de jugadores menores.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

