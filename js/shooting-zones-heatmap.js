/**
 * Entrenamiento de tiro — 7 zonas con mapa de calor y plan automático.
 * Componente autocontenido: ShootingHeatmap.init(elemento)
 */
(function (global) {
    "use strict";

    var STORAGE_KEY = "basketLab_shootingHeatmap7";

    /**
     * viewBox 520×300 — media cancha horizontal (aro a la izquierda).
     * Sectores alineados a línea de 3, pintura y clave.
     */
    var ZONES = [
        {
            id: "paint",
            label: "Pintura (debajo del aro)",
            short: "PINTURA",
            path: "M 20 126 L 100 126 L 100 174 L 20 174 Z",
            lx: 60,
            ly: 148,
            px: 60,
            py: 162
        },
        {
            id: "mid_l",
            label: "Media distancia izquierda",
            short: "MEDIA IZQ.",
            path: "M 102 108 L 224 102 L 224 198 L 102 192 Z",
            lx: 163,
            ly: 145,
            px: 163,
            py: 160
        },
        {
            id: "mid_c",
            label: "Media distancia centro",
            short: "MEDIA EJE",
            path: "M 226 104 L 278 104 L 276 196 L 228 196 Z",
            lx: 252,
            ly: 145,
            px: 252,
            py: 160
        },
        {
            id: "mid_r",
            label: "Media distancia derecha",
            short: "MEDIA DER.",
            path: "M 280 102 L 314 108 L 314 192 L 280 196 Z",
            lx: 297,
            ly: 145,
            px: 297,
            py: 160
        },
        {
            id: "t3_corner_l",
            label: "Triple esquina izquierda",
            short: "3 ESQ. ↑",
            path: "M 268 20 L 505 20 L 505 86 L 314 86 Z",
            lx: 390,
            ly: 48,
            px: 390,
            py: 64
        },
        {
            id: "t3_front",
            label: "Triple frontal",
            short: "3 FRONTAL",
            path: "M 314 88 L 502 88 L 502 212 L 314 212 Z",
            lx: 408,
            ly: 142,
            px: 408,
            py: 158
        },
        {
            id: "t3_corner_r",
            label: "Triple esquina derecha",
            short: "3 ESQ. ↓",
            path: "M 314 214 L 505 214 L 505 280 L 268 280 L 268 268 L 314 214 Z",
            lx: 390,
            ly: 238,
            px: 390,
            py: 254
        }
    ];

    function loadState() {
        if (global.BasketLabDataSync && typeof global.BasketLabDataSync.loadData === "function") {
            var cloudBacked = global.BasketLabDataSync.loadData("shooting_heatmap");
            if (cloudBacked && typeof cloudBacked === "object") return cloudBacked;
        }
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return {};
            var o = JSON.parse(raw);
            return o && typeof o === "object" ? o : {};
        } catch (e) {
            return {};
        }
    }

    function saveState(state) {
        if (global.BasketLabDataSync && typeof global.BasketLabDataSync.saveData === "function") {
            global.BasketLabDataSync.saveData("shooting_heatmap", state);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function zoneStats(state, zoneId) {
        var z = state[zoneId];
        var a = z && typeof z.attempts === "number" ? z.attempts : 0;
        var m = z && typeof z.made === "number" ? z.made : 0;
        a = Math.max(0, a);
        m = Math.min(Math.max(0, m), a);
        return { attempts: a, made: m };
    }

    function pctValue(attempts, made) {
        if (!attempts) return null;
        return (made / attempts) * 100;
    }

    function pctLabel(attempts, made) {
        if (!attempts) return "—";
        return ((made / attempts) * 100).toFixed(1) + "%";
    }

    /**
     * Rojo <40%, Amarillo 40–60%, Verde >60%. Sin tiros: gris.
     */
    function heatFill(attempts, made) {
        if (!attempts) return "rgba(255, 255, 255, 0.14)";
        var p = made / attempts;
        if (p < 0.4) return "rgba(229, 57, 53, 0.52)";
        if (p <= 0.6) return "rgba(255, 202, 40, 0.5)";
        return "rgba(67, 160, 71, 0.52)";
    }

    function courtSvgPaths() {
        return (
            "<defs>" +
            '<linearGradient id="shWood" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#e0c49a"/>' +
            '<stop offset="45%" stop-color="#c9a06d"/>' +
            '<stop offset="100%" stop-color="#a88252"/>' +
            "</linearGradient>" +
            '<filter id="shCourtSh" x="-8%" y="-8%" width="116%" height="116%">' +
            '<feDropShadow dx="0" dy="4" stdDeviation="5" flood-opacity="0.22"/>' +
            "</filter>" +
            "</defs>" +
            '<rect x="4" y="4" width="512" height="292" rx="18" fill="url(#shWood)" filter="url(#shCourtSh)"/>' +
            '<rect x="18" y="124" width="86" height="52" rx="2" fill="rgba(214, 232, 250, 0.72)" stroke="none"/>' +
            '<line class="sh-line" x1="18" y1="10" x2="18" y2="290" />' +
            '<line class="sh-line" x1="18" y1="10" x2="502" y2="10" />' +
            '<line class="sh-line" x1="18" y1="290" x2="502" y2="290" />' +
            '<line class="sh-line sh-line-dash" x1="498" y1="10" x2="498" y2="290" />' +
            '<path class="sh-line" d="M 18 32 L 268 32 Q 395 150 268 268 L 18 268" fill="none" />' +
            '<rect class="sh-line-rect" x="18" y="124" width="86" height="52" fill="none" />' +
            '<line class="sh-line" x1="104" y1="124" x2="104" y2="176" />' +
            '<circle class="sh-ft-ring" cx="104" cy="150" r="28" fill="none" />' +
            '<line class="sh-line-thin" x1="104" y1="168" x2="104" y2="132" />' +
            '<circle class="sh-hoop-ring" cx="36" cy="150" r="9" fill="#fff8e7" stroke="#c62828" stroke-width="2.5"/>' +
            '<circle class="sh-hoop-dot" cx="36" cy="150" r="3" fill="#c62828"/>'
        );
    }

    function zonePathsHtml(state) {
        var html = "";
        ZONES.forEach(function (z) {
            var s = zoneStats(state, z.id);
            var pctStr =
                s.attempts > 0 ? Math.round((s.made / s.attempts) * 100) + "%" : "—";
            html +=
                '<g class="sh-zone-g" data-zone="' +
                z.id +
                '" tabindex="0" role="button" aria-label="' +
                String(z.label).replace(/"/g, "") +
                '">' +
                '<path class="sh-zone-shape" d="' +
                z.path +
                '" fill="' +
                heatFill(s.attempts, s.made) +
                '" />' +
                '<text class="sh-zone-lbl" x="' +
                z.lx +
                '" y="' +
                z.ly +
                '" text-anchor="middle">' +
                z.short +
                "</text>" +
                '<text class="sh-zone-pct" x="' +
                z.px +
                '" y="' +
                z.py +
                '" text-anchor="middle">' +
                pctStr +
                "</text>" +
                "</g>";
        });
        return html;
    }

    function statsTableRows(state) {
        var rows = "";
        ZONES.forEach(function (z) {
            var s = zoneStats(state, z.id);
            rows +=
                "<tr data-zone-row=\"" +
                z.id +
                "\">" +
                "<td>" +
                escapeHtml(z.label) +
                "</td>" +
                "<td>" +
                s.attempts +
                "</td>" +
                "<td>" +
                s.made +
                "</td>" +
                "<td class=\"sh-pct\">" +
                pctLabel(s.attempts, s.made) +
                "</td></tr>";
        });
        return rows;
    }

    function escapeHtml(str) {
        var d = document.createElement("div");
        d.textContent = str == null ? "" : String(str);
        return d.innerHTML;
    }

    /**
     * Zonas con bajo % o sin datos → más tiros; zonas con buen % → menos.
     */
    function generateWorkoutPlan(state, totalShots) {
        totalShots = Math.max(14, Math.min(200, Math.floor(Number(totalShots) || 50)));
        var weights = ZONES.map(function (z) {
            var s = zoneStats(state, z.id);
            var p = pctValue(s.attempts, s.made);
            if (s.attempts === 0) return 20;
            if (p < 40) return 18;
            if (p <= 60) return 10;
            return 4;
        });
        var sumW = weights.reduce(function (a, b) {
            return a + b;
        }, 0);
        var plan = [];
        var acc = 0;
        for (var i = 0; i < ZONES.length; i++) {
            var sh = Math.floor((totalShots * weights[i]) / sumW);
            if (sh < 1) sh = 1;
            plan.push({ zone: ZONES[i], shots: sh });
            acc += sh;
        }
        var d = totalShots - acc;
        var prio = ZONES.map(function (_, i) {
            return i;
        });
        prio.sort(function (a, b) {
            return weights[b] - weights[a];
        });
        var pi = 0;
        while (d > 0) {
            plan[prio[pi % prio.length]].shots++;
            pi++;
            d--;
        }
        while (d < 0) {
            var bk = 0;
            for (var k = 1; k < plan.length; k++) {
                if (plan[k].shots > plan[bk].shots) bk = k;
            }
            if (plan[bk].shots > 1) plan[bk].shots--;
            d++;
        }
        return plan;
    }

    var ShootingHeatmap = {
        root: null,
        state: {},
        selectedId: null,

        init: function (el) {
            if (!el) return;
            this.root = el;
            this.state = loadState();
            this.selectedId = null;
            this.render();
            this.bind();
        },

        render: function () {
            var self = this;
            var state = this.state;
            this.root.innerHTML =
                '<div class="sh-wrap">' +
                '<header class="sh-header">' +
                "<h2>Entrenamiento por zonas (7 sectores)</h2>" +
                "<p>Tocá una zona en la cancha y registrá con <strong>Encestado</strong> o <strong>Fallado</strong>.</p>" +
                '<div class="sh-legend">' +
                '<span><i style="background:rgba(244,67,54,0.65)"></i> Rojo &lt;40%</span>' +
                '<span><i style="background:rgba(255,193,7,0.65)"></i> Amarillo 40–60%</span>' +
                '<span><i style="background:rgba(76,175,80,0.65)"></i> Verde &gt;60%</span>' +
                '<span><i style="background:rgba(158,158,158,0.5)"></i> Sin tiros</span>' +
                "</div></header>" +
                '<div class="sh-layout">' +
                '<div class="sh-court-col">' +
                '<div class="sh-svg-box">' +
                '<svg class="sh-svg" viewBox="0 0 520 300" xmlns="http://www.w3.org/2000/svg" aria-label="Media cancha">' +
                courtSvgPaths() +
                zonePathsHtml(state) +
                "</svg></div>" +
                '<aside class="sh-panel" id="sh-panel">' +
                '<p class="sh-panel-title" id="sh-panel-title">Seleccioná una zona</p>' +
                '<div class="sh-panel-actions" id="sh-panel-actions" hidden>' +
                '<button type="button" class="sh-btn sh-btn-make" id="sh-btn-made">Encestado</button>' +
                '<button type="button" class="sh-btn sh-btn-miss" id="sh-btn-miss">Fallado</button>' +
                "</div></aside></div>" +
                '<div class="sh-side-col">' +
                '<div class="sh-stats-card">' +
                "<h3>Estadísticas</h3>" +
                '<table class="sh-table"><thead><tr><th>Zona</th><th>Intentos</th><th>Encastados</th><th>%</th></tr></thead>' +
                "<tbody id=\"sh-tbody\">" +
                statsTableRows(state) +
                "</tbody></table>" +
                '<p class="sh-total" id="sh-total"></p>' +
                "</div>" +
                '<div class="sh-workout-card">' +
                "<h3>Plan automático</h3>" +
                "<p>Zonas flojas → más tiros sugeridos. Zonas fuertes → menos.</p>" +
                '<div class="sh-workout-row">' +
                '<label for="sh-workout-total">Tiros totales</label>' +
                '<input type="number" id="sh-workout-total" min="14" max="200" value="50" />' +
                '<button type="button" class="toolbar-button toolbar-button-accent" id="sh-btn-workout">Generar plan</button>' +
                "</div>" +
                '<ul class="sh-workout-list" id="sh-workout-list"></ul>' +
                "</div>" +
                '<div class="sh-toolbar">' +
                '<button type="button" class="toolbar-button" id="sh-btn-reset">Reiniciar estadísticas</button>' +
                "</div></div></div></div>";

            this.updateTotalLine();
        },

        updateTotalLine: function () {
            var ta = 0;
            var tm = 0;
            var self = this;
            ZONES.forEach(function (z) {
                var s = zoneStats(self.state, z.id);
                ta += s.attempts;
                tm += s.made;
            });
            var el = document.getElementById("sh-total");
            if (el) {
                el.innerHTML =
                    "<strong>Total:</strong> " +
                    ta +
                    " intentos · " +
                    tm +
                    " encestos · " +
                    pctLabel(ta, tm) +
                    " global";
            }
        },

        refreshZoneVisual: function (zoneId) {
            var g = this.root.querySelector('.sh-zone-g[data-zone="' + zoneId + '"]');
            if (!g) return;
            var path = g.querySelector(".sh-zone-shape");
            var pctEl = g.querySelector(".sh-zone-pct");
            var s = zoneStats(this.state, zoneId);
            if (path) path.setAttribute("fill", heatFill(s.attempts, s.made));
            if (pctEl) {
                pctEl.textContent =
                    s.attempts > 0 ? Math.round((s.made / s.attempts) * 100) + "%" : "—";
            }
        },

        refreshTableRow: function (zoneId) {
            var row = this.root.querySelector('tr[data-zone-row="' + zoneId + '"]');
            if (!row) return;
            var s = zoneStats(this.state, zoneId);
            row.cells[1].textContent = s.attempts;
            row.cells[2].textContent = s.made;
            row.cells[3].textContent = pctLabel(s.attempts, s.made);
            row.cells[3].className = "sh-pct";
        },

        selectZone: function (zoneId) {
            this.selectedId = zoneId;
            var z = null;
            for (var zi = 0; zi < ZONES.length; zi++) {
                if (ZONES[zi].id === zoneId) {
                    z = ZONES[zi];
                    break;
                }
            }
            this.root.querySelectorAll(".sh-zone-g").forEach(function (g) {
                g.classList.toggle("sh-zone-g--sel", g.getAttribute("data-zone") === zoneId);
            });
            var title = document.getElementById("sh-panel-title");
            var actions = document.getElementById("sh-panel-actions");
            if (z && title) {
                title.textContent = z.label;
            }
            if (actions) {
                actions.hidden = !z;
            }
        },

        record: function (zoneId, made) {
            if (!zoneId) return;
            var s = zoneStats(this.state, zoneId);
            s.attempts += 1;
            if (made) s.made += 1;
            this.state[zoneId] = { attempts: s.attempts, made: s.made };
            saveState(this.state);
            this.refreshZoneVisual(zoneId);
            this.refreshTableRow(zoneId);
            this.updateTotalLine();
        },

        bind: function () {
            var self = this;
            this.root.querySelectorAll(".sh-zone-g").forEach(function (g) {
                g.addEventListener("click", function () {
                    self.selectZone(g.getAttribute("data-zone"));
                });
                g.addEventListener("keydown", function (ev) {
                    if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        self.selectZone(g.getAttribute("data-zone"));
                    }
                });
                g.style.cursor = "pointer";
            });

            document.getElementById("sh-btn-made").addEventListener("click", function () {
                if (self.selectedId) self.record(self.selectedId, true);
            });
            document.getElementById("sh-btn-miss").addEventListener("click", function () {
                if (self.selectedId) self.record(self.selectedId, false);
            });

            document.getElementById("sh-btn-workout").addEventListener("click", function () {
                var n = parseInt(document.getElementById("sh-workout-total").value, 10) || 50;
                var plan = generateWorkoutPlan(self.state, n);
                var ul = document.getElementById("sh-workout-list");
                ul.innerHTML = plan
                    .map(function (item) {
                        return (
                            "<li><strong>" +
                            escapeHtml(item.zone.label) +
                            "</strong>: " +
                            item.shots +
                            " tiros sugeridos</li>"
                        );
                    })
                    .join("");
            });

            document.getElementById("sh-btn-reset").addEventListener("click", function () {
                if (!confirm("¿Borrar todas las estadísticas de estas 7 zonas?")) return;
                self.state = {};
                saveState(self.state);
                self.selectedId = null;
                self.render();
                self.bind();
            });
        }
    };

    global.ShootingHeatmap = ShootingHeatmap;
})(typeof window !== "undefined" ? window : this);
