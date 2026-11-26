/*
 * BasketIQ · "Analizar con mi Asistente IA" desde Basket Lab Academy
 *
 * window.BasketAssistantBridge
 * - open(opts): abre la ventana de consulta con el contexto elegido
 *   (guía, ejercicio o momento del simulador), la categoría y las condiciones.
 * - Envía al servidor solo identificadores y condiciones: el contenido educativo,
 *   las fuentes y el resumen de la categoría se arman en el servidor.
 * - Gemini se usa únicamente cuando el entrenador envía la pregunta.
 *
 * Las funciones puras (renderMarkdown, buildPayload, suggestionsFor) se prueban desde Node.
 */
(function (root, factory) {
    var api = factory(root);
    if (typeof module === "object" && module.exports) module.exports = api;
    if (root) root.BasketAssistantBridge = api;
})(typeof window !== "undefined" ? window : null, function (root) {
    "use strict";

    var MAX_CHARS = 4000;
    var MODES = [
        ["tecnico", "Asistente técnico", "Respuestas prácticas para aplicar."],
        ["debate", "Debate técnico", "Ventajas, riesgos y alternativas."],
        ["planificador", "Planificador", "Sesiones con tiempos y ejercicios."]
    ];

    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    /** Markdown básico y seguro: todo se escapa antes de dar formato. */
    function inline(text) {
        return esc(text)
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    }

    function renderMarkdown(md) {
        var lines = String(md || "").replace(/\r/g, "").split("\n");
        var html = [];
        var list = null;
        var para = [];
        var table = null;
        function flushPara() {
            if (para.length) html.push("<p>" + para.map(inline).join("<br>") + "</p>");
            para = [];
        }
        function flushList() {
            if (list) html.push("<" + list.tag + ">" + list.items.map(function (i) { return "<li>" + inline(i) + "</li>"; }).join("") + "</" + list.tag + ">");
            list = null;
        }
        function flushTable() {
            if (table) {
                var rows = table.filter(function (r) { return !/^\s*\|?\s*:?-{2,}/.test(r.join("|")); });
                var head = rows.shift() || [];
                html.push('<div class="ai-table"><table><thead><tr>' + head.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
                    rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>");
            }
            table = null;
        }
        function flushAll() { flushPara(); flushList(); flushTable(); }
        lines.forEach(function (raw) {
            var line = raw.trimEnd();
            var m;
            if (!line.trim()) { flushAll(); return; }
            if (/^\s*\|.*\|\s*$/.test(line)) {
                flushPara(); flushList();
                table = table || [];
                table.push(line.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); }));
                return;
            }
            flushTable();
            if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
                flushAll();
                var level = Math.min(5, m[1].length + 2);
                html.push("<h" + level + ">" + inline(m[2]) + "</h" + level + ">");
            } else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
                flushPara();
                if (!list || list.tag !== "ul") { flushList(); list = { tag: "ul", items: [] }; }
                list.items.push(m[1]);
            } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
                flushPara();
                if (!list || list.tag !== "ol") { flushList(); list = { tag: "ol", items: [] }; }
                list.items.push(m[1]);
            } else {
                flushList();
                para.push(line.trim());
            }
        });
        flushAll();
        return html.join("");
    }

    /** Preguntas de ejemplo según desde dónde se consulta. */
    function suggestionsFor(ctx) {
        var title = (ctx.article && ctx.article.title) || "este contenido";
        if (ctx.exercise) {
            return [
                "Adaptá este ejercicio a mis condiciones y decime qué cambia.",
                "¿Qué errores debería corregir primero y cómo lo explico?",
                "¿Qué ejercicio previo y cuál posterior me recomendás?"
            ];
        }
        if (ctx.variantId) {
            return [
                "¿Por qué se mueve así cada defensor en esta situación?",
                "¿Qué opciones tiene el ataque acá y cuál conviene entrenar primero?",
                "¿Cómo convierto esta situación en un ejercicio para mi categoría?"
            ];
        }
        return [
            "¿Cómo puedo enseñar " + title.toLowerCase() + " a mi equipo con mis condiciones?",
            "¿Qué ventajas y riesgos tiene usar esto con mi categoría?",
            "Armame una progresión de tres entrenamientos sobre este tema."
        ];
    }

    /** Arma el cuerpo del pedido: identificadores, categoría y condiciones; nunca contenido. */
    function buildPayload(ctx, values) {
        var num = function (v) { return v === "" || v == null ? null : Number(v); };
        var cond = {
            players: num(values.players),
            court: values.court || null,
            hoops: num(values.hoops),
            minutes: num(values.minutes),
            materials: values.materials || []
        };
        var hasCond = cond.players != null || cond.court || cond.hoops != null || cond.minutes != null || cond.materials.length;
        var academy = { articleId: ctx.article.id };
        if (ctx.exercise) academy.exerciseId = ctx.exercise.id;
        if (ctx.variantId && ctx.positionId) {
            academy.variantId = ctx.variantId;
            academy.positionId = ctx.positionId;
        }
        if (values.categoria) academy.categoria = values.categoria;
        if (hasCond) academy.conditions = cond;
        var body = { action: "send", mode: values.mode || "tecnico", text: String(values.text || "").trim(), academy: academy };
        if (values.conversationId) body.conversationId = values.conversationId;
        return body;
    }

    function contextItems(ctx) {
        var a = ctx.article;
        var items = ["Guía «" + a.title + "»: contenido de Aprender con la procedencia de cada parte."];
        if (ctx.exercise) items.push("Ejercicio «" + ctx.exercise.name + "» y la revisión de compatibilidad con tus condiciones.");
        if (ctx.variantId && a.simulator) {
            var v = (a.simulator.variants || []).filter(function (x) { return x.id === ctx.variantId; })[0];
            var p = (a.simulator.positions || []).filter(function (x) { return x.id === ctx.positionId; })[0];
            if (v && p) items.push("Simulador: " + v.label + " · " + p.label + ".");
        }
        items.push((a.sources || []).length + " fuentes verificadas" + ((a.unavailableSources || []).length ? " y las que no se pudieron consultar." : "."));
        return items;
    }

    // ------------------------------------------------------------------
    // Interfaz
    // ------------------------------------------------------------------
    function open(opts) {
        if (!root || !root.document) return null;
        var doc = root.document;
        var ctx = opts || {};
        var host = ctx.host || {};
        var categories = (host.getCategories ? host.getCategories() : []) || [];
        var state = { conversationId: null, busy: false, controller: null };

        var overlay = doc.createElement("div");
        overlay.className = "tb-modal ai-modal";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-labelledby", "ai-modal-title");
        var mats = ["Balones", "Conos"];
        if (ctx.exercise && ctx.exercise.meta) {
            (ctx.exercise.meta.materials || []).concat(ctx.exercise.meta.optionalMaterials || []).forEach(function (m) { if (mats.indexOf(m) < 0) mats.push(m); });
        }
        overlay.innerHTML =
            '<div class="tb-modal-card ai-card">' +
            '<div class="ai-head"><h3 class="tb-modal-title" id="ai-modal-title">Analizar con mi Asistente IA</h3>' +
            '<button type="button" class="tb-btn tb-btn--small" data-close aria-label="Cerrar">✕</button></div>' +
            '<details class="ai-context" open><summary>Qué va a recibir el asistente</summary><ul>' +
            contextItems(ctx).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") +
            '<li class="ai-cat-note">Sin categoría elegida.</li>' +
            "</ul><p class=\"ac-muted\">Del equipo solo se envía un resumen de la planificación y de los entrenamientos guardados de la categoría, sin nombres de jugadores ni notas.</p></details>" +
            '<form class="ai-form">' +
            '<div class="tb-field-row">' +
            '<div class="tb-field"><span>Categoría o equipo</span><select name="categoria"><option value="">Sin categoría</option>' +
            categories.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("") + "</select></div>" +
            '<div class="tb-field"><span>Modo</span><select name="mode">' +
            MODES.map(function (m) { return '<option value="' + m[0] + '"' + ((ctx.exercise ? "planificador" : "tecnico") === m[0] ? " selected" : "") + ">" + esc(m[1]) + "</option>"; }).join("") + "</select></div>" +
            "</div>" +
            '<fieldset class="exl-cond ai-cond"><legend>Condiciones de trabajo (opcional)</legend>' +
            '<div class="tb-field-row"><div class="tb-field"><span>Jugadores</span><input type="number" min="1" max="60" name="players" inputmode="numeric"></div>' +
            '<div class="tb-field"><span>Espacio</span><select name="court"><option value="">Sin indicar</option><option value="half">Media cancha</option><option value="full">Cancha completa</option></select></div>' +
            '<div class="tb-field"><span>Aros</span><input type="number" min="0" max="12" name="hoops" inputmode="numeric"></div>' +
            '<div class="tb-field"><span>Minutos</span><input type="number" min="1" max="300" name="minutes" inputmode="numeric"></div></div>' +
            '<div class="exl-mats">' + mats.map(function (m) {
                return '<label class="exl-check"><input type="checkbox" name="materials" value="' + esc(m) + '"> ' + esc(m) + "</label>";
            }).join("") + "</div>" +
            '<p class="ac-muted ai-cond-note"></p>' +
            "</fieldset>" +
            '<div class="ai-suggest" role="group" aria-label="Preguntas de ejemplo">' +
            suggestionsFor(ctx).map(function (s) { return '<button type="button" class="ai-chip" data-suggest="' + esc(s) + '">' + esc(s) + "</button>"; }).join("") + "</div>" +
            '<div class="tb-field"><span>Tu pregunta</span><textarea name="text" rows="3" maxlength="' + MAX_CHARS + '" placeholder="Ej: ¿Cómo puedo enseñar esto a mi equipo U15 teniendo solamente media cancha los miércoles?"></textarea></div>' +
            '<div class="ai-error" role="alert" hidden></div>' +
            '<div class="tb-modal-actions"><button type="button" class="tb-btn" data-close>Cerrar</button>' +
            '<button type="submit" class="tb-btn tb-btn--accent" data-send>Enviar al asistente</button></div>' +
            "</form>" +
            '<section class="ai-answer" aria-live="polite" hidden></section>' +
            "</div>";
        doc.body.appendChild(overlay);

        var form = overlay.querySelector(".ai-form");
        var answer = overlay.querySelector(".ai-answer");
        var errorBox = overlay.querySelector(".ai-error");
        var sendBtn = overlay.querySelector("[data-send]");
        var catNote = overlay.querySelector(".ai-cat-note");
        var condNote = overlay.querySelector(".ai-cond-note");

        function close() {
            if (state.controller) state.controller.abort();
            doc.removeEventListener("keydown", onKey);
            overlay.remove();
            if (ctx.returnFocus && ctx.returnFocus.focus) ctx.returnFocus.focus();
        }
        function onKey(e) { if (e.key === "Escape" && !state.busy) close(); }
        doc.addEventListener("keydown", onKey);
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay && !state.busy) close();
            if (e.target.closest("[data-close]")) close();
            var chip = e.target.closest("[data-suggest]");
            if (chip) {
                form.elements.text.value = chip.getAttribute("data-suggest");
                form.elements.text.focus();
            }
        });

        function setConditions(c) {
            c = c || {};
            form.elements.players.value = c.jugadores != null ? c.jugadores : "";
            form.elements.court.value = c.espacio || "";
            form.elements.hoops.value = c.aros != null ? c.aros : "";
            Array.prototype.forEach.call(form.querySelectorAll('input[name="materials"]'), function (cb) {
                cb.checked = (c.materiales || []).indexOf(cb.value) >= 0;
            });
        }
        form.elements.categoria.addEventListener("change", function () {
            var cat = form.elements.categoria.value;
            catNote.textContent = cat ? "Categoría " + cat + ": resumen de su planificación anual y de sus últimos entrenamientos guardados." : "Sin categoría elegida.";
            var latest = cat && host.getLatestConditions ? host.getLatestConditions(cat) : null;
            if (latest) {
                setConditions(latest.condiciones);
                condNote.textContent = "Completadas con las condiciones del entrenamiento «" + (latest.nombre || "sin nombre") + "» (" + (latest.fecha || "sin fecha") + "). Podés cambiarlas.";
            } else {
                condNote.textContent = "";
            }
        });

        function values() {
            return {
                categoria: form.elements.categoria.value,
                mode: form.elements.mode.value,
                players: form.elements.players.value,
                court: form.elements.court.value,
                hoops: form.elements.hoops.value,
                minutes: form.elements.minutes.value,
                materials: Array.prototype.filter.call(form.querySelectorAll('input[name="materials"]'), function (c) { return c.checked; }).map(function (c) { return c.value; }),
                text: form.elements.text.value,
                conversationId: state.conversationId
            };
        }

        function showError(msg) {
            errorBox.textContent = msg;
            errorBox.hidden = !msg;
        }

        function setBusy(b) {
            state.busy = b;
            sendBtn.disabled = b;
            sendBtn.textContent = b ? "Consultando…" : state.conversationId ? "Enviar otra pregunta" : "Enviar al asistente";
            form.elements.text.disabled = b;
        }

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            if (state.busy) return;
            var v = values();
            if (!v.text.trim()) { showError("Escribí tu pregunta."); form.elements.text.focus(); return; }
            showError("");
            var body = buildPayload(ctx, v);
            setBusy(true);
            state.controller = typeof AbortController !== "undefined" ? new AbortController() : null;
            var pending = doc.createElement("div");
            pending.className = "ai-turn ai-turn--user";
            pending.innerHTML = '<p class="ai-q">' + esc(body.text) + "</p>" + '<p class="ac-muted ai-wait">El asistente está pensando. Puede tardar unos segundos.</p>';
            answer.hidden = false;
            answer.appendChild(pending);
            root.fetch("/api/assistant/chat", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: state.controller ? state.controller.signal : undefined
            }).then(function (res) {
                return res.json().catch(function () { return {}; }).then(function (data) { return { res: res, data: data }; });
            }).then(function (r) {
                var wait = pending.querySelector(".ai-wait");
                if (wait) wait.remove();
                if (r.data && r.data.conversation && r.data.conversation.id) state.conversationId = r.data.conversation.id;
                if (r.res.status === 401) {
                    pending.remove();
                    showError("Iniciá sesión para usar el Asistente IA. Los contenidos de Academy se pueden leer sin sesión.");
                    return;
                }
                if (!r.res.ok || !r.data.ok) {
                    pending.remove();
                    showError((r.data && r.data.error) || "No se pudo consultar al asistente. Probá de nuevo.");
                    return;
                }
                var reply = doc.createElement("div");
                reply.className = "ai-reply";
                reply.innerHTML = renderMarkdown(r.data.message && r.data.message.text) +
                    (r.data.message && r.data.message.truncated ? '<p class="ac-muted">La respuesta quedó cortada por su largo.</p>' : "");
                pending.appendChild(reply);
                renderFooter(r.data);
                form.elements.text.value = "";
                if (pending.scrollIntoView) pending.scrollIntoView({ behavior: "smooth", block: "start" });
            }).catch(function (err) {
                pending.remove();
                if (err && err.name === "AbortError") return;
                showError("No hay conexión con el servidor. Revisá tu conexión y probá de nuevo.");
            }).then(function () {
                state.controller = null;
                if (overlay.isConnected) setBusy(false);
            });
        });

        function renderFooter(data) {
            var old = answer.querySelector(".ai-foot");
            if (old) old.remove();
            var foot = doc.createElement("div");
            foot.className = "ai-foot";
            var persisted = data.academy && data.academy.persisted === false;
            foot.innerHTML =
                '<a class="tb-btn tb-btn--accent" href="/assistant?c=' + encodeURIComponent(state.conversationId) + '">Continuar en el Asistente</a>' +
                '<p class="ac-muted">La conversación quedó guardada en tu historial del Asistente.' +
                (persisted ? " Las preguntas que hagas desde acá llevan el contexto de la guía. En el Asistente, el contexto se mantiene cuando se active la actualización 009 de la base de datos." : "") + "</p>";
            answer.appendChild(foot);
        }

        setTimeout(function () { form.elements.text.focus(); }, 0);
        return { close: close, element: overlay };
    }

    return { open: open, renderMarkdown: renderMarkdown, buildPayload: buildPayload, suggestionsFor: suggestionsFor };
});
