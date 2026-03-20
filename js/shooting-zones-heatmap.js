/**
 * Entrenamiento de tiro — mapa de media cancha por capas (layering).
 * Componente autocontenido: ShootingHeatmap.init(elemento)
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

    function loadState() {
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
        return sanitizeState(base);
    }

    function saveState(state) {
        if (global.BasketLabDataSync && typeof global.BasketLabDataSync.saveData === "function") {
            global.BasketLabDataSync.saveData("shooting_heatmap", state);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
        state: {},
        selectedId: null,
        courtMap: null,

        init: function (el) {
            if (!el) return;
            this.root = el;
            this.state = loadState();
            this.selectedId = null;
            this.render();
            this.bind();
        },

        getZoneStats: function (zoneId) {
            return zoneStats(this.state, zoneId);
        },

        render: function () {
            var state = this.state;
            this.root.innerHTML =
                '<div class="shx-wrap">' +
                '<header class="shx-header">' +
                "<h2>Entrenamiento de tiro</h2>" +
                "<p>UI por capas: cancha clara, zonas táctiles y estadísticas de lectura rápida.</p>" +
                '<div class="shx-legend">' +
                '<span><i style="background:#ef5350"></i> &lt;40%</span>' +
                '<span><i style="background:#fbc02d"></i> 40–60%</span>' +
                '<span><i style="background:#66bb6a"></i> &gt;60%</span>' +
                '<span><i style="background:#6b7280"></i> Sin tiros</span>' +
                "</div></header>" +
                '<div class="shx-layout">' +
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
                '<button type="button" class="toolbar-button" id="shx-btn-reset">Reiniciar estadísticas</button>' +
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
            if (!zoneId) return;
            var s = this.getZoneStats(zoneId);
            s.attempts += 1;
            if (made) s.made += 1;
            this.state[zoneId] = { attempts: s.attempts, made: s.made };
            saveState(this.state);
            this.courtMap.updateZone(zoneId);
            this.refreshTableRow(zoneId);
            this.refreshZoneChip(zoneId);
            this.updateTotalLine();
        },

        bind: function () {
            var self = this;

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
                if (!confirm("¿Borrar todas las estadísticas de tiro?")) return;
                self.state = sanitizeState({});
                saveState(self.state);
                self.selectedId = null;
                self.render();
                self.bind();
            });
        }
    };

    global.ShootingHeatmap = ShootingHeatmap;
})(typeof window !== "undefined" ? window : this);
