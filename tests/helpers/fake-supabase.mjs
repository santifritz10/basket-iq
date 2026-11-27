// Cliente falso de Supabase en memoria: implementa solo las consultas que usa
// lib/shooting/lab-core.js, con las restricciones de la migración 011 que
// importan para las pruebas (participante obligatorio, anti-duplicados, cascada).
import crypto from "node:crypto";

export function createFakeDb(seed = {}) {
  const tables = {
    players: [],
    player_members: [],
    player_goals: [],
    shooting_sessions: [],
    shooting_session_players: [],
    shooting_entries: [],
    ...structuredClone(seed)
  };
  const log = [];

  function constraintError(message, code = "23503") {
    return { data: null, error: { code, message } };
  }

  function insertRows(table, rows, { upsert = false, onConflict = null, ignoreDuplicates = false } = {}) {
    const list = Array.isArray(rows) ? rows : [rows];
    const inserted = [];
    const merged = [];
    for (const raw of list) {
      const row = { ...raw };
      if (!row.id && table !== "shooting_session_players") row.id = crypto.randomUUID();
      const now = new Date().toISOString();
      if (onConflict && table !== "shooting_entries") {
        const cols = onConflict.split(",");
        const dup = tables[table].find((e) => cols.every((c) => e[c] === row[c]));
        if (dup) {
          if (upsert && ignoreDuplicates) continue;
          if (upsert) {
            // Upsert real: actualiza la fila existente.
            const { id: _id, ...rest } = row;
            Object.assign(dup, rest);
            merged.push(dup);
            continue;
          }
          return constraintError("duplicate key value violates unique constraint", "23505");
        }
      }
      if (!["shooting_sessions", "shooting_entries", "shooting_session_players"].includes(table)) {
        row.created_at = row.created_at || now;
        if ("voided_at" in row === false && ["player_assessments", "player_stat_records", "player_goal_checkins"].includes(table)) row.voided_at = null;
        if (table === "team_players" && row.left_on === undefined) row.left_on = null;
        if (table === "teams" && row.archived_at === undefined) row.archived_at = null;
        if (table === "assessment_criteria" && row.active === undefined) row.active = true;
      }
      if (table === "shooting_sessions" || table === "shooting_entries") {
        row.created_at = row.created_at || now;
        if (table === "shooting_sessions") row.updated_at = now;
        if (table === "shooting_entries") {
          row.recorded_at = row.recorded_at || now;
          row.voided_at = row.voided_at ?? null;
          row.tags = row.tags || [];
          const dup = tables.shooting_entries.find(
            (e) => e.session_id === row.session_id && e.client_entry_id === row.client_entry_id
          );
          if (dup) {
            if (upsert && ignoreDuplicates && onConflict === "session_id,client_entry_id") continue;
            return constraintError("duplicate key value violates unique constraint", "23505");
          }
          if (row.player_id) {
            const isParticipant = tables.shooting_session_players.some(
              (p) => p.session_id === row.session_id && p.player_id === row.player_id
            );
            if (!isParticipant) return constraintError("violates foreign key constraint shooting_entries_participant_fk");
          }
          if (row.made > row.attempts) return constraintError("violates check constraint", "23514");
        }
      }
      if (table === "shooting_session_players") {
        if (tables.shooting_session_players.some((p) => p.session_id === row.session_id && p.player_id === row.player_id)) {
          return constraintError("duplicate key", "23505");
        }
      }
      inserted.push(row);
    }
    tables[table].push(...inserted);
    return { data: [...merged, ...inserted].map((r) => ({ ...r })), error: null };
  }

  function deleteRows(table, predicate) {
    const victims = tables[table].filter(predicate);
    if (table === "shooting_session_players") {
      const blocked = victims.some((v) =>
        tables.shooting_entries.some((e) => e.session_id === v.session_id && e.player_id === v.player_id)
      );
      if (blocked) return constraintError("violates foreign key constraint shooting_entries_participant_fk");
    }
    tables[table] = tables[table].filter((r) => !predicate(r));
    if (table === "shooting_sessions") {
      const ids = new Set(victims.map((v) => v.id));
      tables.shooting_entries = tables.shooting_entries.filter((e) => !ids.has(e.session_id));
      tables.shooting_session_players = tables.shooting_session_players.filter((p) => !ids.has(p.session_id));
    }
    return { data: null, error: null };
  }

  function builder(table) {
    const filters = [];
    let op = "select";
    let payload = null;
    let options = {};
    let order = null;
    let limit = null;
    let mode = "many";
    let returning = false;

    const api = {
      select() {
        if (op !== "select") returning = true;
        return api;
      },
      insert(rows) {
        op = "insert";
        payload = rows;
        return api;
      },
      upsert(rows, opts = {}) {
        op = "upsert";
        payload = rows;
        options = opts;
        return api;
      },
      update(values) {
        op = "update";
        payload = values;
        return api;
      },
      delete() {
        op = "delete";
        return api;
      },
      eq(col, val) {
        filters.push((r) => r[col] === val);
        return api;
      },
      neq(col, val) {
        filters.push((r) => r[col] !== val);
        return api;
      },
      in(col, vals) {
        const set = new Set(vals);
        filters.push((r) => set.has(r[col]));
        return api;
      },
      is(col, val) {
        filters.push((r) => (val === null ? r[col] == null : r[col] === val));
        return api;
      },
      order(col, { ascending = true } = {}) {
        order = { col, ascending };
        return api;
      },
      limit(n) {
        limit = n;
        return api;
      },
      maybeSingle() {
        mode = "maybe";
        return api;
      },
      single() {
        mode = "single";
        return api;
      },
      then(resolve, reject) {
        try {
          resolve(run());
        } catch (e) {
          reject(e);
        }
      }
    };

    const match = (r) => filters.every((f) => f(r));

    function shape(rows) {
      if (mode === "single") {
        if (rows.length !== 1) return { data: null, error: { code: "PGRST116", message: "not single" } };
        return { data: rows[0], error: null };
      }
      if (mode === "maybe") return { data: rows[0] || null, error: null };
      return { data: rows, error: null };
    }

    function run() {
      if (!tables[table]) return { data: null, error: { code: "PGRST205", message: `Could not find the table '${table}' in the schema cache` } };
      log.push({ table, op });
      if (op === "insert" || op === "upsert") {
        const r = insertRows(table, payload, { upsert: op === "upsert", onConflict: options.onConflict, ignoreDuplicates: options.ignoreDuplicates });
        if (r.error) return r;
        return returning || mode !== "many" ? shape(r.data) : { data: null, error: null };
      }
      if (op === "update") {
        const rows = tables[table].filter(match);
        rows.forEach((r) => Object.assign(r, payload, table === "shooting_sessions" ? { updated_at: new Date().toISOString() } : {}));
        return returning || mode !== "many" ? shape(rows.map((r) => ({ ...r }))) : { data: null, error: null };
      }
      if (op === "delete") return deleteRows(table, match);
      let rows = tables[table].filter(match).map((r) => ({ ...r }));
      if (order) {
        rows.sort((a, b) => {
          const x = String(a[order.col] ?? "");
          const y = String(b[order.col] ?? "");
          return order.ascending ? x.localeCompare(y) : y.localeCompare(x);
        });
      }
      if (limit != null) rows = rows.slice(0, limit);
      return shape(rows);
    }

    return api;
  }

  return {
    from: (table) => builder(table),
    tables,
    log,
    dropTable(name) {
      delete tables[name];
    }
  };
}
