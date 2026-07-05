(function initPlayerDomainRealtime(global) {
    function setup(playerId, onChange) {
        var cfg = global.BasketLabPlayerDomainConfig || {};
        if (!cfg.realtime && !cfg.enabled) return function () {};
        var client = global.basketLabSupabase && global.basketLabSupabase.client;
        if (!client || !playerId) return function () {};

        var tables = [
            "players",
            "player_notes",
            "player_goals",
            "player_evolution_events",
            "shooting_sessions",
            "shooting_session_players",
            "player_members"
        ];
        var channel = client.channel("player:" + playerId);
        var timer = null;
        function debounced() {
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () {
                if (typeof onChange === "function") onChange();
            }, 300);
        }
        tables.forEach(function (table) {
            channel.on(
                "postgres_changes",
                { event: "*", schema: "public", table: table },
                debounced
            );
        });
        channel.subscribe();
        return function () {
            if (timer) clearTimeout(timer);
            client.removeChannel(channel);
        };
    }

    global.BasketLabPlayerRealtime = { setup: setup };
})(window);
