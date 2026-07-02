/**
 * Entrenamiento de tiro — mapa de media cancha por capas (layering).
 * Componente autocontenido: ShootingHeatmap.init(elemento)
 * Build: sesiones-jugadores-v2
 */
(function (global) {
    "use strict";

    var STORAGE_KEY = "basketLab_shootingHeatmap7";

    var ZONES = [
        { id: "paint", label: "Pintura", short: "P", points: "20,280 320,280 320,620 20,620", cx: 170, cy: 450 },
        { id: "mid_l", label: "Media distancia izquierda", short: "MI", points: "320,20 820,80 820,300 320,300", cx: 560, cy: 180 },
        { id: "mid_c", label: "Media distancia centro", short: "MC", points: "320,300 820,300 820,600 320,600", cx: 570, cy: 450 },
        { id: "mid_r", label: "Media distancia derecha", short: "MD", points: "320,600 820,600 820,820 320,880", cx: 570, cy: 730 },
        { id: "t3_corner_l", label: "Triple esquina izquierda", short: "E3I", points: "820,20 1580,20 1580,170 820,170", cx: 1210, cy: 95 },
        { id: "t3_left45", label: "Triple 45° izquierda", short: "45I", points: "820,170 1580,170 1580,330 900,330", cx: 1210, cy: 245 },
        { id: "t3_front", label: "Triple frontal", short: "3F", points: "900,330 1580,330 1580,570 900,570", cx: 1240, cy: 450 },
        { id: "t3_right45", label: "Triple 45° derecha", short: "45D", points: "900,570 1580,570 1580,730 820,730", cx: 1210, cy: 650 },
        { id: "t3_corner_r", label: "Triple esquina derecha", short: "E3D", points: "820,730 1580,730 1580,880 820,880", cx: 1210, cy: 805 }
    ];

    function escapeHtml(str) {
        var d = document.createElement("div");
        d.textContent = str == null ? "" : String(str);
        return d.innerHTML;
    }

    function zoneStats(state, zoneId) {
        var z = state[zoneId];
        var attempts = z && typeof z.attempts === "number" ? z.attempts : 0;
        var made = z && typeof z.made === "number" ? z.made : 0;
        attempts = Math.max(0, attempts);
        made = Math.min(Math.max(0, made), attempts);
        return { attempts: attempts, made: made };
    }

    function pctValue(attempts, made) {
        if (!attempts) return null;
        return (made / attempts) * 100;
    }

    function pctLabel(attempts, made) {
        if (!attempts) return "—";
        return Math.round((made / attempts) * 100) + "%";
    }

    function zoneHeatColor(attempts, made) {
        if (!attempts) return "rgba(255,255,255,0.08)";
        var p = made / attempts;
        if (p < 0.4) return "rgba(239, 83, 80, 0.46)";
        if (p <= 0.6) return "rgba(255, 202, 40, 0.44)";
        return "rgba(102, 187, 106, 0.45)";
    }

    function badgeColor(attempts, made) {
        if (!attempts) return "#6b7280";
        var p = made / attempts;
        if (p < 0.4) return "#ef5350";
        if (p <= 0.6) return "#fbc02d";
        return "#66bb6a";
    }

    function sanitizeState(rawState) {
        var safe = rawState && typeof rawState === "object" ? rawState : {};
        var migrated = {};
        ZONES.forEach(function (z) {
            migrated[z.id] = zoneStats(safe, z.id);
        });

        // Migración legacy: si existía solo t3_front vieja y no 45°, redistribuye una parte.
        if (safe.t3_front && !safe.t3_left45 && !safe.t3_right45) {
            var legacy = zoneStats(safe, "t3_front");
            var splitAttempts = Math.floor(legacy.attempts * 0.2);
            var splitMade = Math.floor(legacy.made * 0.2);
            migrated.t3_left45 = { attempts: splitAttempts, made: splitMade };
            migrated.t3_right45 = { attempts: splitAttempts, made: splitMade };
            migrated.t3_front = {
                attempts: Math.max(0, legacy.attempts - splitAttempts * 2),
                made: Math.max(0, legacy.made - splitMade * 2)
            };
        }
        return migrated;
    }

    function emptyZonesState() {
        var empty = {};
        ZONES.forEach(function (z) {
            empty[z.id] = { attempts: 0, made: 0 };
        });
        return sanitizeState(empty);
    }

    function normalizeSession(raw) {
        var s = raw || {};
        return {
            id: String(s.id || "shoot_" + Date.now()),
            fecha: String(s.fecha || "").slice(0, 10),
            nombre: String(s.nombre || "Sesión de tiro").trim() || "Sesión de tiro",
            player_ids: Array.isArray(s.player_ids) ? s.player_ids.map(String) : [],
            zones: sanitizeState(s.zones || {}),
            created_at: s.created_at || new Date().toISOString(),
            updated_at: s.updated_at || new Date().toISOString()
        };
    }

    function isLegacyZonePayload(raw) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
        if (raw.sessions || raw.version) return false;
        return ZONES.some(function (z) {
            return Object.prototype.hasOwnProperty.call(raw, z.id);
        });
    }

    function migratePayload(raw) {
        if (raw && Array.isArray(raw.sessions)) {
            var sessions = raw.sessions.map(normalizeSession);
            var activeId = raw.active_session_id;
            if (!activeId || !sessions.some(function (s) { return s.id === activeId; })) {
                activeId = sessions[0] ? sessions[0].id : null;
            }
            return { version: 2, active_session_id: activeId, sessions: sessions };
        }

        if (isLegacyZonePayload(raw)) {
            var zones = sanitizeState(raw);
            var hasShots = ZONES.some(function (z) {
                return zoneStats(zones, z.id).attempts > 0;
            });
            if (hasShots) {
                var legacySession = normalizeSession({
                    id: "legacy_migrated",
                    fecha: new Date().toISOString().slice(0, 10),
                    nombre: "Sesión anterior",
                    player_ids: [],
                    zones: zones
                });
                return { version: 2, active_session_id: legacySession.id, sessions: [legacySession] };
            }
        }

        return { version: 2, active_session_id: null, sessions: [] };
    }

    function loadPayload() {
        var base = {};
        if (global.BasketLabDataSync && typeof global.BasketLabDataSync.loadData === "function") {
            var cloudBacked = global.BasketLabDataSync.loadData("shooting_heatmap");
            if (cloudBacked && typeof cloudBacked === "object") base = cloudBacked;
        } else {
            try {
                var raw = localStorage.getItem(STORAGE_KEY);
                if (raw) base = JSON.parse(raw) || {};
            } catch (e) {
                base = {};
            }
        }
        return migratePayload(base);
    }

    function savePayload(payload) {
        if (global.BasketLabDataSync && typeof global.BasketLabDataSync.saveData === "function") {
            global.BasketLabDataSync.saveData("shooting_heatmap", payload);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    function loadState() {
        var payload = loadPayload();
        var active = payload.sessions.find(function (s) { return s.id === payload.active_session_id; });
        return active ? sanitizeState(active.zones) : emptyZonesState();
    }

    function saveState(state) {
        var payload = loadPayload();
        var active = payload.sessions.find(function (s) { return s.id === payload.active_session_id; });
        if (!active) return;
        active.zones = sanitizeState(state);
        active.updated_at = new Date().toISOString();
        savePayload(payload);
    }

    function loadPlayers() {
        if (global.BasketLabDataSync && typeof global.BasketLabDataSync.loadData === "function") {
            var list = global.BasketLabDataSync.loadData("players_tracking");
            return Array.isArray(list) ? list : [];
        }
        return [];
    }

    function formatSessionFecha(fecha) {
        if (!fecha) return "Sin fecha";
        try {
            return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
        } catch (e) {
            return fecha;
        }
    }

    function sessionPlayersLabel(session, players) {
        if (!session || !session.player_ids || !session.player_ids.length) return "Sin jugadores";
        var names = session.player_ids.map(function (pid) {
            var p = players.find(function (pl) { return String(pl.id) === String(pid); });
            return p ? String(p.name || "").trim() : "";
        }).filter(Boolean);
        return names.length ? names.join(", ") : "Sin jugadores";
    }

    function sessionTotalShots(zones) {
        var ta = 0;
        var tm = 0;
        ZONES.forEach(function (z) {
            var s = zoneStats(zones, z.id);
            ta += s.attempts;
            tm += s.made;
        });
        return { attempts: ta, made: tm };
    }

    function maxAttempts(state) {
        var max = 1;
        ZONES.forEach(function (z) {
            var s = zoneStats(state, z.id);
            if (s.attempts > max) max = s.attempts;
        });
        return max;
    }

    function statsTableRows(state) {
        var maxA = maxAttempts(state);
        return ZONES.map(function (z) {
            var s = zoneStats(state, z.id);
            var vol = Math.max(6, Math.round((s.attempts / maxA) * 100));
            return (
                '<tr data-zone-row="' + z.id + '">' +
                "<td>" + escapeHtml(z.label) + "</td>" +
                "<td>" + s.attempts + "</td>" +
                "<td>" + s.made + "</td>" +
                '<td class="shx-pct">' + pctLabel(s.attempts, s.made) + "</td>" +
                '<td><div class="shx-vol"><span style="width:' + vol + '%"></span></div></td>' +
                "</tr>"
            );
        }).join("");
    }

    function zoneButtonsHtml(state) {
        return ZONES.map(function (z) {
            var s = zoneStats(state, z.id);
            return (
                '<button type="button" class="shx-zone-chip" data-zone-btn="' + z.id + '">' +
                '<span class="shx-zone-chip-title">' + escapeHtml(z.label) + "</span>" +
                '<span class="shx-zone-chip-meta">' + s.attempts + " int · " + s.made + " enc · " + pctLabel(s.attempts, s.made) + "</span>" +
                "</button>"
            );
        }).join("");
    }

    function generateWorkoutPlan(state, totalShots) {
        totalShots = Math.max(18, Math.min(250, Math.floor(Number(totalShots) || 60)));
        var weights = ZONES.map(function (z) {
            var s = zoneStats(state, z.id);
            var p = pctValue(s.attempts, s.made);
            if (!s.attempts) return 20;
            if (p < 40) return 16;
            if (p <= 60) return 10;
            return 6;
        });
        var sum = weights.reduce(function (a, b) { return a + b; }, 0);
        var plan = [];
        var acc = 0;
        for (var i = 0; i < ZONES.length; i++) {
            var shots = Math.max(1, Math.floor((totalShots * weights[i]) / sum));
            plan.push({ zone: ZONES[i], shots: shots });
            acc += shots;
        }
        var d = totalShots - acc;
        var idx = 0;
        while (d > 0) {
            plan[idx % plan.length].shots++;
            idx++;
            d--;
        }
        return plan;
    }

    function courtStructureSvg() {
        return (
            "<defs>" +
            '<filter id="bcmShadow" x="-12%" y="-12%" width="124%" height="124%">' +
            '<feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity="0.4"/>' +
            "</filter>" +
            "</defs>" +
            '<rect x="10" y="10" width="1580" height="880" rx="24" fill="#1a1a1a" filter="url(#bcmShadow)"/>' +
            '<line class="bcm-line" x1="20" y1="20" x2="1580" y2="20"/>' +
            '<line class="bcm-line" x1="20" y1="20" x2="20" y2="880"/>' +
            '<line class="bcm-line" x1="1580" y1="20" x2="1580" y2="880"/>' +
            '<line class="bcm-line bcm-line-dash" x1="20" y1="880" x2="1580" y2="880"/>' +
            '<path class="bcm-line" d="M 20 120 Q 870 450 20 780" fill="none"/>' +
            '<rect class="bcm-line" x="20" y="280" width="300" height="340" fill="none"/>' +
            '<line class="bcm-line" x1="320" y1="350" x2="320" y2="550"/>' +
            '<circle class="bcm-line" cx="320" cy="450" r="95" fill="none"/>' +
            '<line class="bcm-line-thin" x1="90" y1="450" x2="120" y2="450"/>' +
            '<circle class="bcm-hoop" cx="80" cy="450" r="18"/>' +
            '<circle class="bcm-hoop-dot" cx="80" cy="450" r="6"/>'
        );
    }

    function BasketballCourtMap(options) {
        this.root = options.root;
        this.zones = options.zones;
        this.getStats = options.getStats;
        this.onSelect = options.onSelect;
        this.selectedId = options.selectedId || null;
    }

    BasketballCourtMap.prototype.zoneMarkup = function () {
        var self = this;
        return this.zones.map(function (z) {
            var s = self.getStats(z.id);
            var badge = badgeColor(s.attempts, s.made);
            return (
                '<g class="bcm-zone-group" data-zone="' + z.id + '" tabindex="0" role="button" aria-label="' + escapeHtml(z.label) + '">' +
                '<polygon class="bcm-zone-polygon" points="' + z.points + '" fill="' + zoneHeatColor(s.attempts, s.made) + '" style="pointer-events: bounding-box;" fill-opacity="0"/>' +
                '<circle class="bcm-zone-badge-ring" cx="' + z.cx + '" cy="' + z.cy + '" r="17" fill="#0f1117" stroke="' + badge + '" stroke-width="3"/>' +
                '<text class="bcm-zone-badge-text" x="' + z.cx + '" y="' + (z.cy + 4) + '" text-anchor="middle">' + pctLabel(s.attempts, s.made) + "</text>" +
                "</g>"
            );
        }).join("");
    };

    BasketballCourtMap.prototype.render = function () {
        this.root.innerHTML =
            '<div class="bcm-card">' +
            '<div class="bcm-aspect">' +
            '<svg class="bcm-bg-svg" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" aria-label="Estructura de media cancha">' +
            courtStructureSvg() +
            "</svg>" +
            '<svg class="bcm-zones-svg" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg" aria-label="Zonas de tiro interactivas">' +
            this.zoneMarkup() +
            "</svg>" +
            "</div></div>";
        this.bind();
        this.setSelected(this.selectedId);
    };

    BasketballCourtMap.prototype.bind = function () {
        var self = this;
        this.root.querySelectorAll(".bcm-zone-group").forEach(function (group) {
            var zoneId = group.getAttribute("data-zone");
            group.addEventListener("click", function () {
                self.onSelect(zoneId);
            });
            group.addEventListener("keydown", function (ev) {
                if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    self.onSelect(zoneId);
                }
            });
        });
    };

    BasketballCourtMap.prototype.updateZone = function (zoneId) {
        var group = this.root.querySelector('.bcm-zone-group[data-zone="' + zoneId + '"]');
        if (!group) return;
        var s = this.getStats(zoneId);
        var fill = zoneHeatColor(s.attempts, s.made);
        var color = badgeColor(s.attempts, s.made);
        var polygon = group.querySelector(".bcm-zone-polygon");
        var ring = group.querySelector(".bcm-zone-badge-ring");
        var txt = group.querySelector(".bcm-zone-badge-text");
        if (polygon) polygon.setAttribute("fill", fill);
        if (ring) ring.setAttribute("stroke", color);
        if (txt) txt.textContent = pctLabel(s.attempts, s.made);
    };

    BasketballCourtMap.prototype.updateAll = function () {
        var self = this;
        this.zones.forEach(function (z) { self.updateZone(z.id); });
    };

    BasketballCourtMap.prototype.setSelected = function (zoneId) {
        this.selectedId = zoneId;
        this.root.querySelectorAll(".bcm-zone-group").forEach(function (group) {
            group.classList.toggle("bcm-zone-group--selected", group.getAttribute("data-zone") === zoneId);
        });
    };

    global.BasketballCourtMap = BasketballCourtMap;

    var ShootingHeatmap = {
        root: null,
        payload: null,
        state: {},
        selectedId: null,
        courtMap: null,
        players: [],
        showNewSessionForm: false,

        init: function (el) {
            if (!el) return;
            this.root = el;
            this.payload = loadPayload();
            this.players = loadPlayers();
            this.syncStateFromActiveSession();
            this.selectedId = null;
            this.showNewSessionForm = !this.getActiveSession();
            this.render();
            this.bind();
        },

        syncStateFromActiveSession: function () {
            var active = this.getActiveSession();
            this.state = active ? sanitizeState(active.zones) : emptyZonesState();
        },

        getActiveSession: function () {
            if (!this.payload || !this.payload.active_session_id) return null;
            return this.payload.sessions.find(function (s) {
                return s.id === this.payload.active_session_id;
            }, this) || null;
        },

        persistActiveSessionZones: function () {
            var active = this.getActiveSession();
            if (!active) return;
            active.zones = sanitizeState(this.state);
            active.updated_at = new Date().toISOString();
            savePayload(this.payload);
        },

        switchSession: function (sessionId) {
            this.persistActiveSessionZones();
            this.payload.active_session_id = sessionId;
            savePayload(this.payload);
            this.syncStateFromActiveSession();
            this.selectedId = null;
            this.showNewSessionForm = false;
            this.render();
            this.bind();
        },

        createSession: function (data) {
            var session = normalizeSession({
                id: "shoot_" + Date.now(),
                fecha: data.fecha,
                nombre: data.nombre,
                player_ids: data.player_ids || [],
                zones: emptyZonesState()
            });
            this.persistActiveSessionZones();
            this.payload.sessions.unshift(session);
            this.payload.active_session_id = session.id;
            savePayload(this.payload);
            this.syncStateFromActiveSession();
            this.selectedId = null;
            this.showNewSessionForm = false;
            this.render();
            this.bind();
        },

        updateActiveSessionMeta: function (data) {
            var active = this.getActiveSession();
            if (!active) return;
            if (data.nombre != null) active.nombre = String(data.nombre).trim() || active.nombre;
            if (data.fecha != null) active.fecha = String(data.fecha).slice(0, 10);
            if (data.player_ids != null) active.player_ids = data.player_ids.map(String);
            active.updated_at = new Date().toISOString();
            savePayload(this.payload);
            this.players = loadPlayers();
            this.render();
            this.bind();
        },

        deleteSession: function (sessionId) {
            if (!confirm("¿Borrar esta sesión de tiro y sus registros?")) return;
            this.payload.sessions = this.payload.sessions.filter(function (s) { return s.id !== sessionId; });
            if (this.payload.active_session_id === sessionId) {
                this.payload.active_session_id = this.payload.sessions[0] ? this.payload.sessions[0].id : null;
            }
            savePayload(this.payload);
            this.syncStateFromActiveSession();
            this.selectedId = null;
            this.showNewSessionForm = !this.getActiveSession();
            this.render();
            this.bind();
        },

        resetActiveSessionStats: function () {
            var active = this.getActiveSession();
            if (!active) return;
            if (!confirm("¿Reiniciar las estadísticas de esta sesión?")) return;
            this.state = emptyZonesState();
            active.zones = this.state;
            active.updated_at = new Date().toISOString();
            savePayload(this.payload);
            this.selectedId = null;
            this.render();
            this.bind();
        },

        sessionsSorted: function () {
            return (this.payload.sessions || []).slice().sort(function (a, b) {
                var fa = a.fecha || "";
                var fb = b.fecha || "";
                if (fa !== fb) return fb.localeCompare(fa);
                return (b.updated_at || "").localeCompare(a.updated_at || "");
            });
        },

        playerPickerHtml: function (selectedIds, inputPrefix) {
            var prefix = inputPrefix || "shx";
            if (!this.players.length) {
                return '<p class="shx-session-hint">No hay jugadores cargados. Agregalos en <button type="button" class="shx-link-btn" data-shx-goto-players>Seguimiento de jugadores</button>.</p>';
            }
            var selected = new Set((selectedIds || []).map(String));
            return (
                '<div class="shx-player-picks">' +
                this.players.map(function (p) {
                    var pid = String(p.id);
                    var checked = selected.has(pid) ? " checked" : "";
                    var label = escapeHtml(p.name || "Sin nombre");
                    var meta = [p.position, p.category].filter(Boolean).join(" · ");
                    return (
                        '<label class="shx-player-pick">' +
                        '<input type="checkbox" name="' + prefix + '-player" value="' + pid + '"' + checked + ">" +
                        "<span><strong>" + label + "</strong>" +
                        (meta ? '<small>' + escapeHtml(meta) + "</small>" : "") +
                        "</span></label>"
                    );
                }).join("") +
                "</div>"
            );
        },

        sessionsPanelHtml: function () {
            var self = this;
            var sessions = this.sessionsSorted();
            var active = this.getActiveSession();
            var listHtml = sessions.length
                ? sessions.map(function (s) {
                    var totals = sessionTotalShots(s.zones);
                    var isActive = active && s.id === active.id;
                    return (
                        '<button type="button" class="shx-session-item' + (isActive ? " shx-session-item--active" : "") + '" data-shx-session-id="' + s.id + '">' +
                        '<span class="shx-session-item-date">' + escapeHtml(formatSessionFecha(s.fecha)) + "</span>" +
                        '<span class="shx-session-item-name">' + escapeHtml(s.nombre) + "</span>" +
                        '<span class="shx-session-item-meta">' + escapeHtml(sessionPlayersLabel(s, self.players)) + " · " + totals.attempts + " tiros</span>" +
                        "</button>"
                    );
                }).join("")
                : '<p class="shx-session-hint">Todavía no hay sesiones registradas.</p>';

            var newFormHtml = this.showNewSessionForm
                ? (
                    '<form id="shx-new-session-form" class="shx-session-form">' +
                    '<div class="shx-session-form-row">' +
                    '<label>Nombre<input type="text" name="nombre" placeholder="Ej: Sesión martes U15" required></label>' +
                    '<label>Fecha<input type="date" name="fecha" value="' + new Date().toISOString().slice(0, 10) + '" required></label>' +
                    "</div>" +
                    '<p class="shx-session-form-label">Jugadores de la sesión</p>' +
                    this.playerPickerHtml([], "shx-new") +
                    '<div class="shx-session-form-actions">' +
                    '<button type="submit" class="toolbar-button toolbar-button-accent">Guardar sesión</button>' +
                    (sessions.length ? '<button type="button" class="toolbar-button" id="shx-cancel-new-session">Cancelar</button>' : "") +
                    "</div></form>"
                )
                : '<button type="button" class="toolbar-button toolbar-button-accent" id="shx-show-new-session">Nueva sesión</button>';

            var activeMetaHtml = active
                ? (
                    '<form id="shx-active-session-form" class="shx-session-form shx-session-form--active">' +
                    '<div class="shx-session-form-row">' +
                    '<label>Nombre<input type="text" name="nombre" value="' + escapeHtml(active.nombre) + '" required></label>' +
                    '<label>Fecha<input type="date" name="fecha" value="' + escapeHtml(active.fecha || "") + '" required></label>' +
                    "</div>" +
                    '<p class="shx-session-form-label">Jugadores asignados</p>' +
                    this.playerPickerHtml(active.player_ids, "shx-active") +
                    '<div class="shx-session-form-actions">' +
                    '<button type="submit" class="toolbar-button">Actualizar sesión</button>' +
                    '<button type="button" class="toolbar-button" id="shx-delete-active-session">Borrar sesión</button>' +
                    "</div></form>"
                )
                : "";

            return (
                '<section class="shx-sessions-card">' +
                '<div class="shx-sessions-head">' +
                "<div><h3>Sesiones de lanzamiento</h3>" +
                "<p>Registrá cada sesión con fecha y asignala a tus jugadores.</p></div>" +
                newFormHtml +
                "</div>" +
                '<div class="shx-session-list">' + listHtml + "</div>" +
                activeMetaHtml +
                "</section>"
            );
        },

        renderSessionsPanel: function () {
            var wrap = this.root && this.root.querySelector(".shx-sessions-card");
            if (!wrap) return;
            var temp = document.createElement("div");
            temp.innerHTML = this.sessionsPanelHtml();
            var next = temp.firstElementChild;
            if (next) wrap.replaceWith(next);
            this.bindSessionsPanel();
        },

        bindSessionsPanel: function () {
            var self = this;

            this.root.querySelectorAll("[data-shx-session-id]").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    self.switchSession(btn.getAttribute("data-shx-session-id"));
                });
            });

            var showBtn = document.getElementById("shx-show-new-session");
            if (showBtn) {
                showBtn.addEventListener("click", function () {
                    self.showNewSessionForm = true;
                    self.renderSessionsPanel();
                });
            }

            var cancelBtn = document.getElementById("shx-cancel-new-session");
            if (cancelBtn) {
                cancelBtn.addEventListener("click", function () {
                    self.showNewSessionForm = false;
                    self.renderSessionsPanel();
                });
            }

            var newForm = document.getElementById("shx-new-session-form");
            if (newForm) {
                newForm.addEventListener("submit", function (ev) {
                    ev.preventDefault();
                    var fd = new FormData(newForm);
                    var playerIds = Array.from(newForm.querySelectorAll('input[name="shx-new-player"]:checked')).map(function (el) {
                        return el.value;
                    });
                    self.createSession({
                        nombre: fd.get("nombre"),
                        fecha: fd.get("fecha"),
                        player_ids: playerIds
                    });
                });
            }

            var activeForm = document.getElementById("shx-active-session-form");
            if (activeForm) {
                activeForm.addEventListener("submit", function (ev) {
                    ev.preventDefault();
                    var fd = new FormData(activeForm);
                    var playerIds = Array.from(activeForm.querySelectorAll('input[name="shx-active-player"]:checked')).map(function (el) {
                        return el.value;
                    });
                    self.updateActiveSessionMeta({
                        nombre: fd.get("nombre"),
                        fecha: fd.get("fecha"),
                        player_ids: playerIds
                    });
                });
            }

            var deleteBtn = document.getElementById("shx-delete-active-session");
            if (deleteBtn) {
                deleteBtn.addEventListener("click", function () {
                    var active = self.getActiveSession();
                    if (active) self.deleteSession(active.id);
                });
            }

            this.root.querySelectorAll("[data-shx-goto-players]").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    if (typeof global.loadContent === "function") global.loadContent("player_tracking");
                });
            });
        },

        getZoneStats: function (zoneId) {
            return zoneStats(this.state, zoneId);
        },

        render: function () {
            this.players = loadPlayers();
            var state = this.state;
            var active = this.getActiveSession();
            var hasSession = !!active;
            var sessionNotice = hasSession
                ? '<p class="shx-active-session-banner">Sesión activa: <strong>' + escapeHtml(active.nombre) + "</strong> · " + escapeHtml(formatSessionFecha(active.fecha)) + " · " + escapeHtml(sessionPlayersLabel(active, this.players)) + "</p>"
                : '<p class="shx-active-session-banner shx-active-session-banner--warn">Creá o seleccioná una sesión para registrar lanzamientos.</p>';

            this.root.innerHTML =
                '<div class="shx-wrap">' +
                this.sessionsPanelHtml() +
                '<header class="shx-header">' +
                "<h2>Entrenamiento de tiro</h2>" +
                "<p>Mapa por zonas con registro por sesión y jugadores asignados.</p>" +
                '<p class="shx-build-tag">Versión: sesiones con jugadores</p>' +
                sessionNotice +
                '<div class="shx-legend">' +
                '<span><i style="background:#ef5350"></i> &lt;40%</span>' +
                '<span><i style="background:#fbc02d"></i> 40–60%</span>' +
                '<span><i style="background:#66bb6a"></i> &gt;60%</span>' +
                '<span><i style="background:#6b7280"></i> Sin tiros</span>' +
                "</div></header>" +
                '<div class="shx-layout' + (hasSession ? "" : " shx-layout--disabled") + '">' +
                '<section class="shx-court-col">' +
                '<div id="shx-court-map"></div>' +
                "</section>" +
                '<section class="shx-side-col">' +
                '<aside class="shx-panel">' +
                '<p class="shx-panel-title" id="shx-panel-title">Seleccioná una zona para cargar tiros</p>' +
                '<div class="shx-panel-actions" id="shx-panel-actions" hidden>' +
                '<button type="button" class="shx-btn shx-btn-make" id="shx-btn-made">Encestado</button>' +
                '<button type="button" class="shx-btn shx-btn-miss" id="shx-btn-miss">Fallado</button>' +
                "</div></aside>" +
                '<div class="shx-zone-chip-grid">' + zoneButtonsHtml(state) + "</div>" +
                '<div class="shx-card">' +
                "<h3>Estadísticas por zona</h3>" +
                '<table class="shx-table"><thead><tr><th>Zona</th><th>Int.</th><th>Enc.</th><th>%</th><th>Volumen</th></tr></thead>' +
                '<tbody id="shx-tbody">' + statsTableRows(state) + "</tbody></table>" +
                '<p class="shx-total" id="shx-total"></p>' +
                "</div>" +
                '<div class="shx-card">' +
                "<h3>Plan automático</h3>" +
                "<p>Más tiros en zonas débiles, menos en zonas fuertes.</p>" +
                '<div class="shx-workout-row">' +
                '<label for="shx-workout-total">Tiros totales</label>' +
                '<input type="number" id="shx-workout-total" min="18" max="250" value="60" />' +
                '<button type="button" class="toolbar-button toolbar-button-accent" id="shx-btn-workout">Generar plan</button>' +
                "</div>" +
                '<ul class="shx-workout-list" id="shx-workout-list"></ul>' +
                "</div>" +
                '<div class="shx-toolbar">' +
                '<button type="button" class="toolbar-button" id="shx-btn-reset"' + (hasSession ? "" : " disabled") + '>Reiniciar sesión activa</button>' +
                "</div></section></div></div>";

            this.courtMap = new global.BasketballCourtMap({
                root: document.getElementById("shx-court-map"),
                zones: ZONES,
                selectedId: this.selectedId,
                getStats: this.getZoneStats.bind(this),
                onSelect: this.selectZone.bind(this)
            });
            this.courtMap.render();
            this.updateTotalLine();
        },

        updateTotalLine: function () {
            var ta = 0;
            var tm = 0;
            var self = this;
            ZONES.forEach(function (z) {
                var s = self.getZoneStats(z.id);
                ta += s.attempts;
                tm += s.made;
            });
            var el = document.getElementById("shx-total");
            if (el) {
                el.innerHTML = "<strong>Total:</strong> " + ta + " intentos · " + tm + " encestados · " + pctLabel(ta, tm) + " global";
            }
        },

        refreshSessionListMeta: function () {
            var self = this;
            if (!this.root) return;
            this.root.querySelectorAll("[data-shx-session-id]").forEach(function (btn) {
                var sessionId = btn.getAttribute("data-shx-session-id");
                var session = self.payload.sessions.find(function (s) { return s.id === sessionId; });
                if (!session) return;
                var zones = session.id === self.payload.active_session_id ? self.state : session.zones;
                var totals = sessionTotalShots(zones);
                var meta = btn.querySelector(".shx-session-item-meta");
                if (meta) {
                    meta.textContent = sessionPlayersLabel(session, self.players) + " · " + totals.attempts + " tiros";
                }
            });
        },

        refreshTableRow: function (zoneId) {
            var row = this.root.querySelector('tr[data-zone-row="' + zoneId + '"]');
            if (!row) return;
            var s = this.getZoneStats(zoneId);
            var maxA = maxAttempts(this.state);
            var vol = Math.max(6, Math.round((s.attempts / maxA) * 100));
            row.cells[1].textContent = s.attempts;
            row.cells[2].textContent = s.made;
            row.cells[3].textContent = pctLabel(s.attempts, s.made);
            var bar = row.querySelector(".shx-vol span");
            if (bar) bar.style.width = vol + "%";
        },

        refreshZoneChip: function (zoneId) {
            var chip = this.root.querySelector('[data-zone-btn="' + zoneId + '"]');
            if (!chip) return;
            var s = this.getZoneStats(zoneId);
            var meta = chip.querySelector(".shx-zone-chip-meta");
            if (meta) meta.textContent = s.attempts + " int · " + s.made + " enc · " + pctLabel(s.attempts, s.made);
        },

        selectZone: function (zoneId) {
            if (!this.getActiveSession()) return;
            this.selectedId = zoneId;
            this.courtMap.setSelected(zoneId);
            this.root.querySelectorAll('[data-zone-btn]').forEach(function (btn) {
                btn.classList.toggle("shx-zone-chip--sel", btn.getAttribute("data-zone-btn") === zoneId);
            });
            this.root.querySelectorAll('tr[data-zone-row]').forEach(function (row) {
                row.classList.toggle("shx-table-row--sel", row.getAttribute("data-zone-row") === zoneId);
            });
            var z = ZONES.find(function (zone) { return zone.id === zoneId; });
            var title = document.getElementById("shx-panel-title");
            var actions = document.getElementById("shx-panel-actions");
            if (title) title.textContent = z ? z.label + " · Registrá el resultado" : "Seleccioná una zona para cargar tiros";
            if (actions) actions.hidden = !z;
        },

        record: function (zoneId, made) {
            if (!zoneId || !this.getActiveSession()) return;
            var s = this.getZoneStats(zoneId);
            s.attempts += 1;
            if (made) s.made += 1;
            this.state[zoneId] = { attempts: s.attempts, made: s.made };
            this.persistActiveSessionZones();
            this.courtMap.updateZone(zoneId);
            this.refreshTableRow(zoneId);
            this.refreshZoneChip(zoneId);
            this.updateTotalLine();
            this.refreshSessionListMeta();
        },

        bind: function () {
            var self = this;

            this.bindSessionsPanel();

            if (!this.getActiveSession()) return;

            this.root.querySelectorAll('[data-zone-btn]').forEach(function (btn) {
                btn.addEventListener("click", function () {
                    self.selectZone(btn.getAttribute("data-zone-btn"));
                });
            });

            this.root.querySelectorAll('tr[data-zone-row]').forEach(function (row) {
                row.addEventListener("click", function () {
                    self.selectZone(row.getAttribute("data-zone-row"));
                });
            });

            document.getElementById("shx-btn-made").addEventListener("click", function () {
                if (self.selectedId) self.record(self.selectedId, true);
            });
            document.getElementById("shx-btn-miss").addEventListener("click", function () {
                if (self.selectedId) self.record(self.selectedId, false);
            });

            document.getElementById("shx-btn-workout").addEventListener("click", function () {
                var n = parseInt(document.getElementById("shx-workout-total").value, 10) || 60;
                var plan = generateWorkoutPlan(self.state, n);
                var ul = document.getElementById("shx-workout-list");
                ul.innerHTML = plan.map(function (item) {
                    return "<li><strong>" + escapeHtml(item.zone.label) + "</strong>: " + item.shots + " tiros sugeridos</li>";
                }).join("");
            });

            document.getElementById("shx-btn-reset").addEventListener("click", function () {
                self.resetActiveSessionStats();
            });
        }
    };

    global.ShootingHeatmap = ShootingHeatmap;
})(typeof window !== "undefined" ? window : this);
