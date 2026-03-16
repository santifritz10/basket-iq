// ===============================
// AUTENTICACIÓN (registro / login)
// ===============================

const AUTH_USERS_KEY = "basketLab_users";
const AUTH_SESSION_KEY = "basketLab_currentUser";

function getUsers() {
    try {
        const data = localStorage.getItem(AUTH_USERS_KEY);
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
    try {
        const data = localStorage.getItem(AUTH_SESSION_KEY);
        if (!data) return null;
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

function setCurrentUser(user) {
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ username: user.username, email: user.email, name: user.name }));
}

function clearCurrentUser() {
    localStorage.removeItem(AUTH_SESSION_KEY);
}

function hashPassword(password) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(password)).then(function (buf) {
        return Array.from(new Uint8Array(buf)).map(function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    });
}

function register(username, email, name, password) {
    var users = getUsers();
    var lower = username.toLowerCase();
    var emailLower = email.toLowerCase().trim();
    if (users.some(function (u) { return u.usernameLower === lower; })) return { ok: false, error: "Ese nombre de usuario ya está en uso." };
    if (users.some(function (u) { return u.emailLower === emailLower; })) return { ok: false, error: "Ese correo ya está registrado." };
    return hashPassword(password).then(function (passwordHash) {
        users.push({
            username: username.trim(),
            usernameLower: lower,
            email: email.trim(),
            emailLower: emailLower,
            name: name.trim(),
            passwordHash: passwordHash
        });
        saveUsers(users);
        var user = { username: users[users.length - 1].username, email: users[users.length - 1].email, name: users[users.length - 1].name };
        setCurrentUser(user);
        return { ok: true, user: user };
    });
}

function login(identificador, password) {
    var users = getUsers();
    var id = identificador.trim().toLowerCase();
    var user = users.find(function (u) { return u.usernameLower === id || u.emailLower === id; });
    if (!user) return Promise.resolve({ ok: false, error: "Usuario o correo no encontrado." });
    return hashPassword(password).then(function (passwordHash) {
        if (user.passwordHash !== passwordHash) return { ok: false, error: "Contraseña incorrecta." };
        setCurrentUser({ username: user.username, email: user.email, name: user.name });
        return { ok: true, user: user };
    });
}

function showApp() {
    var authScreen = document.getElementById("auth-screen");
    var appContainer = document.getElementById("app-container");
    var userNameEl = document.getElementById("sidebar-user-name");
    if (authScreen) authScreen.classList.add("hidden");
    if (appContainer) appContainer.hidden = false;
    var cur = getCurrentUser();
    if (userNameEl && cur) userNameEl.textContent = cur.name || cur.username;
    var btnLogout = document.getElementById("btn-logout");
    if (btnLogout) btnLogout.onclick = function () { logout(); };
    loadContent("dashboard");
}

function showAuthScreen() {
    var authScreen = document.getElementById("auth-screen");
    var appContainer = document.getElementById("app-container");
    if (authScreen) authScreen.classList.remove("hidden");
    if (appContainer) appContainer.hidden = true;
    document.getElementById("auth-login-error").textContent = "";
    document.getElementById("auth-register-error").textContent = "";
    attachAuthListeners();
}

function logout() {
    clearCurrentUser();
    showAuthScreen();
}

function switchAuthTab(tabName) {
    var loginForm = document.getElementById("auth-form-login");
    var registerForm = document.getElementById("auth-form-register");
    var tabs = document.querySelectorAll(".auth-tab");
    tabs.forEach(function (t) {
        t.classList.toggle("active", t.getAttribute("data-tab") === tabName);
    });
    if (loginForm) loginForm.classList.toggle("active", tabName === "login");
    if (registerForm) registerForm.classList.toggle("active", tabName === "register");
}

function attachAuthListeners() {
    var tabButtons = document.querySelectorAll(".auth-tab");
    tabButtons.forEach(function (btn) {
        btn.onclick = function () {
            switchAuthTab(btn.getAttribute("data-tab"));
            document.getElementById("auth-login-error").textContent = "";
            document.getElementById("auth-register-error").textContent = "";
        };
    });

    var loginForm = document.getElementById("auth-form-login");
    if (loginForm) {
        loginForm.onsubmit = function (e) {
            e.preventDefault();
            var ident = document.getElementById("login-identificador").value;
            var pwd = document.getElementById("login-password").value;
            var errEl = document.getElementById("auth-login-error");
            errEl.textContent = "";
            login(ident, pwd).then(function (result) {
                if (result.ok) showApp(); else errEl.textContent = result.error || "Error al iniciar sesión.";
            });
        };
    }

    var registerForm = document.getElementById("auth-form-register");
    if (registerForm) {
        registerForm.onsubmit = function (e) {
            e.preventDefault();
            var username = document.getElementById("register-username").value.trim();
            var email = document.getElementById("register-email").value.trim();
            var name = document.getElementById("register-name").value.trim();
            var pwd = document.getElementById("register-password").value;
            var pwd2 = document.getElementById("register-password2").value;
            var errEl = document.getElementById("auth-register-error");
            errEl.textContent = "";
            if (pwd !== pwd2) {
                errEl.textContent = "Las contraseñas no coinciden.";
                return;
            }
            if (pwd.length < 6) {
                errEl.textContent = "La contraseña debe tener al menos 6 caracteres.";
                return;
            }
            register(username, email, name, pwd).then(function (result) {
                if (result.ok) showApp(); else errEl.textContent = result.error || "Error al registrarse.";
            });
        };
    }
}

function initAuth() {
    if (getCurrentUser()) {
        showApp();
    } else {
        showAuthScreen();
    }
}

// Ejecutar al cargar la página
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
} else {
    initAuth();
}

// ===============================
// VARIABLES GLOBALES
// ===============================

let courtImage = new Image();
courtImage.src = "images/cancha.svg";

let canvas, ctx;
let players = [];
let selectedPlayer = null;
let ball = null;
let lines = [];
let lineStart = null;
let currentLineType = "normal";
let dragging = false;
let isLineMode = false;

// Jugadas
let currentPlaySteps = [];
let savedPlays = [];
const PLAYS_STORAGE_KEY = "basketIQ_plays";


// ===============================
// UTILIDAD: JUGADAS GUARDADAS
// ===============================

function loadSavedPlaysFromStorage() {
    try {
        const data = localStorage.getItem(PLAYS_STORAGE_KEY);
        if (!data) {
            savedPlays = [];
            return;
        }
        const parsed = JSON.parse(data);
        savedPlays = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        savedPlays = [];
    }
}

function savePlaysToStorage() {
    localStorage.setItem(PLAYS_STORAGE_KEY, JSON.stringify(savedPlays));
}

// ===============================
// PLANIFICACIÓN DE ENTRENAMIENTOS
// ===============================

const ENTRENAMIENTOS_STORAGE_KEY = "basketLab_entrenamientos";
let entrenamientos = [];

const PLANIFICACION_ANUAL_STORAGE_KEY = "basketLab_planificacion_anual";

function getPlanificacionesAnuales() {
    try {
        const data = localStorage.getItem(PLANIFICACION_ANUAL_STORAGE_KEY);
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function savePlanificacionesAnuales(list) {
    localStorage.setItem(PLANIFICACION_ANUAL_STORAGE_KEY, JSON.stringify(list));
}

function createCiclosBimestrales(anio) {
    var y = Number(anio) || new Date().getFullYear();
    var febLast = new Date(y, 2, 0).getDate();
    var meses = [
        { nombre: "Enero-Febrero", ini: [1, 1], fin: [2, febLast] },
        { nombre: "Marzo-Abril", ini: [3, 1], fin: [4, 30] },
        { nombre: "Mayo-Junio", ini: [5, 1], fin: [6, 30] },
        { nombre: "Julio-Agosto", ini: [7, 1], fin: [8, 31] },
        { nombre: "Septiembre-Octubre", ini: [9, 1], fin: [10, 31] },
        { nombre: "Noviembre-Diciembre", ini: [11, 1], fin: [12, 31] }
    ];
    var ciclos = [];
    var baseId = Date.now();
    meses.forEach(function (m, idx) {
        var id = baseId + idx;
        var dIni = new Date(y, m.ini[0] - 1, m.ini[1]);
        var dFin = new Date(y, m.fin[0] - 1, m.fin[1]);
        ciclos.push({
            id: id,
            nombre: m.nombre,
            fecha_inicio: dIni.toISOString().slice(0, 10),
            fecha_fin: dFin.toISOString().slice(0, 10),
            objetivo_principal: "",
            fundamentos_trabajados: "",
            notas: ""
        });
    });
    return ciclos;
}

function getAllCiclos() {
    const planificaciones = getPlanificacionesAnuales();
    const out = [];
    planificaciones.forEach(function (p) {
        (p.ciclos || []).forEach(function (c) {
            out.push({ ciclo: c, planificacionNombre: p.nombre || p.temporada || "Planificación", planificacionId: p.id });
        });
    });
    return out;
}

const TIPOS_BLOQUE = [
    { value: "calentamiento", label: "Calentamiento" },
    { value: "fundamentos", label: "Fundamentos" },
    { value: "tiro", label: "Tiro" },
    { value: "ejercicio", label: "Ejercicio" },
    { value: "tactica", label: "Táctica" },
    { value: "juego", label: "Juego" },
    { value: "vuelta_calma", label: "Vuelta a la calma" },
    { value: "notas", label: "Notas" }
];

function getEntrenamientos() {
    try {
        const data = localStorage.getItem(ENTRENAMIENTOS_STORAGE_KEY);
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveEntrenamientos() {
    localStorage.setItem(ENTRENAMIENTOS_STORAGE_KEY, JSON.stringify(entrenamientos));
}

function calcularDuracionTotal(bloques) {
    if (!Array.isArray(bloques)) return 0;
    return bloques.reduce((sum, b) => sum + (Number(b.duracion_minutos) || 0), 0);
}

function renderPlanificacionView(editingId) {
    const contentDiv = document.getElementById("content");
    if (!contentDiv) return;

    entrenamientos = getEntrenamientos();

    if (editingId !== undefined && editingId !== null) {
        const ent = entrenamientos.find(e => e.id === editingId);
        if (ent) {
            contentDiv.innerHTML = buildEditorEntrenamiento(ent);
            attachPlanificacionEvents(editingId);
            return;
        }
    }

    contentDiv.innerHTML = buildListaEntrenamientos();
    attachPlanificacionListEvents();
}

function buildListaEntrenamientos() {
    const list = entrenamientos.map(e => {
        const total = calcularDuracionTotal(e.bloques);
        const fecha = e.fecha ? new Date(e.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
        return `
            <article class="entrenamiento-card" data-id="${e.id}">
                <div class="entrenamiento-card-main">
                    <h3>${escapeHtml(e.nombre || "Sin nombre")}</h3>
                    <p class="entrenamiento-meta">${escapeHtml(e.categoria || "—")} · ${fecha}</p>
                    <p class="entrenamiento-duracion">Duración total: <strong>${total} min</strong></p>
                </div>
                <div class="entrenamiento-card-actions">
                    <button type="button" class="btn-editar" onclick="renderPlanificacionView(${e.id})">Editar</button>
                    <button type="button" class="btn-borrar" onclick="deleteEntrenamiento(${e.id})">Borrar</button>
                </div>
            </article>
        `;
    }).join("");

    return `
        <section class="manual-section planificacion-view">
            <h2>Planificación de Entrenamientos</h2>
            <p>Creá y organizá entrenamientos por bloques. La duración total se calcula automáticamente.</p>
            <div class="planificacion-actions">
                <button type="button" class="toolbar-button toolbar-button-accent" onclick="nuevoEntrenamiento()">Crear entrenamiento</button>
            </div>
            <div class="entrenamientos-list" id="entrenamientos-list">
                ${entrenamientos.length ? list : "<p class=\"text-muted\">No hay entrenamientos. Creá uno para empezar.</p>"}
            </div>
        </section>
    `;
}

function buildEditorEntrenamiento(ent) {
    const total = calcularDuracionTotal(ent.bloques);
    const bloques = (ent.bloques || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const bloquesHtml = bloques.map((b, idx) => {
        const tipoLabel = TIPOS_BLOQUE.find(t => t.value === b.tipo_bloque)?.label || b.tipo_bloque;
        return `
            <div class="bloque-card" data-bloque-id="${b.id}" draggable="true">
                <span class="bloque-drag-handle" title="Arrastrar para reordenar">⋮⋮</span>
                <div class="bloque-card-body">
                    <span class="bloque-tipo">${escapeHtml(tipoLabel)}</span>
                    <h4>${escapeHtml(b.titulo || "Sin título")}</h4>
                    ${b.descripcion ? `<p>${escapeHtml(b.descripcion)}</p>` : ""}
                    <span class="bloque-duracion">${Number(b.duracion_minutos) || 0} min</span>
                </div>
                <div class="bloque-card-actions">
                    <button type="button" class="btn-editar-small" onclick="editarBloque(${ent.id}, ${b.id})">Editar</button>
                    <button type="button" class="btn-borrar-small" onclick="eliminarBloque(${ent.id}, ${b.id})">Borrar</button>
                </div>
            </div>
        `;
    }).join("");

    const optionsCategoria = ["U13", "U15", "U17", "Primera", "Otro"].map(c =>
        `<option value="${c}" ${(ent.categoria || "") === c ? "selected" : ""}>${c}</option>`
    ).join("");

    const ciclosFlat = getAllCiclos();
    const optgroupsByPlan = {};
    ciclosFlat.forEach(function (item) {
        const key = item.planificacionId;
        if (!optgroupsByPlan[key]) optgroupsByPlan[key] = { nombre: item.planificacionNombre, ciclos: [] };
        optgroupsByPlan[key].ciclos.push(item.ciclo);
    });
    let cicloOptions = '<option value="">Sin ciclo</option>';
    Object.keys(optgroupsByPlan).forEach(function (pid) {
        const g = optgroupsByPlan[pid];
        cicloOptions += '<optgroup label="' + escapeHtml(g.nombre) + '">';
        g.ciclos.forEach(function (c) {
            const sel = (ent.ciclo_id != null && String(ent.ciclo_id) === String(c.id)) ? " selected" : "";
            cicloOptions += '<option value="' + c.id + '"' + sel + '>' + escapeHtml(c.nombre) + '</option>';
        });
        cicloOptions += "</optgroup>";
    });

    return `
        <section class="manual-section planificacion-view" data-editing-id="${ent.id}">
            <div class="planificacion-header">
                <button type="button" class="btn-back" onclick="renderPlanificacionView()">← Volver a la lista</button>
                <h2>${ent.id ? "Editar entrenamiento" : "Nuevo entrenamiento"}</h2>
            </div>
            <div class="planificacion-total">
                <strong>Duración total: ${total} min</strong>
            </div>
            <div class="planificacion-actions planificacion-actions-inline">
                <button type="button" class="toolbar-button" onclick="printEntrenamiento(${ent.id})">Imprimir PDF</button>
            </div>
            <form id="form-entrenamiento" class="form-entrenamiento">
                <input type="hidden" name="id" value="${ent.id || ""}">
                <div class="form-row">
                    <label>Nombre</label>
                    <input type="text" name="nombre" value="${escapeHtml(ent.nombre || "")}" placeholder="Ej: Entrenamiento martes">
                </div>
                <div class="form-row form-row-inline">
                    <div>
                        <label>Fecha</label>
                        <input type="date" name="fecha" value="${ent.fecha || ""}">
                    </div>
                    <div>
                        <label>Categoría</label>
                        <select name="categoria">${optionsCategoria}</select>
                    </div>
                </div>
                <div class="form-row">
                    <label>Ciclo (planificación anual)</label>
                    <select name="ciclo_id">${cicloOptions}</select>
                </div>
                <div class="form-row">
                    <label>Notas generales</label>
                    <textarea name="notas_generales" rows="2" placeholder="Notas opcionales">${escapeHtml(ent.notas_generales || "")}</textarea>
                </div>
                <div class="form-actions">
                    <button type="submit" class="toolbar-button toolbar-button-accent">Guardar entrenamiento</button>
                </div>
            </form>
            <h3 class="section-title">Bloques de práctica</h3>
            <div class="bloques-list" id="bloques-list">
                ${bloquesHtml}
            </div>
            <div class="planificacion-actions">
                <button type="button" class="toolbar-button" onclick="mostrarModalBloque(${ent.id})">Agregar bloque</button>
            </div>
        </section>
        <div id="modal-bloque" class="modal" style="display:none;">
            <div class="modal-content">
                <h3>Agregar / Editar bloque</h3>
                <form id="form-bloque">
                    <input type="hidden" name="bloque_id" id="bloque-id-input">
                    <div class="form-row">
                        <label>Tipo de bloque</label>
                        <select name="tipo_bloque" id="bloque-tipo">${TIPOS_BLOQUE.map(t => `<option value="${t.value}">${t.label}</option>`).join("")}</select>
                    </div>
                    <div class="form-row">
                        <label>Título</label>
                        <input type="text" name="titulo" id="bloque-titulo" placeholder="Ej: Manejo de balón">
                    </div>
                    <div class="form-row">
                        <label>Descripción</label>
                        <textarea name="descripcion" id="bloque-descripcion" rows="3" placeholder="Descripción del bloque (opcional)"></textarea>
                    </div>
                    <div class="form-row">
                        <label>Duración (minutos)</label>
                        <input type="number" name="duracion_minutos" id="bloque-duracion" min="1" value="10">
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="toolbar-button toolbar-button-accent">Guardar bloque</button>
                        <button type="button" class="toolbar-button" onclick="cerrarModalBloque()">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    if (str == null) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function formatFechaAR(iso) {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (e) {
        return String(iso);
    }
}

function getTipoBloqueLabel(value) {
    const t = TIPOS_BLOQUE.find(x => x.value === value);
    return t ? t.label : (value || "—");
}

function buildEntrenamientoPrintHtml(ent) {
    const user = getCurrentUser();
    const coachName = (user && (user.name || user.username)) ? (user.name || user.username) : "—";
    const total = calcularDuracionTotal(ent.bloques);
    const bloques = (ent.bloques || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));

    const bloquesRows = bloques.map((b, idx) => {
        const titulo = escapeHtml(b.titulo || "Sin título");
        const desc = b.descripcion ? escapeHtml(b.descripcion) : "";
        const tipo = escapeHtml(getTipoBloqueLabel(b.tipo_bloque));
        const dur = Number(b.duracion_minutos) || 0;
        return `
            <tr>
                <td class="col-orden">${idx + 1}</td>
                <td class="col-tipo">${tipo}</td>
                <td class="col-titulo">
                    <div class="titulo">${titulo}</div>
                    ${desc ? `<div class="desc">${desc}</div>` : ``}
                </td>
                <td class="col-duracion">${dur} min</td>
            </tr>
        `;
    }).join("");

    const notas = ent.notas_generales ? escapeHtml(ent.notas_generales) : "";

    return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Entrenamiento — ${escapeHtml(ent.nombre || "Basket Lab")}</title>
  <style>
    :root{
      --ink:#111827;
      --muted:#6b7280;
      --border:#e5e7eb;
      --soft:#f9fafb;
      --accent:#ff9800;
      --accentDeep:#e65100;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      padding:28px;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color:var(--ink);
      background:#fff;
    }
    .page{
      max-width:900px;
      margin:0 auto;
    }
    .header{
      display:flex;
      align-items:center;
      gap:18px;
      padding-bottom:16px;
      border-bottom:2px solid var(--border);
    }
    .logo{
      width:74px;
      height:74px;
      flex:0 0 auto;
    }
    .hgroup{flex:1; min-width:0}
    h1{
      margin:0;
      font-size:26px;
      letter-spacing:-0.02em;
      line-height:1.15;
    }
    .sub{
      margin:6px 0 0;
      color:var(--muted);
      font-size:13px;
    }
    .badge{
      display:inline-block;
      padding:6px 10px;
      border-radius:999px;
      background:linear-gradient(135deg, rgba(255,152,0,0.16), rgba(230,81,0,0.10));
      color:#7c2d12;
      font-weight:700;
      font-size:12px;
      border:1px solid rgba(255,152,0,0.35);
    }
    .meta{
      margin-top:16px;
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap:12px;
    }
    .metaCard{
      border:1px solid var(--border);
      border-radius:12px;
      padding:12px 14px;
      background:var(--soft);
    }
    .metaLabel{
      color:var(--muted);
      font-size:12px;
      margin:0 0 4px;
    }
    .metaValue{
      margin:0;
      font-size:14px;
      font-weight:700;
    }
    .section{
      margin-top:18px;
      border:1px solid var(--border);
      border-radius:14px;
      overflow:hidden;
    }
    .sectionHeader{
      background:linear-gradient(135deg, rgba(17,24,39,0.04), rgba(255,152,0,0.06));
      padding:12px 14px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      border-bottom:1px solid var(--border);
    }
    .sectionTitle{
      margin:0;
      font-size:14px;
      font-weight:800;
      letter-spacing:0.02em;
      text-transform:uppercase;
    }
    .sectionBody{ padding:0; }
    table{
      width:100%;
      border-collapse:collapse;
      font-size:13px;
    }
    thead th{
      text-align:left;
      color:var(--muted);
      font-size:11px;
      letter-spacing:0.08em;
      text-transform:uppercase;
      background:#fff;
      padding:10px 12px;
      border-bottom:1px solid var(--border);
    }
    tbody td{
      padding:10px 12px;
      border-bottom:1px solid var(--border);
      vertical-align:top;
    }
    tbody tr:last-child td{ border-bottom:none; }
    .col-orden{ width:44px; color:var(--muted); font-weight:700; }
    .col-tipo{ width:140px; }
    .col-duracion{ width:92px; text-align:right; font-weight:800; }
    .titulo{ font-weight:800; }
    .desc{ margin-top:4px; color:var(--muted); line-height:1.35; }
    .notas{
      padding:12px 14px;
      font-size:13px;
      color:var(--ink);
      line-height:1.45;
      white-space:pre-wrap;
    }
    .footer{
      margin-top:18px;
      display:flex;
      justify-content:space-between;
      gap:12px;
      color:var(--muted);
      font-size:12px;
    }
    .printHint{
      margin-top:14px;
      padding:10px 12px;
      border:1px dashed rgba(17,24,39,0.25);
      border-radius:12px;
      color:var(--muted);
      font-size:12px;
    }
    @media print{
      body{ padding:0; }
      .page{ max-width:none; margin:0; padding:0; }
      .printHint{ display:none; }
      @page { size: A4; margin: 14mm; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <img class="logo" src="images/logo-basketlab.svg" alt="Basket Lab" />
      <div class="hgroup">
        <h1>${escapeHtml(ent.nombre || "Entrenamiento")}</h1>
        <p class="sub"><span class="badge">${escapeHtml(ent.categoria || "General")}</span> &nbsp;•&nbsp; Fecha: <strong>${formatFechaAR(ent.fecha)}</strong> &nbsp;•&nbsp; Duración total: <strong>${total} min</strong></p>
        <p class="sub">Coach: <strong>${escapeHtml(coachName)}</strong></p>
      </div>
    </div>

    <div class="meta">
      <div class="metaCard">
        <p class="metaLabel">Fecha</p>
        <p class="metaValue">${formatFechaAR(ent.fecha)}</p>
      </div>
      <div class="metaCard">
        <p class="metaLabel">Duración total</p>
        <p class="metaValue">${total} min</p>
      </div>
    </div>

    <div class="section">
      <div class="sectionHeader">
        <p class="sectionTitle">Bloques de práctica</p>
        <p class="sub" style="margin:0;">${bloques.length} bloque(s)</p>
      </div>
      <div class="sectionBody">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tipo</th>
              <th>Bloque</th>
              <th style="text-align:right;">Duración</th>
            </tr>
          </thead>
          <tbody>
            ${bloquesRows || `<tr><td colspan="4" style="padding:14px; color:var(--muted);">No hay bloques cargados.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="sectionHeader">
        <p class="sectionTitle">Notas generales</p>
      </div>
      <div class="notas">${notas || `<span style="color:var(--muted);">Sin notas.</span>`}</div>
    </div>

    <div class="footer">
      <div>Basket Lab · By Coach Fritz</div>
      <div>Generado: ${formatFechaAR(new Date().toISOString())}</div>
    </div>

    <div class="printHint">Tip: en el diálogo de impresión elegí <strong>“Guardar como PDF”</strong>.</div>
  </div>
  <script>
    window.addEventListener('load', function () { window.focus(); window.print(); });\n
  </script>
</body>
</html>
    `;
}

function printEntrenamiento(entrenamientoId) {
    const list = getEntrenamientos();
    const ent = list.find(e => e.id === entrenamientoId);
    if (!ent) return;
    const html = buildEntrenamientoPrintHtml(ent);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
}

function nuevoEntrenamiento() {
    const id = Date.now();
    const ent = {
        id,
        nombre: "",
        fecha: "",
        categoria: "U15",
        ciclo_id: null,
        notas_generales: "",
        bloques: []
    };
    entrenamientos = getEntrenamientos();
    entrenamientos.push(ent);
    saveEntrenamientos();
    renderPlanificacionView(id);
}

function deleteEntrenamiento(id) {
    if (!confirm("¿Borrar este entrenamiento?")) return;
    entrenamientos = getEntrenamientos().filter(e => e.id !== id);
    saveEntrenamientos();
    renderPlanificacionView();
}

function attachPlanificacionListEvents() {
    document.querySelectorAll(".entrenamiento-card[data-id]").forEach(el => {
        el.addEventListener("click", function (ev) {
            if (ev.target.closest("button")) return;
            const id = parseInt(this.getAttribute("data-id"), 10);
            renderPlanificacionView(id);
        });
    });
}

function attachPlanificacionEvents(entrenamientoId) {
    const form = document.getElementById("form-entrenamiento");
    if (form) {
        form.onsubmit = function (ev) {
            ev.preventDefault();
            const fd = new FormData(form);
            const ent = entrenamientos.find(e => e.id === entrenamientoId);
            if (!ent) return;
            ent.nombre = fd.get("nombre") || "";
            ent.fecha = fd.get("fecha") || "";
            ent.categoria = fd.get("categoria") || "";
            ent.ciclo_id = fd.get("ciclo_id") ? parseInt(fd.get("ciclo_id"), 10) : null;
            ent.notas_generales = fd.get("notas_generales") || "";
            saveEntrenamientos();
            renderPlanificacionView(entrenamientoId);
        };
    }

    const list = document.getElementById("bloques-list");
    if (list) {
        list.querySelectorAll(".bloque-card").forEach(card => {
            card.addEventListener("dragstart", handleBloqueDragStart);
            card.addEventListener("dragover", handleBloqueDragOver);
            card.addEventListener("drop", handleBloqueDrop);
            card.addEventListener("dragend", handleBloqueDragEnd);
        });
    }

    const formBloque = document.getElementById("form-bloque");
    if (formBloque) {
        formBloque.onsubmit = function (ev) {
            ev.preventDefault();
            guardarBloqueDesdeModal(entrenamientoId);
        };
    }
}

function handleBloqueDragStart(ev) {
    ev.dataTransfer.setData("text/plain", ev.currentTarget.getAttribute("data-bloque-id"));
    ev.currentTarget.classList.add("dragging");
}

function handleBloqueDragOver(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
    const card = ev.currentTarget.closest(".bloque-card");
    if (card && !card.classList.contains("dragging")) {
        card.classList.add("drag-over");
    }
}

function handleBloqueDrop(ev) {
    ev.preventDefault();
    document.querySelectorAll(".bloque-card").forEach(c => c.classList.remove("drag-over", "dragging"));
    const bloqueId = ev.dataTransfer.getData("text/plain");
    const targetCard = ev.currentTarget.closest(".bloque-card");
    if (!targetCard || !bloqueId) return;
    const targetId = targetCard.getAttribute("data-bloque-id");
    if (targetId === bloqueId) return;

    const section = document.querySelector(".planificacion-view[data-editing-id]");
    const editingId = section ? parseInt(section.getAttribute("data-editing-id"), 10) : 0;
    const ent = entrenamientos.find(e => e.id === editingId);
    if (!ent || !ent.bloques) return;
    const bloques = ent.bloques.slice();
    const fromIdx = bloques.findIndex(b => String(b.id) === String(bloqueId));
    const toIdx = bloques.findIndex(b => String(b.id) === String(targetId));
    if (fromIdx === -1 || toIdx === -1) return;
    const [item] = bloques.splice(fromIdx, 1);
    bloques.splice(toIdx, 0, item);
    bloques.forEach((b, i) => { b.orden = i; });
    ent.bloques = bloques;
    saveEntrenamientos();
    renderPlanificacionView(editingId);
}

function handleBloqueDragEnd(ev) {
    ev.currentTarget.classList.remove("dragging");
    document.querySelectorAll(".bloque-card").forEach(c => c.classList.remove("drag-over"));
}

function mostrarModalBloque(entrenamientoId, bloqueId) {
    const modal = document.getElementById("modal-bloque");
    if (!modal) return;
    document.getElementById("form-bloque").setAttribute("data-entrenamiento-id", String(entrenamientoId));
    document.getElementById("bloque-id-input").value = bloqueId || "";
    if (bloqueId) {
        const ent = getEntrenamientos().find(e => e.id === entrenamientoId);
        const b = ent?.bloques?.find(bl => bl.id === bloqueId);
        if (b) {
            document.getElementById("bloque-tipo").value = b.tipo_bloque || "fundamentos";
            document.getElementById("bloque-titulo").value = b.titulo || "";
            document.getElementById("bloque-descripcion").value = b.descripcion || "";
            document.getElementById("bloque-duracion").value = b.duracion_minutos ?? 10;
        }
    } else {
        document.getElementById("bloque-tipo").value = "fundamentos";
        document.getElementById("bloque-titulo").value = "";
        document.getElementById("bloque-descripcion").value = "";
        document.getElementById("bloque-duracion").value = "10";
    }
    modal.style.display = "flex";
}

function cerrarModalBloque() {
    const modal = document.getElementById("modal-bloque");
    if (modal) modal.style.display = "none";
}

function guardarBloqueDesdeModal(entrenamientoId) {
    const form = document.getElementById("form-bloque");
    const bloqueId = form.querySelector("#bloque-id-input").value;
    const tipo = form.querySelector("#bloque-tipo").value;
    const titulo = form.querySelector("#bloque-titulo").value.trim();
    const descripcion = form.querySelector("#bloque-descripcion").value.trim();
    const duracion = parseInt(form.querySelector("#bloque-duracion").value, 10) || 10;

    entrenamientos = getEntrenamientos();
    const ent = entrenamientos.find(e => e.id === entrenamientoId);
    if (!ent) { cerrarModalBloque(); return; }
    if (!ent.bloques) ent.bloques = [];

    if (bloqueId) {
        const b = ent.bloques.find(bl => String(bl.id) === String(bloqueId));
        if (b) {
            b.tipo_bloque = tipo;
            b.titulo = titulo;
            b.descripcion = descripcion;
            b.duracion_minutos = duracion;
        }
    } else {
        const orden = ent.bloques.length;
        ent.bloques.push({
            id: Date.now() + Math.random(),
            entrenamiento_id: entrenamientoId,
            tipo_bloque: tipo,
            titulo: titulo || "Sin título",
            descripcion,
            duracion_minutos: duracion,
            orden
        });
    }
    saveEntrenamientos();
    cerrarModalBloque();
    renderPlanificacionView(entrenamientoId);
}

function editarBloque(entrenamientoId, bloqueId) {
    mostrarModalBloque(entrenamientoId, bloqueId);
}

function eliminarBloque(entrenamientoId, bloqueId) {
    if (!confirm("¿Eliminar este bloque?")) return;
    entrenamientos = getEntrenamientos();
    const ent = entrenamientos.find(e => e.id === entrenamientoId);
    if (ent && ent.bloques) {
        ent.bloques = ent.bloques.filter(b => b.id !== bloqueId);
        saveEntrenamientos();
        renderPlanificacionView(entrenamientoId);
    }
}

// ===============================
// PLANIFICACIÓN ANUAL
// ===============================

function getEntrenamientosByCiclo(cicloId) {
    return getEntrenamientos().filter(function (e) { return e.ciclo_id != null && String(e.ciclo_id) === String(cicloId); });
}

/** Entrenamientos cuya fecha cae dentro del rango del ciclo. Opcionalmente filtra por categoría de la planificación. */
function getEntrenamientosForCicloByDate(ciclo, plan) {
    var lista = getEntrenamientos();
    var ini = ciclo.fecha_inicio ? new Date(ciclo.fecha_inicio) : null;
    var fin = ciclo.fecha_fin ? new Date(ciclo.fecha_fin) : null;
    var catPlan = (plan && plan.categoria) ? String(plan.categoria).trim() : "";
    return lista.filter(function (e) {
        if (!e.fecha) return false;
        var d = new Date(e.fecha);
        if (ini && d < ini) return false;
        if (fin && d > fin) return false;
        if (catPlan && String(e.categoria || "").trim() !== catPlan) return false;
        return true;
    });
}

function renderPlanificacionAnualView() {
    var contentDiv = document.getElementById("content");
    if (!contentDiv) return;
    var list = getPlanificacionesAnuales();
    var user = getCurrentUser();
    var usuarioId = (user && user.username) ? user.username : "default";

    var cards = list.map(function (p) {
        var fechaIni = p.fecha_inicio ? formatFechaAR(p.fecha_inicio) : "—";
        var fechaFin = p.fecha_fin ? formatFechaAR(p.fecha_fin) : "—";
        return (
            '<article class="planificacion-anual-card" data-id="' + p.id + '">' +
            '  <div class="planificacion-anual-card-main">' +
            '    <h3>' + escapeHtml(p.nombre || "Planificación " + (p.temporada || "")) + '</h3>' +
            '    <p class="planificacion-anual-meta">' + escapeHtml(p.categoria || "—") + ' · Temporada ' + escapeHtml(String(p.temporada || "")) + '</p>' +
            '    <p class="planificacion-anual-fechas">' + fechaIni + ' – ' + fechaFin + '</p>' +
            '  </div>' +
            '  <div class="planificacion-anual-card-actions">' +
            '    <button type="button" class="btn-editar" onclick="renderPlanificacionAnualDetalleView(' + p.id + ')">Ver ciclos</button>' +
            '    <button type="button" class="btn-borrar" onclick="deletePlanificacionAnual(' + p.id + ')">Borrar</button>' +
            '  </div>' +
            '</article>'
        );
    }).join("");

    contentDiv.innerHTML = (
        '<section class="manual-section planificacion-view">' +
        '  <h2>Planificación anual</h2>' +
        '  <p>Organizá la temporada en ciclos bimestrales con objetivos técnicos. Cada planificación tiene 6 ciclos (Ene-Feb a Nov-Dic).</p>' +
        '  <div class="planificacion-actions">' +
        '    <button type="button" class="toolbar-button toolbar-button-accent" onclick="mostrarModalPlanificacionAnual()">Crear planificación anual</button>' +
        '  </div>' +
        '  <div class="entrenamientos-list" id="planificacion-anual-list">' +
        (cards || '<p class="text-muted">No hay planificaciones anuales. Creá una para empezar.</p>') +
        '  </div>' +
        '</section>' +
        '<div id="modal-planificacion-anual" class="modal" style="display:none;">' +
        '  <div class="modal-content">' +
        '    <h3>Nueva planificación anual</h3>' +
        '    <form id="form-planificacion-anual">' +
        '      <div class="form-row"><label>Nombre</label><input type="text" name="nombre" placeholder="Ej: Planificación U15 2026" required></div>' +
        '      <div class="form-row"><label>Categoría</label><select name="categoria">' +
        '        <option value="U13">U13</option><option value="U15">U15</option><option value="U17">U17</option><option value="Primera">Primera</option><option value="Otro">Otro</option>' +
        '      </select></div>' +
        '      <div class="form-row"><label>Temporada (año)</label><input type="number" name="temporada" min="2020" max="2030" value="' + new Date().getFullYear() + '" required></div>' +
        '      <div class="form-actions">' +
        '        <button type="submit" class="toolbar-button toolbar-button-accent">Crear planificación y 6 ciclos</button>' +
        '        <button type="button" class="toolbar-button" onclick="cerrarModalPlanificacionAnual()">Cancelar</button>' +
        '      </div>' +
        '    </form>' +
        '  </div>' +
        '</div>'
    );

    var form = document.getElementById("form-planificacion-anual");
    if (form) {
        form.onsubmit = function (ev) {
            ev.preventDefault();
            var fd = new FormData(form);
            var nombre = fd.get("nombre") || "";
            var categoria = fd.get("categoria") || "";
            var temporada = parseInt(fd.get("temporada"), 10) || new Date().getFullYear();
            var listP = getPlanificacionesAnuales();
            var id = Date.now();
            var ciclos = createCiclosBimestrales(temporada);
            var fechaIni = temporada + "-01-01";
            var fechaFin = temporada + "-12-31";
            listP.push({
                id: id,
                nombre: nombre,
                categoria: categoria,
                temporada: temporada,
                fecha_inicio: fechaIni,
                fecha_fin: fechaFin,
                usuario_id: usuarioId,
                ciclos: ciclos
            });
            savePlanificacionesAnuales(listP);
            cerrarModalPlanificacionAnual();
            renderPlanificacionAnualDetalleView(id);
        };
    }
}

function mostrarModalPlanificacionAnual() {
    var modal = document.getElementById("modal-planificacion-anual");
    if (modal) modal.style.display = "flex";
}

function cerrarModalPlanificacionAnual() {
    var modal = document.getElementById("modal-planificacion-anual");
    if (modal) modal.style.display = "none";
}

function deletePlanificacionAnual(id) {
    if (!confirm("¿Borrar esta planificación anual y sus ciclos? Los entrenamientos no se borran, solo se desvincula el ciclo.")) return;
    var list = getPlanificacionesAnuales().filter(function (p) { return p.id !== id; });
    savePlanificacionesAnuales(list);
    renderPlanificacionAnualView();
}

function renderPlanificacionAnualDetalleView(planificacionId) {
    var contentDiv = document.getElementById("content");
    if (!contentDiv) return;
    var list = getPlanificacionesAnuales();
    var plan = list.find(function (p) { return p.id === planificacionId; });
    if (!plan) {
        renderPlanificacionAnualView();
        return;
    }

    var ciclosHtml = (plan.ciclos || []).map(function (c, idx) {
        var entList = getEntrenamientosForCicloByDate(c, plan);
        var count = entList.length;
        var entLinks = entList.slice(0, 15).map(function (e) {
            return '<a href="#" class="plan-anual-ent-link" onclick="renderPlanificacionView(' + e.id + '); return false;">' + escapeHtml(e.nombre || "Sin nombre") + '</a>';
        }).join(", ");
        if (entList.length > 15) entLinks += " <span class=\"text-muted\">+ " + (entList.length - 15) + " más</span>";
        return (
            '<div class="ciclo-card" data-ciclo-id="' + c.id + '">' +
            '  <div class="ciclo-card-header">' +
            '    <span class="ciclo-card-num">Ciclo ' + (idx + 1) + '</span>' +
            '    <span class="ciclo-card-nombre">' + escapeHtml(c.nombre) + '</span>' +
            '  </div>' +
            '  <p class="ciclo-card-fechas">' + (c.fecha_inicio ? formatFechaAR(c.fecha_inicio) : "—") + ' – ' + (c.fecha_fin ? formatFechaAR(c.fecha_fin) : "—") + '</p>' +
            '  <p class="ciclo-card-objetivo"><strong>Objetivo:</strong> ' + (c.objetivo_principal ? escapeHtml(c.objetivo_principal) : '<span class="text-muted">Sin definir</span>') + '</p>' +
            '  <p class="ciclo-card-count">Entrenamientos: <strong>' + count + '</strong></p>' +
            (entLinks ? '<p class="ciclo-card-entrenamientos">' + entLinks + '</p>' : '') +
            '  <button type="button" class="btn-editar-small" onclick="editarCiclo(' + plan.id + ',' + c.id + ')">Editar ciclo</button>' +
            '</div>'
        );
    }).join("");

    contentDiv.innerHTML = (
        '<section class="manual-section planificacion-view">' +
        '  <div class="planificacion-header">' +
        '    <button type="button" class="btn-back" onclick="renderPlanificacionAnualView()">← Volver a planificaciones</button>' +
        '    <h2>' + escapeHtml(plan.nombre || "Planificación " + plan.temporada) + '</h2>' +
        '  </div>' +
        '  <p class="planificacion-anual-meta">' + escapeHtml(plan.categoria || "—") + ' · Temporada ' + plan.temporada + '</p>' +
        '  <h3 class="section-title">Ciclos bimestrales</h3>' +
        '  <div class="ciclos-grid" id="ciclos-grid">' + ciclosHtml + '</div>' +
        '</section>' +
        '<div id="modal-ciclo" class="modal" style="display:none;">' +
        '  <div class="modal-content">' +
        '    <h3>Editar ciclo</h3>' +
        '    <form id="form-ciclo">' +
        '      <input type="hidden" name="planificacion_id" id="ciclo-planificacion-id">' +
        '      <input type="hidden" name="ciclo_id" id="ciclo-id-input">' +
        '      <div class="form-row"><label>Objetivo principal</label><input type="text" name="objetivo_principal" id="ciclo-objetivo" placeholder="Ej: Dribbling"></div>' +
        '      <div class="form-row"><label>Fundamentos trabajados</label><input type="text" name="fundamentos_trabajados" id="ciclo-fundamentos" placeholder="Ej: Crossover, between legs"></div>' +
        '      <div class="form-row"><label>Notas</label><textarea name="notas" id="ciclo-notas" rows="2"></textarea></div>' +
        '      <div class="form-actions">' +
        '        <button type="submit" class="toolbar-button toolbar-button-accent">Guardar</button>' +
        '        <button type="button" class="toolbar-button" onclick="cerrarModalCiclo()">Cancelar</button>' +
        '      </div>' +
        '    </form>' +
        '  </div>' +
        '</div>'
    );

    var formCiclo = document.getElementById("form-ciclo");
    if (formCiclo) {
        formCiclo.onsubmit = function (ev) {
            ev.preventDefault();
            var planId = parseInt(document.getElementById("ciclo-planificacion-id").value, 10);
            var cicloId = parseInt(document.getElementById("ciclo-id-input").value, 10);
            var listP = getPlanificacionesAnuales();
            var plan = listP.find(function (p) { return p.id === planId; });
            if (!plan || !plan.ciclos) return;
            var ciclo = plan.ciclos.find(function (c) { return c.id === cicloId; });
            if (!ciclo) return;
            ciclo.objetivo_principal = document.getElementById("ciclo-objetivo").value.trim();
            ciclo.fundamentos_trabajados = document.getElementById("ciclo-fundamentos").value.trim();
            ciclo.notas = document.getElementById("ciclo-notas").value.trim();
            savePlanificacionesAnuales(listP);
            cerrarModalCiclo();
            renderPlanificacionAnualDetalleView(planId);
        };
    }
}

function editarCiclo(planificacionId, cicloId) {
    var list = getPlanificacionesAnuales();
    var plan = list.find(function (p) { return p.id === planificacionId; });
    if (!plan || !plan.ciclos) return;
    var ciclo = plan.ciclos.find(function (c) { return c.id === cicloId; });
    if (!ciclo) return;
    document.getElementById("ciclo-planificacion-id").value = planificacionId;
    document.getElementById("ciclo-id-input").value = cicloId;
    document.getElementById("ciclo-objetivo").value = ciclo.objetivo_principal || "";
    document.getElementById("ciclo-fundamentos").value = ciclo.fundamentos_trabajados || "";
    document.getElementById("ciclo-notas").value = ciclo.notas || "";
    document.getElementById("modal-ciclo").style.display = "flex";
}

function cerrarModalCiclo() {
    var modal = document.getElementById("modal-ciclo");
    if (modal) modal.style.display = "none";
}

// ===============================
// CONTENIDO TEÓRICO / MANUALES
// ===============================

function loadContent(sectionId) {
    const contentDiv = document.getElementById("content");

    if (!contentDiv) return;

    // Fundamentos: ventajas, desventajas, momentos
    if (sectionId.startsWith("fund_") && typeof window.FUNDAMENTOS_CONTENIDO !== "undefined" && window.FUNDAMENTOS_CONTENIDO[sectionId]) {
        const f = window.FUNDAMENTOS_CONTENIDO[sectionId];
        const ventajas = (f.ventajas || []).map(function (v) { return "<li>" + v + "</li>"; }).join("");
        const desventajas = (f.desventajas || []).map(function (d) { return "<li>" + d + "</li>"; }).join("");
        const momentos = (f.momentos || []).map(function (m) { return "<li>" + m + "</li>"; }).join("");
        contentDiv.innerHTML = (
            "<section class=\"manual-section\">" +
            "<h2>" + (f.nombre || sectionId) + "</h2>" +
            "<h3 class=\"section-title\">Ventajas</h3><ul>" + ventajas + "</ul>" +
            "<h3 class=\"section-title\">Desventajas</h3><ul>" + desventajas + "</ul>" +
            "<h3 class=\"section-title\">Momentos convenientes</h3><ul>" + momentos + "</ul>" +
            "</section>"
        );
        return;
    }

    if (sectionId === "planificacion_anual") {
        renderPlanificacionAnualView();
        return;
    }
    if (sectionId.indexOf("planificacion_anual_") === 0) {
        var planId = parseInt(sectionId.replace("planificacion_anual_", ""), 10);
        if (!isNaN(planId)) renderPlanificacionAnualDetalleView(planId);
        return;
    }

    switch (sectionId) {
        case "zone23_defense":
            contentDiv.innerHTML = `
                <section class="manual-section">
                    <h2>Defensa en zona 2-3</h2>
                    <p>
                        La defensa <strong>2-3</strong> coloca a dos jugadores en la primera línea (perímetro alto)
                        y tres jugadores en la segunda línea (cerca de la pintura y el rebote). Es una defensa muy
                        utilizada para proteger la zona cercana al aro y obligar a tiros exteriores.
                    </p>

                    <h3 class="section-title">Principios clave de la 2-3</h3>
                    <ul>
                        <li><strong>Protección de la pintura</strong>: los tres jugadores de la segunda línea cuidan el aro, el rebote y las penetraciones.</li>
                        <li><strong>Control del balón</strong>: los dos de arriba presionan al base y niegan pases cómodos al medio.</li>
                        <li><strong>Desplazamientos en bloque</strong>: la zona se mueve como un bloque, no de forma individual.</li>
                        <li><strong>Comunicación constante</strong>: hablar en cada corte, bloqueo y cambio de lado del balón.</li>
                        <li><strong>Cerrar esquinas</strong>: reaccionar rápido a los pases a la esquina (corner) para evitar triples liberados.</li>
                    </ul>

                    <h3 class="section-title">Ventajas para el equipo defensor</h3>
                    <ul>
                        <li>Protege muy bien el juego interior y las penetraciones.</li>
                        <li>Permite que jugadores más lentos sean eficientes si se mueven en sincronía.</li>
                        <li>Castiga equipos que no tienen tiro exterior consistente.</li>
                    </ul>

                    <h3 class="section-title">Debilidades que el ataque puede castigar</h3>
                    <ul>
                        <li>Espacios entre los dos jugadores de arriba y los tres de abajo (zona de tiro libre / high post).</li>
                        <li>Esquinas (corners), sobre todo si la rotación llega tarde.</li>
                        <li>Rebote ofensivo si la defensa no bloquea bien.</li>
                        <li>Rotaciones tardías ante circulación rápida de balón y cambios de lado.</li>
                    </ul>

                    <h3 class="section-title">Videos: ataques contra zona 2-3</h3>
                    <p>
                        Estos videos muestran ideas y sistemas para atacar una defensa 2-3. Podés usarlos como referencia
                        y luego recrear las jugadas en la pizarra virtual.
                    </p>

                    <div class="video-grid">
                        <div class="video-card">
                            <h4>Sistema básico vs 2-3</h4>
                            <div class="video-wrapper">
                                <iframe
                                    src="https://www.youtube.com/watch?v=zFE8jaPHVvE"
                                    title="Ataque básico vs zona 2-3"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>

                        <div class="video-card">
                            <h4>Uso del high post</h4>
                            <div class="video-wrapper">
                                <iframe
                                    src="https://www.youtube.com/watch?v=efu6uh8c_W0"
                                    title="High post vs 2-3"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>
                    </div>
                </section>
            `;
            break;

        case "zone32_defense":
            contentDiv.innerHTML = `
                <section class="manual-section">
                    <h2>Defensa en zona 3-2</h2>
                    <p>
                        La defensa 3-2 prioriza la presión sobre los tiradores exteriores, con tres jugadores en la parte alta
                        del perímetro y dos cerca del aro. Es útil contra equipos que dependen mucho del tiro de 3 puntos.
                    </p>
                    <p>
                        Próximamente podés ampliar esta sección con principios detallados, variantes y videos específicos
                        según tus preferencias.
                    </p>
                </section>
            `;
            break;

        case "zone131_defense":
            contentDiv.innerHTML = `
                <section class="manual-section">
                    <h2>Defensa en zona 1-3-1</h2>
                    <p>
                        La 1-3-1 coloca un jugador arriba, tres en la línea media y uno protegiendo el aro. Genera muchas
                        trampas en las bandas y esquinas, pero puede dejar espacios en el rebote y en la esquina contraria.
                    </p>
                    <p>
                        Podés usar esta sección para documentar tus reglas, rotaciones y clips de video favoritos.
                    </p>
                </section>
            `;
            break;

        case "fullcourt":
            contentDiv.innerHTML = `
                <section class="manual-section">
                    <h2>Presión Full Court</h2>
                    <p>
                        La <strong>presión a toda la cancha</strong> busca incomodar la salida del rival desde el saque de fondo,
                        forzar errores, acelerar decisiones y robar balones antes de que crucen mitad de cancha.
                    </p>

                    <h3 class="section-title">Objetivos principales</h3>
                    <ul>
                        <li>Quitar ritmo al base rival desde la recepción.</li>
                        <li>Forzar pases largos o arriesgados que puedan ser interceptados.</li>
                        <li>Generar pérdidas rápidas para anotar en transición.</li>
                        <li>Cansar físicamente y mentalmente al rival.</li>
                    </ul>

                    <h3 class="section-title">Fundamentos de la presión full court</h3>
                    <ul>
                        <li><strong>Posición defensiva baja</strong> y desplazamientos laterales constantes.</li>
                        <li><strong>Orientar al atacante</strong> hacia la banda o hacia una trampa predefinida.</li>
                        <li><strong>Comunicación</strong>: avisar cambios, ayudas, cortinas y líneas de pase.</li>
                        <li><strong>No dejar girar cómodo</strong> al manejador de balón.</li>
                        <li><strong>Volver rápido</strong> si el rival supera la presión, para no regalar bandejas fáciles.</li>
                    </ul>

                    <h3 class="section-title">Videos de referencia</h3>
                    <div class="video-grid">
                        <div class="video-card">
                            <h4>Presión individual a toda la cancha</h4>
                            <div class="video-wrapper">
                                <iframe
                                    src="https://www.youtube.com/embed/2Vv-BfVoq4g"
                                    title="Full court individual"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>

                        <div class="video-card">
                            <h4>Principios de presión a toda la cancha</h4>
                            <div class="video-wrapper">
                                <iframe
                                    src="https://www.youtube.com/embed/fRh_vgS2dFE"
                                    title="Principios full court"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>
                    </div>
                </section>
            `;
            break;

        case "doubleteam":
            contentDiv.innerHTML = `
                <section class="manual-section">
                    <h2>Presión con Double Team</h2>
                    <p>
                        El <strong>double team</strong> consiste en atrapar al jugador con balón con dos defensores, reduciendo sus
                        opciones de pase y bote para forzar pérdidas o malos tiros.
                    </p>

                    <h3 class="section-title">Principios del double team</h3>
                    <ul>
                        <li>Elegir bien el <strong>lugar de la trampa</strong> (bandas, esquinas, mitad de cancha).</li>
                        <li>Llegar a la trampa <strong>explosivos y con los brazos activos</strong>.</li>
                        <li>Que ninguno de los dos defensores permita el <strong>split</strong> (que el atacante se meta entre ellos).</li>
                        <li>Que el resto del equipo <strong>rote</strong> para tapar líneas de pase cercanas.</li>
                    </ul>

                    <h3 class="section-title">Riesgos y cómo cubrirlos</h3>
                    <ul>
                        <li>Dejar un jugador completamente solo si las rotaciones no llegan a tiempo.</li>
                        <li>Fouls innecesarios si se usan mal las manos en la trampa.</li>
                        <li>Ser castigados con pases largos si nadie protege la espalda de la defensa.</li>
                    </ul>

                    <h3 class="section-title">Videos de referencia</h3>
                    <div class="video-grid">
                        <div class="video-card">
                            <h4>Trampas en banda</h4>
                            <div class="video-wrapper">
                                <iframe
                                    src="https://www.youtube.com/embed/JGwWNGJdvx8"
                                    title="Double team en banda"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>
                    </div>
                </section>
            `;
            break;

        case "press221":
            contentDiv.innerHTML = `
                <section class="manual-section">
                    <h2>Presión 2-2-1</h2>
                    <p>
                        La <strong>presión 2-2-1</strong> es una defensa a toda la cancha o tres cuartos de cancha organizada en
                        dos líneas de dos jugadores y un jugador de seguridad más cercano al aro. Combina agresividad con
                        cierta protección del fondo.
                    </p>

                    <h3 class="section-title">Estructura básica 2-2-1</h3>
                    <ul>
                        <li>Dos jugadores en la primera línea presionando la salida y orientando el balón.</li>
                        <li>Dos jugadores en la segunda línea preparados para atrapar (trampa) y robar líneas de pase.</li>
                        <li>Un jugador atrás (último hombre) cuidando el aro y cortando pases largos.</li>
                    </ul>

                    <h3 class="section-title">Objetivos de la 2-2-1</h3>
                    <ul>
                        <li>Forzar al rival a subir el balón por las bandas.</li>
                        <li>Armar trampas en la línea de banda y mitad de cancha.</li>
                        <li>Robar balones en pases horizontales o cruzados.</li>
                        <li>Hacer que el rival pierda segundos de posesión antes de organizar su ataque.</li>
                    </ul>

                    <h3 class="section-title">Fundamentos y reglas para los jugadores</h3>
                    <ul>
                        <li><strong>Primera línea</strong>: orientar el balón hacia la banda, no ser superados por el medio.</li>
                        <li><strong>Segunda línea</strong>: leer la mirada del manejador, anticipar pases y llegar fuerte a la trampa.</li>
                        <li><strong>Último hombre</strong>: estar siempre un paso por detrás de la jugada, cuidando pases largos y cortes al aro.</li>
                        <li><strong>Todos</strong>: hablar constantemente, señalar cortes y cambios de lado.</li>
                    </ul>

                    <h3 class="section-title">Cuándo soltar la presión</h3>
                    <ul>
                        <li>Cuando el rival supera limpiamente la segunda línea con control del balón.</li>
                        <li>Cuando el reloj de posesión ya está bajo y conviene volver a una defensa más compacta.</li>
                        <li>Si el equipo está muy cargado de faltas y se necesita bajar el riesgo.</li>
                    </ul>

                    <h3 class="section-title">Videos: ejemplo de presión 2-2-1</h3>
                    <div class="video-grid">
                        <div class="video-card">
                            <h4>Estructura y rotaciones 2-2-1</h4>
                            <div class="video-wrapper">
                                <iframe
                                    src="https://www.youtube.com/embed/hT_nvWreIhg"
                                    title="Presión 2-2-1 estructura"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>

                        <div class="video-card">
                            <h4>Trampas y robos en 2-2-1</h4>
                            <div class="video-wrapper">
                                <iframe
                                    src="https://www.youtube.com/embed/kJQP7kiw5Fk"
                                    title="Presión 2-2-1 traps"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>
                    </div>
                </section>
            `;
            break;

        case "plays_library":
            loadSavedPlaysFromStorage();

            if (!savedPlays.length) {
                contentDiv.innerHTML = `
                    <section class="manual-section">
                        <h2>Biblioteca de jugadas</h2>
                        <p>Todavía no hay jugadas guardadas. Diseñá una en la pizarra virtual y usá el botón "Guardar jugada" para que aparezca acá.</p>
                    </section>
                `;
                break;
            }

            let playsHtml = `
                <section class="manual-section">
                    <h2>Biblioteca de jugadas</h2>
                    <p>Acá podés ver las jugadas guardadas como una secuencia de pasos (imágenes de la pizarra).</p>
                    <div class="plays-library">
            `;

            savedPlays.forEach(play => {
                playsHtml += `
                    <article class="play-card">
                        <div class="play-card-header">
                            <h3>${play.name}</h3>
                            <button class="play-delete-button" onclick="deletePlay(${play.id})">Borrar</button>
                        </div>
                        <div class="play-steps-grid">
                `;

                (play.steps || []).forEach((stepUrl, idx) => {
                    playsHtml += `
                        <div class="play-step-card">
                            <span class="play-step-label">Paso ${idx + 1}</span>
                            <img src="${stepUrl}" alt="Paso ${idx + 1} de ${play.name}">
                        </div>
                    `;
                });

                playsHtml += `
                        </div>
                    </article>
                `;
            });

            playsHtml += `
                    </div>
                </section>
            `;

            contentDiv.innerHTML = playsHtml;
            break;

        case "vs23":
            contentDiv.innerHTML = `
                <section class="manual-section">
                    <h2>Ataques vs zona 2-3</h2>
                    <p>
                        Esta sección se enfoca en sistemas ofensivos específicos para atacar una defensa 2-3. Podés combinar
                        las ideas de aquí con la pizarra virtual para diseñar tus propias jugadas.
                    </p>
                    <h3 class="section-title">Principios para atacar la 2-3</h3>
                    <ul>
                        <li>Ocupar el <strong>high post</strong> (zona de tiro libre) con un jugador que pueda pasar, tirar o atacar.</li>
                        <li>Colocar tiradores en las <strong>esquinas</strong> para abrir la defensa y castigar rotaciones lentas.</li>
                        <li>Usar <strong>cortes desde el lado débil</strong> hacia la espalda de la segunda línea (especialmente desde la esquina opuesta).</li>
                        <li>Jugar <strong>pick and roll</strong> entre el base y un interior en la parte alta para colapsar la zona.</li>
                        <li>Invertir el balón rápidamente (lado a lado) para llegar a tiros abiertos o ventajas en closeout.</li>
                    </ul>

                    <h3 class="section-title">Ideas de organización ofensiva</h3>
                    <ul>
                        <li>Estructuras <strong>1-3-1</strong> o <strong>3-2</strong> de ataque para cargar high post y esquinas.</li>
                        <li>Utilizar un interior móvil que pueda jugar short corner y high post.</li>
                        <li>Jugar con dos jugadores en el perímetro alto que alternen penetrar y descargar.</li>
                    </ul>
                </section>
            `;
            break;

        case "abierto":
            contentDiv.innerHTML = `
                <section class="manual-section">
                    <h2>Sistema Abierto (5 abiertos / 4 abiertos)</h2>
                    <p>
                        Llamamos <strong>sistema abierto</strong> a las estructuras ofensivas donde no hay un pívot fijo
                        ocupando la pintura, sino que los cinco (o cuatro) jugadores se colocan en el perímetro, dejando
                        el espacio central libre para las penetraciones y cortes.
                    </p>

                    <h3 class="section-title">Principios del juego abierto</h3>
                    <ul>
                        <li><strong>Espaciado</strong>: mantener buenas distancias entre compañeros para que haya líneas claras de penetración y pase.</li>
                        <li><strong>Lectura de ventajas</strong>: atacar closeouts largos, defensores mal parados o cambios defensivos lentos.</li>
                        <li><strong>Juego sin balón</strong>: cortes backdoor, reemplazos y relocaciones después de cada drive o pase.</li>
                        <li><strong>Movimiento continuo</strong>: evitar que el balón se estanque; pase, corte, reemplazo.</li>
                        <li><strong>Todos amenazan</strong>: aunque no todos tiren igual, todos deben ser una amenaza de pase, tiro o penetración.</li>
                    </ul>

                    <h3 class="section-title">Fundamentos técnicos que exige</h3>
                    <ul>
                        <li>Capacidad de <strong>jugar 1c1</strong> desde el perímetro (lectura de ayudas y descargas).</li>
                        <li><strong>Tiro exterior</strong> suficientemente respetable para abrir la defensa.</li>
                        <li><strong>Pases firmes y a tiempo</strong> (extra pass, skip pass, pocket pass en penetración).</li>
                        <li>Lectura de <strong>cortes backdoor</strong> cuando el defensor niega línea de pase.</li>
                    </ul>

                    <h3 class="section-title">Cuándo usar un sistema abierto</h3>
                    <ul>
                        <li>Cuando tenés muchos exteriores con buena técnica y lectura de juego.</li>
                        <li>Contra defensas que ayudan demasiado desde el lado fuerte.</li>
                        <li>Para castigar pívots lentos que quedan defendiendo en el perímetro tras cambios defensivos.</li>
                    </ul>

                    <h3 class="section-title">Videos de referencia de juego abierto</h3>
                    <p>
                        Estos ejemplos muestran ideas de juego 5-out / 4-out, con énfasis en spacing, cortes y decisiones
                        tras la penetración.
                    </p>

                    <div class="video-grid">
                        <div class="video-card">
                            <h4>Conceptos básicos 5-out</h4>
                            <div class="video-wrapper">
                                <iframe
                                    src="https://www.youtube.com/embed/1xXNoB3t8vM"
                                    title="Conceptos 5-out"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>

                        <div class="video-card">
                            <h4>Penetrar y pasar (drive & kick)</h4>
                            <div class="video-wrapper">
                                <iframe
                                    src="https://www.youtube.com/embed/Pkh8UtuejGw"
                                    title="Drive and kick"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>
                    </div>
                </section>
            `;
            break;

        case "cerrado":
            contentDiv.innerHTML = `
                <section class="manual-section">
                    <h2>Sistema Cerrado (con pívot interior)</h2>
                    <p>
                        En el <strong>sistema cerrado</strong> se estructura el ataque alrededor de uno o dos jugadores interiores
                        que ocupan la pintura (poste bajo / poste alto). El objetivo es generar ventajas desde el juego interior,
                        obligando ayudas y liberando tiros exteriores.
                    </p>

                    <h3 class="section-title">Principios del juego cerrado</h3>
                    <ul>
                        <li><strong>Buscar la ventaja interior</strong>: postear al jugador con ventaja de tamaño o de uno contra uno.</li>
                        <li><strong>Jugar adentro-fuera</strong>: pasar al poste y, ante ayuda, castigar con tiros exteriores o cortes.</li>
                        <li><strong>Ocupar poste alto y poste bajo</strong>: según la defensa, alternar entre high-low, duck-ins y sellos.</li>
                        <li><strong>Paciencia</strong>: mover el balón hasta encontrar la mejor posición interior posible.</li>
                    </ul>

                    <h3 class="section-title">Fundamentos técnicos necesarios</h3>
                    <ul>
                        <li><strong>Juego de pies en el poste</strong> (drop step, giro, gancho, face-up).</li>
                        <li><strong>Sellar</strong> a su defensor para ganar la línea de pase.</li>
                        <li><strong>Lectura de ayudas</strong>: sacar el balón cuando llegan dos o tres defensores.</li>
                        <li>En el perímetro, capacidad de <strong>meter tiros abiertos</strong> tras pase adentro-fuera.</li>
                    </ul>

                    <h3 class="section-title">Cuándo usar un sistema cerrado</h3>
                    <ul>
                        <li>Cuando tenés un interior dominante o con clara ventaja física.</li>
                        <li>Contra defensas que no ayudan bien desde el lado débil.</li>
                        <li>Para castigar defensas pequeñas o equipos que cambian todo sin tener protección del aro.</li>
                    </ul>

                    <h3 class="section-title">Videos de referencia de juego interior</h3>
                    <p>
                        En estos videos se ven conceptos de juego al poste, high-low y lectura de ayudas, que podés adaptar
                        a tu sistema cerrado.
                    </p>

                    <div class="video-grid">
                        <div class="video-card">
                            <h4>Juego al poste bajo</h4>
                            <div class="video-wrapper">
                                <iframe
                                    src="https://www.youtube.com/embed/9bZkp7q19f0"
                                    title="Poste bajo fundamentos"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>

                        <div class="video-card">
                            <h4>High-low y lecturas</h4>
                            <div class="video-wrapper">
                                <iframe
                                    src="https://www.youtube.com/embed/3JZ_D3ELwOQ"
                                    title="High-low juego interior"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>
                    </div>
                </section>
            `;
            break;

        case "vs131":
            contentDiv.innerHTML = `
                <section class="manual-section">
                    <h2>Ataques vs zona 1-3-1</h2>
                    <p>
                        Estrategias para castigar los espacios libres que deja la 1-3-1, especialmente la esquina débil y las
                        espaldas del único jugador bajo.
                    </p>
                    <h3 class="section-title">Puntos débiles típicos</h3>
                    <ul>
                        <li>Esquina contraria al balón (corner débil).</li>
                        <li>Espalda del jugador que protege el aro.</li>
                        <li>Zona central si el jugador de arriba llega tarde tras inversión de balón.</li>
                    </ul>

                    <h3 class="section-title">Conceptos de ataque recomendados</h3>
                    <ul>
                        <li>Colocar un jugador inteligente en el <strong>poste alto</strong> para recibir y decidir.</li>
                        <li>Ocupar ambas esquinas para obligar a la defensa a estirarse.</li>
                        <li>Usar cortes desde el lado débil hacia la línea de fondo, detrás de la línea de tres de la defensa.</li>
                        <li>Evitar botar de más en las bandas, donde la 1-3-1 suele trampa.</li>
                    </ul>
                </section>
            `;
            break;

        case "vs32":
            contentDiv.innerHTML = `
                <section class="manual-section">
                    <h2>Ataques vs zona 3-2</h2>
                    <p>
                        Conceptos ofensivos para atacar una 3-2: uso de corto roll, ocupación de esquinas y cortes desde el lado débil.
                    </p>
                    <h3 class="section-title">Principios ofensivos</h3>
                    <ul>
                        <li>Aprovechar los espacios a la espalda de la primera línea (entre los tres de arriba y los dos de abajo).</li>
                        <li>Atacar desde las <strong>esquinas</strong> para obligar a rotaciones largas.</li>
                        <li>Utilizar <strong>corto roll</strong> o poste alto para recibir tras bloqueo directo.</li>
                        <li>Jugar con cortes desde el lado débil hacia la zona de dunker spot (línea de fondo cercana al aro).</li>
                    </ul>
                </section>
            `;
            break;

        case "vs41":
            contentDiv.innerHTML = `
                <section class="manual-section">
                    <h2>Ataques vs zona 4-1</h2>
                    <p>
                        Ideas para atacar estructuras 4-1, aprovechando los espacios en la parte alta y la debilidad en las ayudas largas.
                    </p>
                    <h3 class="section-title">Ideas de juego</h3>
                    <ul>
                        <li>Atacar la parte alta con bloqueos directos y hand-offs para desordenar la primera línea.</li>
                        <li>Cargar el rebote ofensivo desde el perímetro cuando las ayudas salen muy lejos.</li>
                        <li>Usar cortes desde el lado débil hacia el aro aprovechando los espacios creados por los cuatro exteriores.</li>
                    </ul>
                </section>
            `;
            break;

        case "planificacion":
            renderPlanificacionView();
            break;

        case "dashboard":
            renderDashboard();
            break;

        default:
            contentDiv.innerHTML = `
                <h2>Bienvenido a Basket Lab</h2>
                <p>Seleccioná un sistema en el menú izquierdo para ver el contenido.</p>
            `;
    }
}

// ===============================
// DASHBOARD
// ===============================

var COACHING_TIPS = [
    "El spacing ofensivo genera mejores ángulos de pase y líneas de pase más claras.",
    "En defensa, la comunicación es clave: llamar bloqueos, cortes y cambios de balón.",
    "El tiro libre se entrena: dedicar 10 minutos por práctica mejora los porcentajes.",
    "Un buen rebote defensivo termina con un pase de salida rápido al base.",
    "La lectura del defensor abre el juego: si cierra la mano, crossover; si retrocede, tiro.",
    "El pick and roll exige que el bloqueador abra bien el ángulo y el balón llegue a tiempo.",
    "En zona, mover el balón de lado a lado antes de penetrar abre más opciones.",
    "La defensa en ayuda debe ser breve: ayudar y recuperar a tu hombre."
];

function getNextEntrenamiento() {
    var list = getEntrenamientos();
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var next = null;
    list.forEach(function (e) {
        var d = e.fecha ? new Date(e.fecha) : null;
        if (!d) return;
        d.setHours(0, 0, 0, 0);
        if (d >= today && (!next || d < new Date(next.fecha))) next = e;
    });
    return next;
}

function renderDashboard() {
    var contentDiv = document.getElementById("content");
    if (!contentDiv) return;

    loadSavedPlaysFromStorage();
    var user = getCurrentUser();
    var userName = (user && (user.name || user.username)) ? user.name || user.username : "Entrenador";
    var entrenamientos = getEntrenamientos();
    var nextEnt = getNextEntrenamiento();
    var tip = COACHING_TIPS[Math.floor(Math.random() * COACHING_TIPS.length)];

    contentDiv.innerHTML = (
        '<div class="dashboard">' +
        '  <header class="dashboard-header">' +
        '    <h1 class="dashboard-title">Bienvenido ' + userName + ' 👋</h1>' +
        '    <p class="dashboard-subtitle">Panel del entrenador</p>' +
        '  </header>' +
        '  <div class="dashboard-grid">' +
        '    <div class="dashboard-card stat-card">' +
        '      <div class="stat-card-icon">📅</div>' +
        '      <div class="stat-card-content">' +
        '        <span class="stat-card-value">' + entrenamientos.length + '</span>' +
        '        <span class="stat-card-label">Entrenamientos creados</span>' +
        '      </div>' +
        '    </div>' +
        '    <div class="dashboard-card stat-card">' +
        '      <div class="stat-card-icon">🏀</div>' +
        '      <div class="stat-card-content">' +
        '        <span class="stat-card-value">0</span>' +
        '        <span class="stat-card-label">Ejercicios guardados</span>' +
        '      </div>' +
        '    </div>' +
        '    <div class="dashboard-card stat-card">' +
        '      <div class="stat-card-icon">📋</div>' +
        '      <div class="stat-card-content">' +
        '        <span class="stat-card-value">' + savedPlays.length + '</span>' +
        '        <span class="stat-card-label">Jugadas guardadas</span>' +
        '      </div>' +
        '    </div>' +
        '    <div class="dashboard-card dashboard-card--wide dashboard-card-next">' +
        '      <h3 class="dashboard-card-title">Próximo entrenamiento</h3>' +
        (nextEnt
            ? (
                '      <p class="dashboard-card-meta"><span class="dashboard-card-cat">' + (nextEnt.categoria || "General") + '</span></p>' +
                '      <p class="dashboard-card-date">' + (nextEnt.fecha || "—") + '</p>' +
                '      <p class="dashboard-card-duration">Duración: ' + (calcularDuracionTotal(nextEnt.bloques) || 0) + ' min</p>' +
                '      <button type="button" class="dashboard-btn dashboard-btn-accent" onclick="loadContent(\'planificacion\')">Iniciar entrenamiento</button>'
            )
            : (
                '      <p class="dashboard-card-empty">No hay entrenamientos programados</p>' +
                '      <button type="button" class="dashboard-btn" onclick="loadContent(\'planificacion\')">Planificar entrenamiento</button>'
            )) +
        '    </div>' +
        '    <div class="dashboard-card dashboard-card-actions">' +
        '      <h3 class="dashboard-card-title">Acciones rápidas</h3>' +
        '      <div class="dashboard-quick-actions">' +
        '        <button type="button" class="quick-action-btn" onclick="loadContent(\'planificacion\')"><span class="quick-action-icon">📅</span><span>Crear entrenamiento</span></button>' +
        '        <button type="button" class="quick-action-btn" onclick="loadContent(\'fundamentos\')"><span class="quick-action-icon">🏀</span><span>Ver fundamentos</span></button>' +
        '        <button type="button" class="quick-action-btn" onclick="loadContent(\'pizarra\')"><span class="quick-action-icon">✏️</span><span>Dibujar jugada</span></button>' +
        '        <button type="button" class="quick-action-btn" onclick="loadContent(\'plays_library\')"><span class="quick-action-icon">📚</span><span>Ver biblioteca de jugadas</span></button>' +
        '      </div>' +
        '    </div>' +
        '    <div class="dashboard-card dashboard-card-tip">' +
        '      <h3 class="dashboard-card-title">Tip de coaching</h3>' +
        '      <p class="dashboard-tip-text">"' + tip + '"</p>' +
        '    </div>' +
        '  </div>' +
        '</div>'
    );
}


// ===============================
// CARGA DE PIZARRA
// ===============================

function loadBoard() {
    const contentDiv = document.getElementById("content");

    contentDiv.innerHTML = `
        <h2>Pizarra Virtual</h2>

        <div class="board-toolbar">
            <button class="toolbar-button" onclick="addAttackers()">Agregar Atacantes</button>
            <button class="toolbar-button" onclick="addDefenders()">Agregar Defensores</button>
            <button class="toolbar-button" onclick="addBall()">Agregar Pelota</button>

            <button class="toolbar-button" onclick="setLineType('normal')">Línea Normal</button>
            <button class="toolbar-button" onclick="setLineType('dashed')">Línea Punteada</button>
            <button class="toolbar-button" onclick="setLineType('zigzag')">Línea Víbora</button>
            <button class="toolbar-button" onclick="setLineType('screen')">Línea Bloqueo</button>

            <button class="toolbar-button" onclick="deleteLastLine()">Borrar Última Línea</button>
            <button class="toolbar-button" onclick="clearBoard()">Limpiar Pizarra</button>

            <button class="toolbar-button toolbar-button-accent" onclick="capturePlayStep()">Guardar paso</button>
            <button class="toolbar-button toolbar-button-accent" onclick="saveCurrentPlay()">Guardar jugada</button>
            <button class="toolbar-button" onclick="clearCurrentPlaySteps()">Borrar pasos jugada</button>
        </div>

        <div class="board-layout">
            <div class="board-canvas-wrapper">
                <canvas id="cancha" width="800" height="600"
                    style="border:2px solid black;">
                </canvas>
            </div>
            <aside id="current-play-steps" class="play-steps-container"></aside>
        </div>
    `;

    currentPlaySteps = [];

    initBoard();
    renderCurrentPlaySteps();
}


// ===============================
// INICIALIZAR CANVAS
// ===============================

function initBoard() {

    canvas = document.getElementById("cancha");
    ctx = canvas.getContext("2d");

    // Ratón
    canvas.addEventListener("mousedown", startDrag);
    canvas.addEventListener("mousemove", drag);
    canvas.addEventListener("mouseup", stopDrag);
    canvas.addEventListener("mouseleave", stopDrag);
    canvas.addEventListener("click", function (e) {
        // Si el último evento fue táctil, ignoramos este click sintético
        if (lineHandledByTouch) {
            lineHandledByTouch = false;
            return;
        }
        handleLineClick(e);
    });

    // Tactil (Android, iOS): mismos handlers con getEventCoords
    canvas.addEventListener("touchstart", function (e) {
        if (e.cancelable) e.preventDefault();
        startDrag(e);
    }, { passive: false });
    canvas.addEventListener("touchmove", function (e) {
        if (dragging && e.cancelable) e.preventDefault();
        drag(e);
    }, { passive: false });
    canvas.addEventListener("touchend", function (e) {
        if (isLineMode && !dragging && e.changedTouches && e.changedTouches.length > 0) {
            // Dibujar la línea usando el toque final y marcar que este gesto ya se manejó,
            // para que el click sintético posterior no vuelva a dibujar.
            var t = e.changedTouches[0];
            handleLineClick({ clientX: t.clientX, clientY: t.clientY, touches: [], changedTouches: e.changedTouches });
            lineHandledByTouch = true;
        }
        stopDrag();
    }, { passive: true });
    canvas.addEventListener("touchcancel", stopDrag);

    drawCourt();
}


// ===============================
// AGREGAR JUGADORES
// ===============================

function addAttackers() {
    players = players.filter(p => p.color !== "blue");

    for (let i = 1; i <= 5; i++) {
        players.push({
            x: 200 + i * 60,
            y: 450,
            color: "blue",
            number: i
        });
    }

    drawCourt();
}

function addDefenders() {
    players = players.filter(p => p.color !== "red");

    for (let i = 1; i <= 5; i++) {
        players.push({
            x: 200 + i * 60,
            y: 180,
            color: "red",
            number: i
        });
    }

    drawCourt();
}

function addBall() {
    ball = { x: 400, y: 300 };
    drawCourt();
}


// ===============================
// COORDENADAS CANVAS (responsive: canvas puede estar escalado por CSS)
// ===============================

function getCanvasCoords(clientX, clientY) {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function getEventCoords(e) {
    if (e.touches && e.touches.length > 0) {
        return getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
        return getCanvasCoords(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    return getCanvasCoords(e.clientX, e.clientY);
}

// ===============================
// DRAG & DROP
// ===============================

function startDrag(e) {
    const { x, y } = getEventCoords(e);

    players.forEach(p => {
        const distance = Math.hypot(p.x - x, p.y - y);
        if (distance < 18) {
            selectedPlayer = p;
            dragging = true;
        }
    });

    if (ball) {
        const distance = Math.hypot(ball.x - x, ball.y - y);
        if (distance < 10) {
            selectedPlayer = ball;
            dragging = true;
        }
    }
}

function drag(e) {
    if (!dragging || !selectedPlayer) return;
    const { x, y } = getEventCoords(e);
    selectedPlayer.x = x;
    selectedPlayer.y = y;
    drawCourt();
}

function stopDrag() {
    dragging = false;
    selectedPlayer = null;
}


// ===============================
// LÍNEAS (SIN MODO ACTIVAR)
// ===============================

function setLineType(type) {
    // Si ya estaba ese tipo activo, desactivar el modo líneas
    if (currentLineType === type && isLineMode) {
        isLineMode = false;
        lineStart = null;
        return;
    }

    currentLineType = type;
    lineStart = null;
    isLineMode = true;
}

var lineHandledByTouch = false;

function handleLineClick(e) {
    if (!isLineMode) return;
    const { x, y } = getEventCoords(e);

    if (!lineStart) {
        lineStart = { x, y };
    } else {
        lines.push({
            x1: lineStart.x,
            y1: lineStart.y,
            x2: x,
            y2: y,
            type: currentLineType
        });

        lineStart = null;
        drawCourt();
    }
}

function deleteLastLine() {
    lines.pop();
    drawCourt();
}


// ===============================
// LIMPIAR
// ===============================

function clearBoard() {
    players = [];
    lines = [];
    ball = null;
    drawCourt();
}


// ===============================
// JUGADAS: CAPTURA Y GUARDADO
// ===============================

function capturePlayStep() {
    if (!canvas) {
        canvas = document.getElementById("cancha");
    }
    if (!canvas || !ctx) return;

    const offCanvas = document.createElement("canvas");
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    const offCtx = offCanvas.getContext("2d");

    drawCourtBackground(offCtx, offCanvas.width, offCanvas.height);
    drawScene(offCtx);

    const dataUrl = offCanvas.toDataURL("image/png");
    currentPlaySteps.push(dataUrl);
    renderCurrentPlaySteps();
}

function clearCurrentPlaySteps() {
    currentPlaySteps = [];
    renderCurrentPlaySteps();
}

function saveCurrentPlay() {
    if (!currentPlaySteps.length) {
        alert("No hay pasos guardados para esta jugada.");
        return;
    }

    const name = prompt("Nombre de la jugada:");
    if (!name) return;

    const play = {
        id: Date.now(),
        name,
        steps: currentPlaySteps.slice()
    };

    loadSavedPlaysFromStorage();
    savedPlays.push(play);
    savePlaysToStorage();

    currentPlaySteps = [];
    renderCurrentPlaySteps();

    alert("Jugada guardada en la biblioteca.");
}

function deletePlay(id) {
    loadSavedPlaysFromStorage();
    savedPlays = savedPlays.filter(p => p.id !== id);
    savePlaysToStorage();
    // Recargar la vista de biblioteca
    loadContent("plays_library");
}

function renderCurrentPlaySteps() {
    const container = document.getElementById("current-play-steps");
    if (!container) return;

    if (!currentPlaySteps.length) {
        container.innerHTML = `<p>No hay pasos guardados todavía para esta jugada.</p>`;
        return;
    }

    const total = currentPlaySteps.length;

    let html = `<h3 class="section-title">Pasos de la jugada actual</h3>`;
    html += `<div class="play-steps-grid">`;

    currentPlaySteps.forEach((stepUrl, idx) => {
        html += `
            <div class="play-step-card">
                <span class="play-step-label">Paso ${idx + 1} / ${total}</span>
                <img src="${stepUrl}" alt="Paso ${idx + 1}">
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}


// ===============================
// DIBUJO CANCHA NBA PRO
// ===============================

function drawCourt() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawCourtBackground(ctx, canvas.width, canvas.height);
    drawScene(ctx);
}

function drawCourtBackground(targetCtx, width, height) {
    // Media cancha simple (solo un aro)
    const marginSide = 40;
    const marginBaseline = 40;

    const sidelineLeft = marginSide;
    const sidelineRight = width - marginSide;
    const baselineY = height - marginBaseline;
    const topY = 80;
    const centerX = width / 2;

    // Fondo madera
    targetCtx.fillStyle = "#f5d7a1";
    targetCtx.fillRect(0, 0, width, height);

    targetCtx.strokeStyle = "#b07c3a";
    targetCtx.lineWidth = 4;

    // Rectángulo de media cancha
    targetCtx.strokeRect(sidelineLeft, topY, sidelineRight - sidelineLeft, baselineY - topY);

    // Línea de tres puntos: segmentos rectos separados de la banda (no tocan la línea lateral)
    const rimY = baselineY - 40;
    const threeInset = 14; // distancia chica entre la línea de triple y la banda
    const leftThreeX = sidelineLeft + threeInset;
    const rightThreeX = sidelineRight - threeInset;
    const distToThreeVertical = centerX - leftThreeX;
    const threeRadius = Math.max(220, distToThreeVertical + 6);

    const dxLeft = leftThreeX - centerX;
    const halfChord = Math.sqrt(Math.max(0, threeRadius * threeRadius - dxLeft * dxLeft));
    const yMeetLeft = rimY - halfChord;
    const yMeetRight = rimY - halfChord;

    const angleLeft = Math.atan2(yMeetLeft - rimY, dxLeft);
    const angleRight = Math.atan2(yMeetRight - rimY, rightThreeX - centerX);
    const arcEnd = angleRight <= angleLeft ? angleRight + 2 * Math.PI : angleRight;

    // Trazado continuo: recta izquierda → arco → recta derecha (con separación de la banda)
    targetCtx.beginPath();
    targetCtx.moveTo(leftThreeX, baselineY);
    targetCtx.lineTo(leftThreeX, yMeetLeft);
    targetCtx.arc(centerX, rimY, threeRadius, angleLeft, arcEnd);
    targetCtx.lineTo(rightThreeX, baselineY);
    targetCtx.stroke();

    // Llave (zona pintada)
    const laneWidth = 160;
    const laneHeight = 190;
    const laneX = centerX - laneWidth / 2;
    const laneTopY = baselineY - laneHeight;

    targetCtx.strokeRect(laneX, laneTopY, laneWidth, laneHeight);

    // Línea de tiro libre (horizontal)
    targetCtx.beginPath();
    targetCtx.moveTo(laneX, laneTopY);
    targetCtx.lineTo(laneX + laneWidth, laneTopY);
    targetCtx.stroke();

    // Círculo de tiro libre (solo la parte interior hacia el aro)
    targetCtx.beginPath();
    targetCtx.arc(centerX, laneTopY, 60, Math.PI, 2 * Math.PI);
    targetCtx.stroke();

    // Semicírculo restringido debajo del aro
    const restrictedRadius = 40;
    targetCtx.beginPath();
    targetCtx.arc(centerX, rimY, restrictedRadius, Math.PI, 2 * Math.PI);
    targetCtx.stroke();

    // Aro
    targetCtx.beginPath();
    targetCtx.arc(centerX, rimY, 9, 0, Math.PI * 2);
    targetCtx.stroke();
}

function drawScene(targetCtx) {
    // Líneas tácticas
    lines.forEach(line => {
        targetCtx.strokeStyle = "black";
        targetCtx.lineWidth = 2;
        targetCtx.setLineDash([]);

        if (line.type === "normal") {
            drawCurvedLineOnContext(targetCtx, line, false);
            drawArrowOnContext(targetCtx, line.x1, line.y1, line.x2, line.y2);
        } else if (line.type === "dashed") {
            targetCtx.setLineDash([8, 6]);
            drawCurvedLineOnContext(targetCtx, line, true);
            targetCtx.setLineDash([]);
            drawArrowOnContext(targetCtx, line.x1, line.y1, line.x2, line.y2);
        } else if (line.type === "zigzag") {
            drawZigZagOnContext(targetCtx, line);
        } else if (line.type === "screen") {
            drawScreenLineOnContext(targetCtx, line);
        }
    });

    // Jugadores
    players.forEach(p => {
        targetCtx.beginPath();
        targetCtx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        targetCtx.fillStyle = p.color;
        targetCtx.fill();

        targetCtx.fillStyle = "white";
        targetCtx.font = "bold 14px Arial";
        targetCtx.textAlign = "center";
        targetCtx.textBaseline = "middle";
        targetCtx.fillText(p.number, p.x, p.y);
    });

    // Pelota
    if (ball) {
        targetCtx.beginPath();
        targetCtx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
        targetCtx.fillStyle = "#f57c00";
        targetCtx.fill();
        targetCtx.strokeStyle = "black";
        targetCtx.lineWidth = 2;
        targetCtx.stroke();

        targetCtx.beginPath();
        targetCtx.arc(ball.x, ball.y, 12, 0.5 * Math.PI, 1.5 * Math.PI);
        targetCtx.stroke();

        targetCtx.beginPath();
        targetCtx.moveTo(ball.x - 12, ball.y);
        targetCtx.lineTo(ball.x + 12, ball.y);
        targetCtx.stroke();
    }
}

// Curva suave para las líneas normales/punteadas
function getCurveControlPoint(line) {
    const mx = (line.x1 + line.x2) / 2;
    const my = (line.y1 + line.y2) / 2;
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const dist = Math.hypot(dx, dy) || 1;
    const offset = dist * 0.2; // qué tan curva es la línea
    const angle = Math.atan2(dy, dx);
    // Punto de control desplazado perpendicularmente a la izquierda de la dirección
    const cx = mx - offset * Math.sin(angle);
    const cy = my + offset * Math.cos(angle);
    return { cx, cy };
}

function drawCurvedLineOnContext(targetCtx, line, dashed) {
    const cp = getCurveControlPoint(line);
    targetCtx.beginPath();
    targetCtx.moveTo(line.x1, line.y1);
    targetCtx.quadraticCurveTo(cp.cx, cp.cy, line.x2, line.y2);
    targetCtx.stroke();
}


// ===============================
// FLECHA
// ===============================
function drawArrowOnContext(targetCtx, x1, y1, x2, y2) {

    const headlen = 12;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    targetCtx.beginPath();
    targetCtx.moveTo(x2, y2);
    targetCtx.lineTo(
        x2 - headlen * Math.cos(angle - Math.PI / 6),
        y2 - headlen * Math.sin(angle - Math.PI / 6)
    );
    targetCtx.lineTo(
        x2 - headlen * Math.cos(angle + Math.PI / 6),
        y2 - headlen * Math.sin(angle + Math.PI / 6)
    );
    targetCtx.closePath();
    targetCtx.fillStyle = "black";
    targetCtx.fill();
}

function drawArrow(x1, y1, x2, y2) {
    drawArrowOnContext(ctx, x1, y1, x2, y2);
}


// ===============================
// LÍNEA VÍBORA
// ===============================

function drawZigZag(line) {

    const segments = 25;
    const dx = (line.x2 - line.x1) / segments;
    const dy = (line.y2 - line.y1) / segments;

    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);

    for (let i = 1; i < segments; i++) {
        const x = line.x1 + dx * i;
        const y = line.y1 + dy * i + (i % 2 === 0 ? 8 : -8);
        ctx.lineTo(x, y);
    }

    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();

    drawArrow(line.x1, line.y1, line.x2, line.y2);
}

function drawZigZagOnContext(targetCtx, line) {
    const segments = 25;
    const dx = (line.x2 - line.x1) / segments;
    const dy = (line.y2 - line.y1) / segments;

    targetCtx.beginPath();
    targetCtx.moveTo(line.x1, line.y1);

    for (let i = 1; i < segments; i++) {
        const x = line.x1 + dx * i;
        const y = line.y1 + dy * i + (i % 2 === 0 ? 8 : -8);
        targetCtx.lineTo(x, y);
    }

    targetCtx.lineTo(line.x2, line.y2);
    targetCtx.stroke();

    drawArrowOnContext(targetCtx, line.x1, line.y1, line.x2, line.y2);
}

// ===============================
// LÍNEA BLOQUEO (SCREEN)
// ===============================

function drawScreenLine(line) {

    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;

    // Línea principal
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();

    // Calcular ángulo de la línea
    const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);

    // Longitud de la línea perpendicular
    const size = 15;

    // Punto final
    const x = line.x2;
    const y = line.y2;

    // Dibujar línea perpendicular (la "T")
    ctx.beginPath();
    ctx.moveTo(
        x - size * Math.sin(angle),
        y + size * Math.cos(angle)
    );
    ctx.lineTo(
        x + size * Math.sin(angle),
        y - size * Math.cos(angle)
    );
    ctx.stroke();
}

function drawScreenLineOnContext(targetCtx, line) {
    targetCtx.strokeStyle = "black";
    targetCtx.lineWidth = 3;

    // Línea principal
    targetCtx.beginPath();
    targetCtx.moveTo(line.x1, line.y1);
    targetCtx.lineTo(line.x2, line.y2);
    targetCtx.stroke();

    // Calcular ángulo de la línea
    const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);

    const size = 15;
    const x = line.x2;
    const y = line.y2;

    // Dibujar línea perpendicular (la "T")
    targetCtx.beginPath();
    targetCtx.moveTo(
        x - size * Math.sin(angle),
        y + size * Math.cos(angle)
    );
    targetCtx.lineTo(
        x + size * Math.sin(angle),
        y - size * Math.cos(angle)
    );
    targetCtx.stroke();
}