"use client";

import { createClient } from "@supabase/supabase-js";

let cachedSession = null;
let cachedSessionAt = 0;
const SESSION_TTL_MS = 60 * 1000;

async function fetchRealtimeSession() {
  const now = Date.now();
  if (cachedSession && now - cachedSessionAt < SESSION_TTL_MS) {
    return cachedSession;
  }
  const res = await fetch("/api/auth/realtime-session", { credentials: "same-origin" });
  const data = await res.json();
  if (!data.ok || !data.enabled) return null;
  cachedSession = data;
  cachedSessionAt = now;
  return data;
}

/**
 * Subscribe to Postgres changes for a player profile (Supabase Realtime + RLS).
 * Returns unsubscribe function.
 */
export async function subscribePlayerChannel(playerId, onChange) {
  if (!playerId) return () => {};

  const session = await fetchRealtimeSession();
  if (!session?.accessToken) return () => {};

  const client = createClient(session.supabaseUrl, session.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.accessToken}` } }
  });

  const tables = [
    "players",
    "player_notes",
    "player_goals",
    "player_evolution_events",
    "shooting_sessions",
    "shooting_session_players",
    "player_members"
  ];

  const channel = client.channel(`player:${playerId}`);

  tables.forEach((table) => {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (payload) => {
        onChange({ table, payload });
      }
    );
  });

  channel.subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
