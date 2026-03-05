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


// ===============================
// CARGA DE PIZARRA
// ===============================

function loadBoard() {
    const contentDiv = document.getElementById("content");

    contentDiv.innerHTML = `
        <h2>Pizarra Virtual</h2>

        <div style="margin-bottom:15px;">
            <button onclick="addAttackers()">Agregar Atacantes</button>
            <button onclick="addDefenders()">Agregar Defensores</button>
            <button onclick="addBall()">Agregar Pelota</button>

            <button onclick="setLineType('normal')">Línea Normal</button>
            <button onclick="setLineType('dashed')">Línea Punteada</button>
            <button onclick="setLineType('zigzag')">Línea Víbora</button>
            <button onclick="setLineType('screen')">Línea Bloqueo</button>

            <button onclick="deleteLastLine()">Borrar Última Línea</button>
            <button onclick="clearBoard()">Limpiar Pizarra</button>
        </div>

        <canvas id="cancha" width="800" height="600"
            style="border:2px solid black;">
        </canvas>
    `;

    initBoard();
}


// ===============================
// INICIALIZAR CANVAS
// ===============================

function initBoard() {

    canvas = document.getElementById("cancha");
    ctx = canvas.getContext("2d");

    // Eventos
    canvas.addEventListener("mousedown", startDrag);
    canvas.addEventListener("mousemove", drag);
    canvas.addEventListener("mouseup", stopDrag);
    canvas.addEventListener("click", handleLineClick);

    // Esperar que cargue la imagen antes de dibujar
    courtImage.onload = function () {
        drawCourt();
    };

    // Si la imagen ya estaba cargada (recarga rápida)
    if (courtImage.complete) {
        drawCourt();
    }
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
// DRAG & DROP
// ===============================

function startDrag(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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

    const rect = canvas.getBoundingClientRect();
    selectedPlayer.x = e.clientX - rect.left;
    selectedPlayer.y = e.clientY - rect.top;

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
    currentLineType = type;
    lineStart = null;
}

function handleLineClick(e) {

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
// DIBUJO CANCHA NBA PRO
// ===============================

function drawCourt() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(courtImage, 0, 0, canvas.width, canvas.height);

    // ===== DIBUJAR LÍNEAS TÁCTICAS =====
    lines.forEach(line => {

        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);

        if (line.type === "normal") {
            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
            drawArrow(line.x1, line.y1, line.x2, line.y2);
        }

        else if (line.type === "dashed") {
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
            ctx.setLineDash([]);
            drawArrow(line.x1, line.y1, line.x2, line.y2);
        }

        else if (line.type === "zigzag") {
            drawZigZag(line);
        }

        else if (line.type === "screen") {
            drawScreenLine(line);
        }
    });

    // ===== JUGADORES =====
    players.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.number, p.x, p.y);
    });

    // ===== PELOTA =====
    if (ball) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#f57c00";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Líneas internas
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 12, 0.5 * Math.PI, 1.5 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ball.x - 12, ball.y);
    ctx.lineTo(ball.x + 12, ball.y);
    ctx.stroke();
}
}


// ===============================
// FLECHA
// ===============================

function drawArrow(x1, y1, x2, y2) {

    const headlen = 12;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
        x2 - headlen * Math.cos(angle - Math.PI / 6),
        y2 - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        x2 - headlen * Math.cos(angle + Math.PI / 6),
        y2 - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = "black";
    ctx.fill();
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