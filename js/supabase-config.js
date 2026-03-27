// Supabase config (fase 1 usuarios)
// 1) Reemplaza los valores por los de tu proyecto.
// 2) Mantene este archivo fuera de repositorios publicos si incluye claves reales.

(function initSupabaseConfig() {
    var SUPABASE_URL = "TU_SUPABASE_URL";
    var SUPABASE_ANON_KEY = "TU_SUPABASE_ANON_KEY";

    var hasValidConfig = SUPABASE_URL.indexOf("https://") === 0 && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.indexOf("TU_") !== 0;

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        window.basketLabSupabase = { client: null, error: "SDK de Supabase no disponible." };
        return;
    }

    if (!hasValidConfig) {
        window.basketLabSupabase = { client: null, error: "Configurar SUPABASE_URL y SUPABASE_ANON_KEY en js/supabase-config.js." };
        return;
    }

    window.basketLabSupabase = {
        client: window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY),
        error: null
    };
})();
