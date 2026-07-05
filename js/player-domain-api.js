(function initPlayerDomainApi(global) {
    var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    function isWrite() {
        var cfg = global.BasketLabPlayerDomainConfig || {};
        return cfg.write === true || cfg.enabled === true;
    }

    function isActive() {
        var cfg = global.BasketLabPlayerDomainConfig || {};
        return cfg.read === true || cfg.write === true || cfg.enabled === true;
    }

    function isUuid(id) {
        return UUID_RE.test(String(id || ""));
    }

    function mapGoalStatusFromLegacy(status) {
        var s = String(status || "").toLowerCase();
        if (s === "completado" || s === "completed") return "completed";
        if (s === "archivado" || s === "archived") return "archived";
        return "active";
    }

    async function parseJson(res) {
        var data = await res.json();
        if (!data.ok) throw new Error(data.error || "Request failed");
        return data;
    }

    async function fetchPlayers() {
        var data = await parseJson(await fetch("/api/players", { credentials: "same-origin" }));
        return data.items || [];
    }

    async function fetchShootingPayload() {
        var data = await parseJson(await fetch("/api/shooting", { credentials: "same-origin" }));
        return data.payload || {};
    }

    async function createPlayer(body) {
        var data = await parseJson(await fetch("/api/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(body)
        }));
        return data.player;
    }

    async function patchPlayer(playerId, patch) {
        var body = {};
        if (patch.name != null || patch.display_name != null) body.display_name = patch.name != null ? patch.name : patch.display_name;
        ["position", "age", "height", "level", "team", "category", "photo_url", "club_shield_url"].forEach(function (k) {
            if (patch[k] !== undefined) body[k] = patch[k];
        });
        if (patch.fundamentals != null) body.fundamentals = patch.fundamentals;
        if (patch.stats != null) body.game_stats = patch.stats;
        var data = await parseJson(await fetch("/api/players/" + playerId, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(body)
        }));
        return data.player;
    }

    async function archivePlayer(playerId) {
        await parseJson(await fetch("/api/players/" + playerId, { method: "DELETE", credentials: "same-origin" }));
    }

    async function createNote(playerId, text) {
        await parseJson(await fetch("/api/players/" + playerId + "/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ body: text })
        }));
    }

    async function createGoal(playerId, text) {
        await parseJson(await fetch("/api/players/" + playerId + "/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ body: text, status: "active" })
        }));
    }

    async function updateGoal(playerId, goalId, patch) {
        var body = {};
        if (patch.body != null) body.body = patch.body;
        if (patch.status != null) body.status = mapGoalStatusFromLegacy(patch.status);
        await parseJson(await fetch("/api/players/" + playerId + "/goals/" + goalId, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(body)
        }));
    }

    async function deleteGoal(playerId, goalId) {
        await parseJson(await fetch("/api/players/" + playerId + "/goals/" + goalId, {
            method: "DELETE",
            credentials: "same-origin"
        }));
    }

    async function createEvolution(playerId, message) {
        await parseJson(await fetch("/api/players/" + playerId + "/evolution", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ message: message })
        }));
    }

    async function createShootingSession(playerId, session) {
        var data = await parseJson(await fetch("/api/players/" + playerId + "/shooting-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(session)
        }));
        return data.session;
    }

    async function patchShootingSession(sessionId, patch) {
        var data = await parseJson(await fetch("/api/shooting-sessions/" + sessionId, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(patch)
        }));
        return data.session;
    }

    async function deleteShootingSession(sessionId) {
        await parseJson(await fetch("/api/shooting-sessions/" + sessionId, {
            method: "DELETE",
            credentials: "same-origin"
        }));
    }

    async function inviteMember(playerId, body) {
        var data = await parseJson(await fetch("/api/players/" + playerId + "/invitations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(body)
        }));
        return data;
    }

    async function refreshLocalPlayerData() {
        if (!global.BasketLabDataSync) return;
        var players = await fetchPlayers();
        var shooting = await fetchShootingPayload();
        global.BasketLabDataSync.saveData("players_tracking", players);
        global.BasketLabDataSync.saveData("shooting_heatmap", shooting);
    }

    global.BasketLabPlayerDomainApi = {
        isWrite: isWrite,
        isUuid: isUuid,
        fetchPlayers: fetchPlayers,
        fetchShootingPayload: fetchShootingPayload,
        createPlayer: createPlayer,
        patchPlayer: patchPlayer,
        archivePlayer: archivePlayer,
        createNote: createNote,
        createGoal: createGoal,
        updateGoal: updateGoal,
        deleteGoal: deleteGoal,
        createEvolution: createEvolution,
        createShootingSession: createShootingSession,
        patchShootingSession: patchShootingSession,
        deleteShootingSession: deleteShootingSession,
        inviteMember: inviteMember,
        refreshLocalPlayerData: refreshLocalPlayerData
    };
})(window);
