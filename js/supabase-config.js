// Supabase config (fase 1 usuarios)
// 1) Reemplaza los valores por los de tu proyecto.
// 2) Mantene este archivo fuera de repositorios publicos si incluye claves reales.

(function initSupabaseConfig() {
    var SUPABASE_URL = "https://sjfnqeraytzmpubmvorw.supabase.co";
    var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZm5xZXJheXR6bXB1Ym12b3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjY0MjksImV4cCI6MjA4OTYwMjQyOX0.9NBGO3F_MrFZsFN9BYZlwwWda2_UtVv_so-mqEn_Bsc";

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
